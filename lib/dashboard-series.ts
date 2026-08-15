import { courseByCode, terms, type Attempt } from "@/lib/catalogue";

const scheduledTerms = terms.filter((term) => term.id !== "unscheduled");

export type SeriesPoint = { label: string; value: number };

function termLabel(year: number, shortName: string) {
  return `${shortName} ${String(year).slice(2)}`;
}

function unitsInTerm(attempts: Attempt[], termId: string) {
  return attempts
    .filter(
      (attempt) => attempt.termId === termId && attempt.status !== "failed",
    )
    .reduce(
      (total, attempt) =>
        total + (courseByCode(attempt.courseCode)?.units ?? 0),
      0,
    );
}

export function cumulativeCompletedByTerm(attempts: Attempt[]): SeriesPoint[] {
  let running = 0;
  const seen = new Set<string>();
  return scheduledTerms.map((term) => {
    attempts
      .filter(
        (attempt) =>
          attempt.termId === term.id && attempt.status === "completed",
      )
      .forEach((attempt) => {
        if (seen.has(attempt.courseCode)) return;
        seen.add(attempt.courseCode);
        running += courseByCode(attempt.courseCode)?.units ?? 0;
      });
    return { label: termLabel(term.year, term.shortName), value: running };
  });
}

export function loadByTerm(attempts: Attempt[]) {
  return scheduledTerms.map((term) => ({
    id: term.id,
    label: termLabel(term.year, term.shortName),
    units: unitsInTerm(attempts, term.id),
  }));
}

export function markSeries(attempts: Attempt[]): SeriesPoint[] {
  return scheduledTerms.flatMap((term) =>
    attempts
      .filter(
        (attempt) => attempt.termId === term.id && attempt.mark !== undefined,
      )
      .map((attempt) => ({
        label: `${attempt.courseCode} · ${termLabel(term.year, term.shortName)}`,
        value: attempt.mark ?? 0,
      })),
  );
}

export function coursesByLevel(attempts: Attempt[]) {
  const levels = [1000, 2000, 3000] as const;
  const counts = { 1000: 0, 2000: 0, 3000: 0 };
  attempts
    .filter((attempt) => attempt.status !== "failed")
    .forEach((attempt) => {
      const course = courseByCode(attempt.courseCode);
      if (!course) return;
      if (
        course.level === 1000 ||
        course.level === 2000 ||
        course.level === 3000
      ) {
        counts[course.level] += 1;
      }
    });
  return levels.map((level) => ({
    level,
    label: `Level ${level / 1000}`,
    count: counts[level],
  }));
}
