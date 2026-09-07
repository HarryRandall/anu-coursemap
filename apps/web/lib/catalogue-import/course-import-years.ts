export const MIN_COURSE_IMPORT_YEAR = 2020;
export const MAX_COURSE_IMPORT_YEAR = 2030;

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
