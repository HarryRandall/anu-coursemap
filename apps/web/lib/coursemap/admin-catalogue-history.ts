const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week that contains `date`. */
export function startOfUtcWeek(date: Date): Date {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  utc.setUTCDate(utc.getUTCDate() - mondayOffset);
  return utc;
}

/**
 * Cumulative catalogue size over the last `weeks` weeks. Records created
 * before the window still count, so the final bucket matches the live total.
 */
export function catalogueHistorySeries(
  timestamps: readonly string[],
  options?: { now?: Date | string; weeks?: number },
): number[] {
  const weeks = options?.weeks ?? 8;
  const now = options?.now === undefined ? new Date() : new Date(options.now);
  const windowEnd = startOfUtcWeek(now);
  const windowStart = new Date(windowEnd.getTime() - (weeks - 1) * WEEK_MS);
  const weekly = Array.from({ length: weeks }, () => 0);
  let before = 0;

  for (const value of timestamps) {
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) continue;
    if (time < windowStart.getTime()) {
      before += 1;
      continue;
    }
    const index = Math.floor((time - windowStart.getTime()) / WEEK_MS);
    if (index >= 0 && index < weeks) weekly[index] += 1;
  }

  let running = before;
  return weekly.map((count) => {
    running += count;
    return running;
  });
}

/** New records per week, not a running total. */
export function weeklyCountSeries(
  timestamps: readonly string[],
  options?: { now?: Date | string; weeks?: number },
): number[] {
  const weeks = options?.weeks ?? 8;
  const now = options?.now === undefined ? new Date() : new Date(options.now);
  const windowEnd = startOfUtcWeek(now);
  const windowStart = new Date(windowEnd.getTime() - (weeks - 1) * WEEK_MS);
  const weekly = Array.from({ length: weeks }, () => 0);

  for (const value of timestamps) {
    const time = new Date(value).getTime();
    if (Number.isNaN(time) || time < windowStart.getTime()) continue;
    const index = Math.floor((time - windowStart.getTime()) / WEEK_MS);
    if (index >= 0 && index < weeks) weekly[index] += 1;
  }

  return weekly;
}

/** One value per catalogue year, including years with no rows. */
export function countsByYear(
  years: readonly number[],
  rows: readonly { year: number }[],
): number[] {
  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row.year, (counts.get(row.year) ?? 0) + 1);
  }
  return years.map((year) => counts.get(year) ?? 0);
}

/**
 * Cumulative count sampled across the real span of the timestamps, so the
 * series ends on the total and empty leading calendar weeks do not flatten
 * every tile into the same step shape.
 */
export function cumulativeGrowthSeries(
  timestamps: readonly string[],
  options?: { points?: number },
): number[] {
  const points = options?.points ?? 16;
  const times = timestamps
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time))
    .sort((left, right) => left - right);
  if (times.length === 0) return [];
  if (times.length === 1 || times[0] === times[times.length - 1]) {
    return Array.from({ length: points }, (_, index) =>
      index === points - 1 ? times.length : 0,
    );
  }

  const start = times[0]!;
  const end = times[times.length - 1]!;
  const span = end - start;
  let cursor = 0;
  return Array.from({ length: points }, (_, index) => {
    const edge = start + (span * index) / (points - 1);
    while (cursor < times.length && times[cursor]! <= edge) cursor += 1;
    return cursor;
  });
}
