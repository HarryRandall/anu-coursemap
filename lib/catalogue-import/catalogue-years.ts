export const MIN_CATALOGUE_YEAR = 2014;

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
