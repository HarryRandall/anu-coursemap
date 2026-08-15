import { courseByCode, terms, type Attempt } from "@/lib/catalogue";

const scheduledTerms = terms.filter((term) => term.id !== "unscheduled");

export type SeriesPoint = { label: string; value: number };

function termLabel(year: number, shortName: string) {
  return `${shortName} ${String(year).slice(2)}`;
}

export type TermUnits = {
  id: string;
  label: string;
  completed: number;
  planned: number;
  units: number;
};

function unitsOf(attempt: Attempt) {
  return courseByCode(attempt.courseCode)?.units ?? 0;
}

function countedAttemptsInTerm(attempts: Attempt[], termId: string) {
  return attempts.filter(
    (attempt) => attempt.termId === termId && attempt.status !== "failed",
  );
}

export function unitsByTerm(attempts: Attempt[]): TermUnits[] {
  return scheduledTerms.map((term) => {
    const inTerm = countedAttemptsInTerm(attempts, term.id);
    const completed = inTerm
      .filter((attempt) => attempt.status === "completed")
      .reduce((total, attempt) => total + unitsOf(attempt), 0);
    const planned = inTerm
      .filter((attempt) => attempt.status !== "completed")
      .reduce((total, attempt) => total + unitsOf(attempt), 0);
    return {
      id: term.id,
      label: termLabel(term.year, term.shortName),
      completed,
      planned,
      units: completed + planned,
    };
  });
}

/** Running earned and planned units, counting each course only once. */
export function cumulativeUnitsByTerm(attempts: Attempt[]): TermUnits[] {
  let completed = 0;
  let planned = 0;
  const seen = new Set<string>();
  return scheduledTerms.map((term) => {
    countedAttemptsInTerm(attempts, term.id).forEach((attempt) => {
      if (seen.has(attempt.courseCode)) return;
      seen.add(attempt.courseCode);
      if (attempt.status === "completed") completed += unitsOf(attempt);
      else planned += unitsOf(attempt);
    });
    return {
      id: term.id,
      label: termLabel(term.year, term.shortName),
      completed,
      planned,
      units: completed + planned,
    };
  });
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
