export const MIN_CATALOGUE_YEAR = 2014;
export const MIN_COURSE_IMPORT_YEAR = 2020;
export const MAX_COURSE_IMPORT_YEAR = 2030;

/**
 * ANU publishes the next catalogue year ahead of time, so the supported
 * ceiling tracks the current year rather than a hardcoded value.
 */
export function maxCatalogueYear(now: () => Date = () => new Date()) {
  return now().getUTCFullYear() + 1;
}

export function isSupportedCatalogueYear(
  year: unknown,
  now?: () => Date,
): year is number {
  return (
    typeof year === "number" &&
    Number.isInteger(year) &&
    year >= MIN_CATALOGUE_YEAR &&
    year <= maxCatalogueYear(now)
  );
}

export function assertSupportedCatalogueYear(year: number, now?: () => Date) {
  if (!isSupportedCatalogueYear(year, now)) {
    throw new TypeError("Unsupported catalogue year.");
  }
}

export function isSupportedCourseImportYear(year: unknown): year is number {
  return (
    typeof year === "number" &&
    Number.isInteger(year) &&
    year >= MIN_COURSE_IMPORT_YEAR &&
    year <= MAX_COURSE_IMPORT_YEAR
  );
}

export function assertSupportedCourseImportYear(year: number) {
  if (!isSupportedCourseImportYear(year)) {
    throw new TypeError(
      `Course import years must be between ${MIN_COURSE_IMPORT_YEAR} and ${MAX_COURSE_IMPORT_YEAR}.`,
    );
  }
}
