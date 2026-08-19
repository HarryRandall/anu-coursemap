import { ANU_PROGRAMS_AND_COURSES_SOURCE } from "./anu-programs-courses.ts";
import type { CatalogueDiagnostic } from "./manifest.ts";
import {
  fetchSourceWithRetry,
  type FetchSourceOptions,
} from "./source-http.ts";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;
const MAX_DIRECTORY_BYTES = 25_000_000;

export type AnuCourseDirectoryEntry = {
  code: string;
  name: string | null;
  career: string | null;
  session: string | null;
  units: number | null;
  modeOfDelivery: string | null;
};

export type AnuCourseDirectory = {
  catalogueYear: number;
  sourceUrl: string;
  fetchedAt: string;
  courseCodes: string[];
  entries: AnuCourseDirectoryEntry[];
  diagnostics: CatalogueDiagnostic[];
};

export type FetchAnuCourseDirectoryOptions = FetchSourceOptions & {
  now?: () => Date;
};

/**
 * The search endpoint used by the official Programs and Courses catalogue
 * page. With PageSize=Infinity it returns every course for the selected
 * year in one response, which is how the site's own "show all" view works.
 */
export function createAnuCourseSearchUrl(catalogueYear: number) {
  if (
    !Number.isInteger(catalogueYear) ||
    catalogueYear < 2000 ||
    catalogueYear > 2200
  ) {
    throw new TypeError(
      "catalogueYear must be an integer between 2000 and 2200",
    );
  }
  const url = new URL(
    "/data/CourseSearch/GetCourses",
    ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl,
  );
  url.searchParams.set("AppliedFilter", "FilterByCourses");
  url.searchParams.set("ShowAll", "true");
  url.searchParams.set("PageIndex", "0");
  url.searchParams.set("PageSize", "Infinity");
  url.searchParams.set("SelectedYear", String(catalogueYear));
  url.searchParams.set("SearchText", "");
  return url.toString();
}

function nullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalised = value.replace(/\s+/g, " ").trim();
  return normalised || null;
}

export function parseAnuCourseDirectory(
  payload: unknown,
  catalogueYear: number,
): Pick<AnuCourseDirectory, "courseCodes" | "entries" | "diagnostics"> {
  const diagnostics: CatalogueDiagnostic[] = [];
  const entries: AnuCourseDirectoryEntry[] = [];
  const seen = new Set<string>();

  const items =
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { Items?: unknown }).Items)
      ? ((payload as { Items: unknown[] }).Items ?? [])
      : null;
  if (items === null) {
    throw new TypeError(
      "The course search response did not contain an Items array.",
    );
  }

  for (const item of items) {
    const record = typeof item === "object" && item !== null ? item : {};
    const rawCode = (record as { CourseCode?: unknown }).CourseCode;
    const code =
      typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
    if (!COURSE_CODE_PATTERN.test(code)) {
      diagnostics.push({
        code: "INVALID_DIRECTORY_COURSE_CODE",
        severity: "warning",
        message: `A course search result without a valid course code was ignored.`,
        field: "directory.courseCodes",
        ...(nullableText(rawCode)
          ? { sourceFragment: nullableText(rawCode)! }
          : {}),
      });
      continue;
    }
    if (seen.has(code)) {
      diagnostics.push({
        code: "DUPLICATE_DIRECTORY_COURSE_CODE",
        severity: "warning",
        message: `${code} appeared more than once in the ${catalogueYear} course search results.`,
        field: "directory.courseCodes",
        sourceFragment: code,
      });
      continue;
    }
    seen.add(code);
    const units = (record as { Units?: unknown }).Units;
    entries.push({
      code,
      name: nullableText((record as { Name?: unknown }).Name),
      career: nullableText((record as { Career?: unknown }).Career),
      session: nullableText((record as { Session?: unknown }).Session),
      units: typeof units === "number" && Number.isFinite(units) ? units : null,
      modeOfDelivery: nullableText(
        (record as { ModeOfDelivery?: unknown }).ModeOfDelivery,
      ),
    });
  }

  if (entries.length === 0) {
    diagnostics.push({
      code: "EMPTY_COURSE_DIRECTORY",
      severity: "error",
      message: `The ${catalogueYear} course search returned no usable courses.`,
      field: "directory.courseCodes",
    });
  }

  entries.sort((left, right) => left.code.localeCompare(right.code));
  return {
    courseCodes: entries.map((entry) => entry.code),
    entries,
    diagnostics,
  };
}

/**
 * Discover every course code published for a catalogue year using the
 * official course search endpoint.
 */
export async function fetchAnuCourseDirectory(
  catalogueYear: number,
  {
    now = () => new Date(),
    ...fetchOptions
  }: FetchAnuCourseDirectoryOptions = {},
): Promise<AnuCourseDirectory> {
  const sourceUrl = createAnuCourseSearchUrl(catalogueYear);
  const response = await fetchSourceWithRetry(sourceUrl, {
    ...fetchOptions,
    accept: "application/json",
  });
  if (!response.ok) {
    throw new Error(
      `The course directory request failed: HTTP ${response.status} ${response.statusText}`.trim(),
    );
  }
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_DIRECTORY_BYTES) {
    throw new Error(
      `The course directory response exceeded ${MAX_DIRECTORY_BYTES} bytes.`,
    );
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("The course directory response was not valid JSON.");
  }

  return {
    catalogueYear,
    sourceUrl,
    fetchedAt: now().toISOString(),
    ...parseAnuCourseDirectory(payload, catalogueYear),
  };
}
