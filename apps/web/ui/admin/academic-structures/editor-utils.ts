import type { AcademicStructureManualSnapshotProjection as Projection } from "@/lib/structure-import/manual-snapshot";

export type { Projection };
export type Group = Projection["requirementGroups"][number];
export type Condition = Projection["requirementConditions"][number];
export type RequirementOption = Projection["requirementOptions"][number];

/** Structure kinds a requirement can point at. Shared with the relationships editor. */

export const structureKindOptions = [
  { value: "programme", label: "Programme" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "specialisation", label: "Specialisation" },
] as const;

export function nullableText(value: string) {
  return value.trim() ? value : null;
}

export function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function numberValue(value: number | null) {
  return value === null ? "" : String(value);
}

export function nextKey(values: string[], prefix: string) {
  let index = values.length + 1;
  while (values.includes(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

export function nextSummaryFieldKey(values: string[]) {
  let index = values.length + 1;
  while (values.includes(`manual_field_${index}`)) index += 1;
  return `manual_field_${index}`;
}

export function nextChildPosition(projection: Projection, groupKey: string) {
  return (
    Math.max(
      0,
      ...projection.requirementGroups
        .filter(({ parentGroupKey }) => parentGroupKey === groupKey)
        .map(({ position }) => position),
      ...projection.requirementConditions
        .filter(({ groupKey: key }) => key === groupKey)
        .map(({ position }) => position),
    ) + 1
  );
}
