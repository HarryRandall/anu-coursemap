import { Attempt, Course, courseByCode, terms } from "@/lib/catalogue";

export type EffectiveStatus = Attempt["status"] | "blocked" | "approval";

const termOrder = new Map(terms.map((term, index) => [term.id, index]));
const orderOf = (termId: string) => termOrder.get(termId) ?? terms.length;

export function completedCodes(attempts: Attempt[]) {
  return new Set(
    attempts
      .filter((attempt) => attempt.status === "completed")
      .map((attempt) => attempt.courseCode),
  );
}

/**
 * Prerequisites that are NOT satisfied for this attempt.
 * A prerequisite counts as satisfied when a non-failed attempt of it sits in an
 * earlier term or the same term — only prereqs scheduled later (or missing
 * entirely) are a problem.
 */
export function missingPrereqs(attempt: Attempt, attempts: Attempt[]): string[] {
  const course = courseByCode(attempt.courseCode);
  if (!course) return [];
  const myOrder = orderOf(attempt.termId);
  return course.prerequisiteCodes.filter(
    (code) =>
      !attempts.some(
        (other) =>
          other.courseCode === code &&
          other.status !== "failed" &&
          orderOf(other.termId) <= myOrder,
      ),
  );
}

export function effectiveStatus(attempt: Attempt, attempts: Attempt[]): EffectiveStatus {
  if (attempt.status !== "planned") return attempt.status;
  const course = courseByCode(attempt.courseCode);
  if (!course) return attempt.status;
  if (missingPrereqs(attempt, attempts).length > 0) return "blocked";
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
