import { courseByCode, terms, type Attempt } from "@/lib/catalogue";

const scheduledTerms = terms.filter((term) => term.id !== "unscheduled");

function unitsInTerm(
  attempts: Attempt[],
  termId: string,
  statuses?: Attempt["status"][],
) {
  return attempts
    .filter(
      (attempt) =>
        attempt.termId === termId &&
        attempt.status !== "failed" &&
        (!statuses || statuses.includes(attempt.status)),
    )
    .reduce(
      (total, attempt) =>
        total + (courseByCode(attempt.courseCode)?.units ?? 0),
      0,
    );
}

export function cumulativeCompletedByTerm(attempts: Attempt[]) {
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
    return running;
  });
}

export function cumulativeMappedByTerm(attempts: Attempt[]) {
  let running = 0;
  const seen = new Set<string>();
  return scheduledTerms.map((term) => {
    attempts
      .filter(
        (attempt) => attempt.termId === term.id && attempt.status !== "failed",
      )
      .forEach((attempt) => {
        if (seen.has(attempt.courseCode)) return;
        seen.add(attempt.courseCode);
        running += courseByCode(attempt.courseCode)?.units ?? 0;
      });
    return running;
  });
}

export function loadByTerm(attempts: Attempt[]) {
  return scheduledTerms.map((term) => ({
    id: term.id,
    label: `${term.shortName} ${String(term.year).slice(2)}`,
    units: unitsInTerm(attempts, term.id),
  }));
}

export function markSeries(attempts: Attempt[]) {
  return scheduledTerms.flatMap((term) =>
    attempts
      .filter(
        (attempt) => attempt.termId === term.id && attempt.mark !== undefined,
      )
      .map((attempt) => attempt.mark ?? 0),
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
