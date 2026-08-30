import type { Degree, Term } from "@/lib/coursemap/types";

export const MAX_PLAN_EXTENSION_YEARS = 10;

type TimelineDegree = Pick<Degree, "duration" | "units"> | undefined;

export type PlanTimelineYear = {
  studyYear: number;
  year: number;
};

export function nominalProgrammeDuration(degree: TimelineDegree) {
  const declaredDuration =
    degree?.duration !== null &&
    degree?.duration !== undefined &&
    Number.isFinite(degree.duration) &&
    degree.duration > 0
      ? Math.ceil(degree.duration)
      : null;
  const unitDerivedDuration =
    degree?.units !== null &&
    degree?.units !== undefined &&
    Number.isFinite(degree.units) &&
    degree.units > 0
      ? Math.ceil(degree.units / 48)
      : null;
  const candidates = [declaredDuration, unitDerivedDuration].filter(
    (duration): duration is number => duration !== null,
  );
  return candidates.length > 0 ? Math.max(...candidates) : null;
}

export function planTimelineYears({
  degree,
  commencementYear,
  extensionYears = 0,
}: {
  degree: TimelineDegree;
  commencementYear: number;
  extensionYears?: number;
}): PlanTimelineYear[] {
  const nominalDuration = nominalProgrammeDuration(degree);
  if (nominalDuration === null) return [];
  const duration = nominalDuration + Math.max(0, extensionYears);
  return Array.from({ length: duration }, (_, index) => ({
    studyYear: index + 1,
    year: commencementYear + index,
  }));
}

function pendingTerm(year: number, code: "S1" | "S2"): Term {
  const firstSemester = code === "S1";
  return {
    id: `${year}-${code.toLowerCase()}`,
    year,
    name: firstSemester ? "First Semester" : "Second Semester",
    shortName: firstSemester ? "Semester 1" : "Semester 2",
    dates: "Calendar dates pending",
  };
}

/**
 * Retains authoritative imported academic periods, while giving every planned
 * degree year usable semester lanes before ANU has published their dates.
 */
export function planTimelineTerms({
  terms,
  years,
}: {
  terms: Term[];
  years: PlanTimelineYear[];
}): Term[] {
  const unscheduled = terms.find((term) => term.id === "unscheduled");
  const regularTerms = terms.filter((term) => term.id !== "unscheduled");
  const requiredYears = new Set(years.map((item) => item.year));
  const importedTerms = regularTerms.filter((term) =>
    requiredYears.has(term.year),
  );
  const byId = new Map(importedTerms.map((term) => [term.id, term]));

  years.forEach(({ year }) => {
    (["S1", "S2"] as const).forEach((code) => {
      const id = `${year}-${code.toLowerCase()}`;
      if (!byId.has(id)) byId.set(id, pendingTerm(year, code));
    });
  });

  const timelineTerms = [...byId.values()].sort((left, right) => {
    if (left.year !== right.year) return left.year - right.year;
    return left.id.localeCompare(right.id);
  });

  return unscheduled ? [...timelineTerms, unscheduled] : timelineTerms;
}
