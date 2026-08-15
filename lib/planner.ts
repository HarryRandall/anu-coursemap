import {
  Attempt,
  Course,
  Term,
  courseByCode,
  courseOccurrenceLimit,
  courses,
  terms,
} from "@/lib/catalogue";

export type EffectiveStatus = Attempt["status"] | "blocked" | "approval";

export const STANDARD_COURSE_SLOTS = 4;
export const STANDARD_TERM_UNITS = 24;

export type PlanFixStep =
  | {
      type: "move";
      attemptId: string;
      courseCode: string;
      fromTermId: string;
      toTermId: string;
    }
  | {
      type: "add";
      courseCode: string;
      termId: string;
    };

export type PlanFixResult =
  | { ok: true; steps: PlanFixStep[]; summary: string }
  | { ok: false; message: string };

export type DegreeUnitProgress = {
  completed: number;
  planned: number;
  remaining: number;
  mapped: number;
  total: number;
  percent: number;
};

const termOrder = new Map(terms.map((term, index) => [term.id, index]));
const orderOf = (termId: string) => termOrder.get(termId) ?? terms.length;

export function termIndex(termId: string) {
  return orderOf(termId);
}

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
export function missingPrereqs(
  attempt: Attempt,
  attempts: Attempt[],
): string[] {
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

export function effectiveStatus(
  attempt: Attempt,
  attempts: Attempt[],
): EffectiveStatus {
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
  return [...unique].reduce(
    (total, code) => total + (courseByCode(code)?.units ?? 0),
    0,
  );
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

export function degreeUnitProgress(
  attempts: Attempt[],
  totalUnits: number,
): DegreeUnitProgress {
  const completed = earnedUnits(attempts);
  const mapped = mappedUnits(attempts);
  const planned = Math.max(0, mapped - completed);
  const remaining = Math.max(0, totalUnits - mapped);
  return {
    completed,
    planned,
    remaining,
    mapped,
    total: totalUnits,
    percent: totalUnits === 0 ? 0 : Math.round((completed / totalUnits) * 100),
  };
}

export function termLoad(
  attempts: Attempt[],
  termId: string,
  ignoreAttemptId?: string,
) {
  const entries = attempts.filter(
    (attempt) =>
      attempt.termId === termId &&
      attempt.status !== "failed" &&
      attempt.id !== ignoreAttemptId,
  );
  return {
    courses: entries.length,
    units: entries.reduce(
      (total, attempt) =>
        total + (courseByCode(attempt.courseCode)?.units ?? 0),
      0,
    ),
  };
}

export function termHasCapacity(
  attempts: Attempt[],
  termId: string,
  extraUnits: number,
  extraCourses = 1,
  ignoreAttemptId?: string,
) {
  if (termId === "unscheduled") return true;
  const load = termLoad(attempts, termId, ignoreAttemptId);
  return (
    load.courses + extraCourses <= STANDARD_COURSE_SLOTS &&
    load.units + extraUnits <= STANDARD_TERM_UNITS
  );
}

function activeAttemptFor(attempts: Attempt[], courseCode: string) {
  return attempts.find(
    (attempt) =>
      attempt.courseCode === courseCode && attempt.status !== "failed",
  );
}

export function isRecommendedDegreeCourse(
  course: Course,
  majorCodes: string[],
) {
  if (majorCodes.includes(course.code)) return true;
  return course.countsTowards.some(
    (item) =>
      item === "Computing core" ||
      item === "Degree core" ||
      item.includes("Mathematics"),
  );
}

/**
 * Core, mathematics and major courses that fit this study period: offered,
 * not already in the plan, and with prerequisites already sequenced earlier.
 */
export function recommendedCoursesForTerm(
  term: Term,
  attempts: Attempt[],
  majorCodes: string[],
): Course[] {
  return courses
    .filter((course) => {
      if (!isRecommendedDegreeCourse(course, majorCodes)) return false;
      if (!courseIsAvailable(course, term.name)) return false;
      const taken = attempts.filter(
        (attempt) => attempt.courseCode === course.code,
      ).length;
      if (taken >= courseOccurrenceLimit(course.code)) return false;
      if (activeAttemptFor(attempts, course.code)) return false;
      const preview: Attempt = {
        id: `recommended-${course.code}`,
        courseCode: course.code,
        termId: term.id,
        status: "planned",
      };
      return missingPrereqs(preview, [...attempts, preview]).length === 0;
    })
    .sort(
      (left, right) =>
        left.level - right.level || left.code.localeCompare(right.code),
    );
}

function applyFixStep(attempts: Attempt[], step: PlanFixStep): Attempt[] {
  if (step.type === "move") {
    return attempts.map((attempt) =>
      attempt.id === step.attemptId
        ? { ...attempt, termId: step.toTermId }
        : attempt,
    );
  }
  return [
    ...attempts,
    {
      id: `fix-${step.courseCode}-${step.termId}`,
      courseCode: step.courseCode,
      termId: step.termId,
      status: "planned",
    },
  ];
}

function earlierOfferingFor(
  course: Course,
  beforeTermId: string,
  attempts: Attempt[],
  ignoreAttemptId?: string,
) {
  const beforeOrder = orderOf(beforeTermId);
  const candidates = terms.filter(
    (term) =>
      term.id !== "unscheduled" &&
      orderOf(term.id) < beforeOrder &&
      courseIsAvailable(course, term.name) &&
      termHasCapacity(attempts, term.id, course.units, 1, ignoreAttemptId),
  );
  return candidates.at(-1);
}

function placePrerequisiteEarlier(
  courseCode: string,
  beforeTermId: string,
  attempts: Attempt[],
): PlanFixResult {
  const course = courseByCode(courseCode);
  if (!course) {
    return { ok: false, message: `${courseCode} is not in the catalogue.` };
  }

  const existing = activeAttemptFor(attempts, courseCode);
  if (
    existing &&
    (existing.status === "completed" || existing.status === "enrolled")
  ) {
    return {
      ok: false,
      message: `${courseCode} is already recorded and cannot be moved earlier.`,
    };
  }

  const target = earlierOfferingFor(
    course,
    beforeTermId,
    attempts,
    existing?.id,
  );
  if (!target) {
    const offered = course.sessions.join(" or ");
    return {
      ok: false,
      message: `No earlier ${offered} offering with space was found for ${courseCode}.`,
    };
  }

  if (existing) {
    if (existing.termId === target.id) {
      return {
        ok: false,
        message: `${courseCode} is already as early as the available offerings allow.`,
      };
    }
    return {
      ok: true,
      steps: [
        {
          type: "move",
          attemptId: existing.id,
          courseCode,
          fromTermId: existing.termId,
          toTermId: target.id,
        },
      ],
      summary: `Move ${courseCode} to ${target.name} ${target.year}`,
    };
  }

  return {
    ok: true,
    steps: [{ type: "add", courseCode, termId: target.id }],
    summary: `Add ${courseCode} to ${target.name} ${target.year}`,
  };
}

function describeFixSteps(steps: PlanFixStep[]) {
  return steps
    .map((step) => {
      const term = terms.find((item) =>
        step.type === "move"
          ? item.id === step.toTermId
          : item.id === step.termId,
      );
      const when = term
        ? `${term.name} ${term.year}`
        : step.type === "move"
          ? step.toTermId
          : step.termId;
      return step.type === "move"
        ? `move ${step.courseCode} to ${when}`
        : `add ${step.courseCode} to ${when}`;
    })
    .join("; ");
}

/**
 * Sequence missing prerequisites earlier when an offering with spare load
 * exists. Nested prerequisites are resolved in the same pass.
 */
export function proposePrerequisiteFix(
  attempt: Attempt,
  attempts: Attempt[],
): PlanFixResult {
  if (effectiveStatus(attempt, attempts) !== "blocked") {
    return {
      ok: false,
      message: "This course does not have a sequencing issue to fix.",
    };
  }

  const steps: PlanFixStep[] = [];
  let working = attempts;
  const queue: Attempt[] = [attempt];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current.courseCode)) continue;
    seen.add(current.courseCode);

    for (const code of missingPrereqs(current, working)) {
      const placement = placePrerequisiteEarlier(code, current.termId, working);
      if (!placement.ok) return placement;

      steps.push(...placement.steps);
      working = placement.steps.reduce(applyFixStep, working);
      const placed = activeAttemptFor(working, code);
      if (placed) queue.push(placed);
    }
  }

  if (steps.length === 0) {
    return {
      ok: false,
      message: "Coursemap could not find an earlier offering to resolve this.",
    };
  }

  return {
    ok: true,
    steps,
    summary: `Fix by ${describeFixSteps(steps)}`,
  };
}
