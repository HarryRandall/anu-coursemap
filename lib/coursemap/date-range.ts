/**
 * Inclusive day-precision range filtering for admin tables. The bounds come
 * from the URL as plain dates, so a shared link means the same window
 * regardless of the reader's clock.
 */
export function withinDateRange(
  value: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) return true;
  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) return true;
  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && stamp < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999`);
    if (!Number.isNaN(end.getTime()) && stamp > end) return false;
  }
  return true;
}

export function parseDateParam(input: string | string[] | undefined) {
  const value = Array.isArray(input) ? input[0] : input;
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
