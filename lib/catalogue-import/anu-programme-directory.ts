import { ANU_PROGRAMS_AND_COURSES_SOURCE } from "./anu-programs-courses.ts";
import type { CatalogueDiagnostic } from "./manifest.ts";
import {
  fetchSourceWithRetry,
  type FetchSourceOptions,
} from "./source-http.ts";

const PROGRAMME_CODE_PATTERN = /^[A-Z0-9-]{4,}$/;
const MAX_DIRECTORY_BYTES = 25_000_000;

export type AnuProgrammeDirectoryKind =
  "undergraduate" | "postgraduate" | "research" | "non_award";

export type AnuProgrammeDirectoryEntry = {
  code: string;
  title: string;
  kind: AnuProgrammeDirectoryKind;
  career: string | null;
  duration: number | null;
};

export type AnuProgrammeDirectory = {
  catalogueYear: number;
  sourceUrls: string[];
  fetchedAt: string;
  programmeCodes: string[];
  entries: AnuProgrammeDirectoryEntry[];
  diagnostics: CatalogueDiagnostic[];
};

export type FetchAnuProgrammeDirectoryOptions = FetchSourceOptions & {
  now?: () => Date;
};

const PROGRAMME_ENDPOINTS: ReadonlyArray<{
  kind: AnuProgrammeDirectoryKind;
  path: string;
}> = [
  {
    kind: "undergraduate",
    path: "/data/ProgramSearch/GetProgramsUnderGraduate",
  },
  {
    kind: "postgraduate",
    path: "/data/ProgramSearch/GetProgramsPostGraduate",
  },
  {
    kind: "research",
    path: "/data/ProgramSearch/GetProgramsResearch",
  },
  {
    kind: "non_award",
    path: "/data/ProgramSearch/GetProgramsNonAward",
  },
];

/**
 * Bulk programme search URLs for one catalogue year. Each career endpoint is
 * fetched with ShowAll so Sync can index every published code and name.
 */
export function createAnuProgrammeSearchUrls(catalogueYear: number) {
  if (
    !Number.isInteger(catalogueYear) ||
    catalogueYear < 2000 ||
    catalogueYear > 2200
  ) {
    throw new TypeError(
      "catalogueYear must be an integer between 2000 and 2200",
    );
  }

  return PROGRAMME_ENDPOINTS.map(({ kind, path }) => {
    const url = new URL(path, ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl);
    url.searchParams.set("SearchText", "");
    url.searchParams.set("SelectedYear", String(catalogueYear));
    url.searchParams.set("PageIndex", "0");
    url.searchParams.set("PageSize", "Infinity");
    url.searchParams.set("ShowAll", "true");
    return { kind, sourceUrl: url.toString() };
  });
}

function nullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalised = value.replace(/\s+/g, " ").trim();
  return normalised || null;
}

function parseProgrammeItem(
  value: unknown,
): Omit<AnuProgrammeDirectoryEntry, "kind"> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    AcademicPlanCode?: unknown;
    ProgramName?: unknown;
    AcademicCareer?: unknown;
    Duration?: unknown;
  };
  const code =
    typeof record.AcademicPlanCode === "string"
      ? record.AcademicPlanCode.trim().toUpperCase()
      : "";
  const title = nullableText(record.ProgramName);
  if (!PROGRAMME_CODE_PATTERN.test(code) || !title) return null;
  const duration = Number(record.Duration);
  return {
    code,
    title,
    career: nullableText(record.AcademicCareer),
    duration: Number.isFinite(duration) && duration > 0 ? duration : null,
  };
}

