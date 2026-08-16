import { ANU_PROGRAMS_AND_COURSES_SOURCE } from "./anu-programs-courses.ts";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;

type AnuCourseSearchResponse = { Items?: unknown };
type AnuCourseSearchItem = { CourseCode?: unknown };

export type DiscoverAnuCourseCodesOptions = {
  catalogueYear?: number;
  fetchImpl?: typeof fetch;
  maxPages?: number;
  pageSize?: number;
  signal?: AbortSignal;
};

function requireCatalogueYear(catalogueYear: number) {
  if (
    !Number.isInteger(catalogueYear) ||
    catalogueYear < 2014 ||
    catalogueYear > 2026
  ) {
    throw new TypeError("Unsupported catalogue year.");
  }
}

function requirePageSize(pageSize: number) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new TypeError("pageSize must be an integer between 1 and 500.");
  }
}

function requireMaxPages(maxPages: number) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) {
    throw new TypeError("maxPages must be an integer between 1 and 100.");
  }
}

function parseCourseCodes(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("ANU course discovery returned an invalid response.");
  }

  return value.flatMap((item) => {
    const code =
      item && typeof item === "object"
        ? (item as AnuCourseSearchItem).CourseCode
        : undefined;
    if (typeof code !== "string") return [];
    const normalised = code.trim().toUpperCase();
    return COURSE_CODE_PATTERN.test(normalised) ? [normalised] : [];
  });
}

/**
 * Discover the current course scope before fetching individual, provenance-
 * bearing source pages. Course facts always come from those source documents.
 */
export async function discoverAnuCourseCodes({
  catalogueYear = 2026,
  fetchImpl = fetch,
  maxPages = 20,
  pageSize = 500,
  signal,
}: DiscoverAnuCourseCodesOptions = {}) {
  requireCatalogueYear(catalogueYear);
  requirePageSize(pageSize);
  requireMaxPages(maxPages);

  const courseCodes = new Set<string>();
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const params = new URLSearchParams({
      SearchText: "",
      SelectedYear: String(catalogueYear),
      PageIndex: String(pageIndex),
      PageSize: String(pageSize),
      ShowAll: "true",
    });
    const response = await fetchImpl(
      `${ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl}/data/CourseSearch/GetCourses?${params}`,
      { headers: { accept: "application/json" }, signal },
    );
    if (!response.ok) {
      throw new Error(
        `ANU course discovery failed on page ${pageIndex + 1}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as AnuCourseSearchResponse;
    const sourceItems = payload.Items;
    if (!Array.isArray(sourceItems)) {
      throw new Error("ANU course discovery returned an invalid response.");
    }
    const pageCodes = parseCourseCodes(sourceItems);
    for (const courseCode of pageCodes) courseCodes.add(courseCode);
    if (sourceItems.length < pageSize) break;
  }

  if (courseCodes.size === 0) {
    throw new Error(
      "ANU course discovery did not return any valid course codes.",
    );
  }
  return [...courseCodes].sort((left, right) => left.localeCompare(right));
}
