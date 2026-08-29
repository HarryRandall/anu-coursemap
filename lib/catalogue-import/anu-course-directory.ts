import { ANU_PROGRAMS_AND_COURSES_SOURCE } from "./anu-programs-courses.ts";
import type { CatalogueDiagnostic } from "./manifest.ts";
import {
  fetchSourceWithRetry,
  type FetchSourceOptions,
} from "./source-http.ts";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}[A-Z]?$/;
const MAX_DIRECTORY_BYTES = 25_000_000;
export const ANU_COURSE_DIRECTORY_REQUEST_TIMEOUT_MS = 45_000;
export const ANU_COURSE_DIRECTORY_RETRY_ATTEMPTS = 1;

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
  totalCount: number | null;
  receivedItemCount: number;
  isComplete: boolean;
  courseCodes: string[];
  entries: AnuCourseDirectoryEntry[];
  diagnostics: CatalogueDiagnostic[];
};

export type FetchAnuCourseDirectoryOptions = FetchSourceOptions & {
  now?: () => Date;
};

export class AnuCourseDirectoryHttpError extends Error {
  readonly status: number;

  constructor(status: number, statusText: string) {
    super(
      `The course directory request failed: HTTP ${status} ${statusText}`.trim(),
    );
    this.name = "AnuCourseDirectoryHttpError";
    this.status = status;
  }
}

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
  const params = {
    Source: "",
    ShowAll: "True",
    PageIndex: "0",
    MaxPageSize: "10",
    PageSize: "Infinity",
    SortColumn: "",
    SortDirection: "",
    InitailSearchRequestedFromExternalPage: "false",
    SearchText: "",
    CollegeName: "",
    ModeOfDelivery: "All Modes",
    FilterByMajors: "",
    FilterByMinors: "",
    FilterBySpecialisations: "",
    AppliedFilter: "FilterByCourses",
    SelectedYear: String(catalogueYear),
  };
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  for (const [name, count] of [
    ["Careers", 4],
    ["Sessions", 6],
    ["DegreeIdentifiers", 3],
  ] as const) {
    for (let index = 0; index < count; index += 1) {
      url.searchParams.set(`${name}[${index}]`, "");
    }
  }
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
): Pick<
  AnuCourseDirectory,
  | "totalCount"
  | "receivedItemCount"
  | "isComplete"
  | "courseCodes"
  | "entries"
  | "diagnostics"
> {
  const diagnostics: CatalogueDiagnostic[] = [];
  const entries: AnuCourseDirectoryEntry[] = [];
  const seen = new Set<string>();

  const payloadRecord =
    typeof payload === "object" && payload !== null
      ? (payload as { Items?: unknown; TotalCount?: unknown })
      : null;
  const items = Array.isArray(payloadRecord?.Items)
    ? payloadRecord.Items
    : null;
  if (items === null) {
    throw new TypeError(
      "The course search response did not contain an Items array.",
    );
  }

  const totalCount =
    typeof payloadRecord?.TotalCount === "number" &&
    Number.isInteger(payloadRecord.TotalCount) &&
    payloadRecord.TotalCount >= 0
      ? payloadRecord.TotalCount
      : null;
  const receivedItemCount = items.length;
  if (totalCount === null) {
    diagnostics.push({
      code: "INVALID_DIRECTORY_TOTAL_COUNT",
      severity: "error",
      message:
        "The ANU course search response did not report a valid TotalCount.",
      field: "directory.totalCount",
    });
  } else if (receivedItemCount < totalCount) {
    diagnostics.push({
      code: "TRUNCATED_COURSE_DIRECTORY",
      severity: "error",
      message: `ANU reported ${totalCount} courses for ${catalogueYear}, but returned only ${receivedItemCount}.`,
      field: "directory.courseCodes",
    });
  } else if (receivedItemCount > totalCount) {
    diagnostics.push({
      code: "INCONSISTENT_DIRECTORY_TOTAL_COUNT",
      severity: "error",
      message: `ANU reported ${totalCount} courses for ${catalogueYear}, but returned ${receivedItemCount}.`,
      field: "directory.courseCodes",
    });
  }
  const isComplete = totalCount !== null && totalCount === receivedItemCount;

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
    const name = nullableText((record as { Name?: unknown }).Name);
    if (!name) {
      diagnostics.push({
        code: "MISSING_DIRECTORY_COURSE_TITLE",
        severity: "warning",
        message: `${code} did not include a course title and was not safe to publish as a directory row.`,
        field: "directory.courseTitles",
        sourceFragment: code,
      });
    }
    entries.push({
      code,
      name,
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
    totalCount,
    receivedItemCount,
    isComplete,
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
    requestTimeoutMs = ANU_COURSE_DIRECTORY_REQUEST_TIMEOUT_MS,
    retryAttempts = ANU_COURSE_DIRECTORY_RETRY_ATTEMPTS,
    headers,
    ...fetchOptions
  }: FetchAnuCourseDirectoryOptions = {},
): Promise<AnuCourseDirectory> {
  const sourceUrl = createAnuCourseSearchUrl(catalogueYear);
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("X-Requested-With")) {
    requestHeaders.set("X-Requested-With", "XMLHttpRequest");
  }
  if (!requestHeaders.has("Referer")) {
    requestHeaders.set(
      "Referer",
      `${ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl}/catalogue`,
    );
  }
  const response = await fetchSourceWithRetry(sourceUrl, {
    ...fetchOptions,
    requestTimeoutMs,
    retryAttempts,
    accept: "application/json, text/javascript, */*; q=0.01",
    headers: requestHeaders,
  });
  if (!response.ok) {
    throw new AnuCourseDirectoryHttpError(response.status, response.statusText);
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
