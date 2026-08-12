import { Attempt, Course, courseByCode } from "@/lib/catalogue";

export type EffectiveStatus = Attempt["status"] | "blocked" | "approval";

export function completedCodes(attempts: Attempt[]) {
  return new Set(
    attempts
      .filter((attempt) => attempt.status === "completed")
      .map((attempt) => attempt.courseCode),
  );
}

export function effectiveStatus(attempt: Attempt, attempts: Attempt[]): EffectiveStatus {
  if (attempt.status !== "planned") return attempt.status;
  const course = courseByCode(attempt.courseCode);
  if (!course) return attempt.status;
  const completed = completedCodes(attempts);
  if (course.prerequisiteCodes.some((code) => !completed.has(code))) return "blocked";
  if (course.permissionText && !attempt.permissionApproved) return "approval";
  return "planned";
}

export function statusLabel(status: EffectiveStatus) {
  return {
    completed: "Completed",
    failed: "Failed",
    planned: "Planned",
    enrolled: "In progress",
    blocked: "Blocked",
    approval: "Approval needed",
  }[status];
}

export function earnedUnits(attempts: Attempt[]) {
  const unique = completedCodes(attempts);
  return [...unique].reduce((total, code) => total + (courseByCode(code)?.units ?? 0), 0);
}

export function mappedUnits(attempts: Attempt[]) {
  const latest = new Map<string, Attempt>();
  attempts
    .filter((attempt) => attempt.status !== "failed")
    .forEach((attempt) => latest.set(attempt.courseCode, attempt));
  return [...latest.values()].reduce(
    (total, attempt) => total + (courseByCode(attempt.courseCode)?.units ?? 0),
    0,
  );
}

export function courseIsAvailable(course: Course, termName: string) {
  if (termName === "Later") return true;
  return course.sessions.includes(termName);
}
