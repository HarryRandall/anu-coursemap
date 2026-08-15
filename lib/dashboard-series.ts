import { courseByCode, terms, type Attempt } from "@/lib/catalogue";

const scheduledTerms = terms.filter((term) => term.id !== "unscheduled");

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