export function parseAnuProgrammeDirectoryPayload(
  payload: unknown,
  kind: AnuProgrammeDirectoryKind,
  catalogueYear: number,
): {
  entries: AnuProgrammeDirectoryEntry[];
  diagnostics: CatalogueDiagnostic[];
} {
  const diagnostics: CatalogueDiagnostic[] = [];
  const entries: AnuProgrammeDirectoryEntry[] = [];

  const items =
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { Items?: unknown }).Items)
      ? ((payload as { Items: unknown[] }).Items ?? [])
      : null;
  if (items === null) {
    throw new TypeError(
      `The ${kind} programme search response did not contain an Items array.`,
    );
  }

  for (const item of items) {
    const parsed = parseProgrammeItem(item);
    if (!parsed) {
      diagnostics.push({
        code: "INVALID_DIRECTORY_PROGRAMME",
        severity: "warning",
        message: `A ${catalogueYear} ${kind} programme search result without a valid code and name was ignored.`,
        field: "directory.programmeCodes",
      });
      continue;
    }
    entries.push({ ...parsed, kind });
  }

  return { entries, diagnostics };
}

/**
 * Merge the four career payloads into one directory, keeping the first title
 * when the same code appears more than once.
 */
export function mergeAnuProgrammeDirectory(
  batches: ReadonlyArray<{
    kind: AnuProgrammeDirectoryKind;
    payload: unknown;
  }>,
  catalogueYear: number,
): Pick<AnuProgrammeDirectory, "programmeCodes" | "entries" | "diagnostics"> {
  const diagnostics: CatalogueDiagnostic[] = [];
  const entries: AnuProgrammeDirectoryEntry[] = [];
  const seen = new Set<string>();

  for (const batch of batches) {
    const parsed = parseAnuProgrammeDirectoryPayload(
      batch.payload,
      batch.kind,
      catalogueYear,
    );
    diagnostics.push(...parsed.diagnostics);
    for (const entry of parsed.entries) {
      if (seen.has(entry.code)) {
        diagnostics.push({
          code: "DUPLICATE_DIRECTORY_PROGRAMME_CODE",
          severity: "warning",
          message: `${entry.code} appeared more than once across ${catalogueYear} programme search results.`,
          field: "directory.programmeCodes",
          sourceFragment: entry.code,
        });
        continue;
      }
      seen.add(entry.code);
      entries.push(entry);
    }
  }

  if (entries.length === 0) {
    diagnostics.push({
      code: "EMPTY_PROGRAMME_DIRECTORY",
      severity: "error",
      message: `The ${catalogueYear} programme search returned no usable programmes.`,
      field: "directory.programmeCodes",
    });
  }

  entries.sort((left, right) => left.code.localeCompare(right.code));
  return {
    programmeCodes: entries.map((entry) => entry.code),
    entries,
    diagnostics,
  };
}

/**
 * Discover every programme code published for a catalogue year using the
 * official programme search endpoints.
 */
export async function fetchAnuProgrammeDirectory(
  catalogueYear: number,
  {
    now = () => new Date(),
    ...fetchOptions
  }: FetchAnuProgrammeDirectoryOptions = {},
): Promise<AnuProgrammeDirectory> {
  const endpoints = createAnuProgrammeSearchUrls(catalogueYear);
  const batches: Array<{
    kind: AnuProgrammeDirectoryKind;
    payload: unknown;
  }> = [];

  for (const endpoint of endpoints) {
    const response = await fetchSourceWithRetry(endpoint.sourceUrl, {
      ...fetchOptions,
      accept: "application/json",
    });
    if (!response.ok) {
      throw new Error(
        `The ${endpoint.kind} programme directory request failed: HTTP ${response.status} ${response.statusText}`.trim(),
      );
    }
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > MAX_DIRECTORY_BYTES) {
      throw new Error(
        `The ${endpoint.kind} programme directory response exceeded ${MAX_DIRECTORY_BYTES} bytes.`,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error(
        `The ${endpoint.kind} programme directory response was not valid JSON.`,
      );
    }
    batches.push({ kind: endpoint.kind, payload });
  }

  return {
    catalogueYear,
    sourceUrls: endpoints.map((endpoint) => endpoint.sourceUrl),
    fetchedAt: now().toISOString(),
    ...mergeAnuProgrammeDirectory(batches, catalogueYear),
  };
}
