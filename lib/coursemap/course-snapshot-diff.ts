import type { CourseSnapshotProjectionData } from "@/lib/course-import/project-snapshot";

export type CourseSnapshotFieldChange = {
  fieldPath: string;
  kind: "added" | "changed" | "removed";
  before: unknown;
  after: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function appendPath(path: string, key: string) {
  return path ? `${path}.${key}` : key;
}

function appendIndex(path: string, index: number) {
  return `${path}[${index}]`;
}

function changeKind(before: unknown, after: unknown) {
  if (before === undefined) return "added" as const;
  if (after === undefined) return "removed" as const;
  return "changed" as const;
}

function collectChanges(
  before: unknown,
  after: unknown,
  fieldPath: string,
  changes: CourseSnapshotFieldChange[],
) {
  if (Object.is(before, after)) return;

  const beforeArray = Array.isArray(before);
  const afterArray = Array.isArray(after);
  if (beforeArray || afterArray) {
    if (!beforeArray || !afterArray) {
      const populated = beforeArray ? before : afterArray ? after : [];
      if (populated.length === 0) {
        changes.push({
          fieldPath,
          kind: changeKind(before, after),
          before,
          after,
        });
        return;
      }
    }
    const beforeRows = beforeArray ? before : [];
    const afterRows = afterArray ? after : [];
    const rowCount = Math.max(beforeRows.length, afterRows.length);
    for (let index = 0; index < rowCount; index += 1) {
      collectChanges(
        beforeRows[index],
        afterRows[index],
        appendIndex(fieldPath, index),
        changes,
      );
    }
    return;
  }

  const beforeRecord = isRecord(before);
  const afterRecord = isRecord(after);
  if (beforeRecord || afterRecord) {
    const beforeValue = beforeRecord ? before : {};
    const afterValue = afterRecord ? after : {};
    const keys = [
      ...new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]),
    ];
    if (keys.length === 0) {
      changes.push({
        fieldPath,
        kind: changeKind(before, after),
        before,
        after,
      });
      return;
    }
    for (const key of keys) {
      collectChanges(
        beforeValue[key],
        afterValue[key],
        appendPath(fieldPath, key),
        changes,
      );
    }
    return;
  }

  changes.push({
    fieldPath,
    kind: changeKind(before, after),
    before,
    after,
  });
}

export function compareCourseSnapshotProjections(
  previous: CourseSnapshotProjectionData | null,
  candidate: CourseSnapshotProjectionData | null,
): CourseSnapshotFieldChange[] {
  if (!candidate) return [];
  const changes: CourseSnapshotFieldChange[] = [];
  collectChanges(previous ?? undefined, candidate, "", changes);
  return changes;
}
