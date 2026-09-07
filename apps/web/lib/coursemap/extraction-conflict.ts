export type ExtractionConflict = {
  deterministicValue: unknown;
  modelValue: unknown;
  retained: "deterministic";
};

/** Historical warnings contain only the retained value, not a comparison. */
export function extractionConflict(value: unknown): ExtractionConflict | null {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("retained" in value) ||
    value.retained !== "deterministic" ||
    !Object.hasOwn(value, "deterministicValue") ||
    !Object.hasOwn(value, "modelValue")
  ) {
    return null;
  }
  return value as ExtractionConflict;
}
