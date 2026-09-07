import type { Course } from "@/lib/coursemap/types";

export type AttemptUnitRequirement =
  | { kind: "fixed"; units: number }
  | {
      kind: "choice";
      options: Array<{ label: string | null; units: number }>;
    }
  | { kind: "range"; minimumUnits: number; maximumUnits: number }
  | { kind: "unavailable" };

function validUnits(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 999.99;
}

function distinctOptions(
  options: Array<{ label: string | null; units: number }>,
) {
  const byUnits = new Map<number, { label: string | null; units: number }>();
  for (const option of options) {
    if (validUnits(option.units) && !byUnits.has(option.units)) {
      byUnits.set(option.units, option);
    }
  }
  return [...byUnits.values()].sort((left, right) => left.units - right.units);
}

export function attemptUnitRequirement(course: Course): AttemptUnitRequirement {
  const unitValue = course.unitValue;
  if (!unitValue || unitValue.kind === "fixed") {
    return {
      kind: "fixed",
      units: unitValue?.units ?? course.units,
    };
  }
  if (unitValue.kind === "range") {
    return {
      kind: "range",
      minimumUnits: unitValue.minimumUnits,
      maximumUnits: unitValue.maximumUnits,
    };
  }
  if (unitValue.kind === "variable") {
    const options = distinctOptions(unitValue.options);
    return options.length > 0
      ? { kind: "choice", options }
      : { kind: "unavailable" };
  }
  return { kind: "unavailable" };
}

export function attemptedUnitsFromInput(
  requirement: AttemptUnitRequirement,
  input: string,
): number | null {
  if (requirement.kind === "fixed") return requirement.units;
  if (requirement.kind === "unavailable") return null;
  if (!input.trim()) return null;
  const units = Number(input);
  if (!validUnits(units)) return null;
  if (Math.abs(units * 100 - Math.round(units * 100)) > 0.000_001) {
    return null;
  }
  if (requirement.kind === "choice") {
    return requirement.options.some((option) => option.units === units)
      ? units
      : null;
  }
  if (
    requirement.kind === "range" &&
    (units < requirement.minimumUnits || units > requirement.maximumUnits)
  ) {
    return null;
  }
  return units;
}

export function attemptedUnitsError(
  requirement: AttemptUnitRequirement,
  input: string,
) {
  if (requirement.kind === "fixed" || !input.trim()) return null;
  if (attemptedUnitsFromInput(requirement, input) !== null) return null;
  if (requirement.kind === "choice") {
    return "Choose one of the published unit values.";
  }
  if (requirement.kind === "range") {
    return `Enter a value from ${requirement.minimumUnits} to ${requirement.maximumUnits} units.`;
  }
  return null;
}
