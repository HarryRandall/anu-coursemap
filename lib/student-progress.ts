import {
  courseByCode,
  requirementGroups,
  terms,
  type Attempt,
  type Course,
} from "@/lib/catalogue";
import { effectiveStatus, type EffectiveStatus } from "@/lib/planner";

export type AttemptWithCourse = {
  attempt: Attempt;
  course: Course;
};

export type RequirementProgress = {
  completed: Course[];
  planned: Course[];
  completedUnits: number;
  plannedUnits: number;
  stillNeeded: number;
};

const termOrder = new Map(terms.map((term, index) => [term.id, index]));

export function attemptsWithCourses(attempts: Attempt[]) {
  return attempts
    .map((attempt) => {
      const course = courseByCode(attempt.courseCode);
      return course ? { attempt, course } : null;
    })
    .filter((item): item is AttemptWithCourse => Boolean(item));
}

export function sortAttemptsByTerm(attempts: Attempt[]) {
  return [...attempts].sort(
    (a, b) =>
      (termOrder.get(a.termId) ?? terms.length) -
      (termOrder.get(b.termId) ?? terms.length),
  );
}

export function recordedAverage(attempts: Attempt[]) {
  const marked = attemptsWithCourses(attempts).filter(
    ({ attempt }) => attempt.mark !== undefined,
  );
  const totalUnits = marked.reduce(
    (total, { course }) => total + course.units,
    0,
  );
  if (totalUnits === 0) return null;
  return Math.round(
    marked.reduce(
      (total, { attempt, course }) =>
        total + (attempt.mark ?? 0) * course.units,
      0,
    ) / totalUnits,
  );
}

export function requirementMatches(
  course: Course,
  groupId: string,
  majorCodes: string[],
): boolean {
  if (groupId === "core") {
    return course.countsTowards.includes("Computing core");
  }
  if (groupId === "math") {
    return course.countsTowards.some((item) => item.includes("Mathematics"));
  }
  if (groupId === "major") return majorCodes.includes(course.code);
  if (groupId === "advanced") {
    return (
      course.countsTowards.includes("3000-level computing requirement") ||
      (course.subject === "Computing" && course.level >= 3000)
    );
  }
  if (groupId === "electives") {
    return !["core", "math", "major", "advanced"].some((candidate) =>
      requirementMatches(course, candidate, majorCodes),
    );
  }
  return false;
}

export function requirementProgress(attempts: Attempt[], majorCodes: string[]) {
  const completedCodes = new Set(
    attempts
      .filter((attempt) => attempt.status === "completed")
      .map((attempt) => attempt.courseCode),
  );
  const plannedCodes = new Set(
    attempts
      .filter(
        (attempt) =>
          attempt.status !== "failed" &&
          !completedCodes.has(attempt.courseCode),
      )
      .map((attempt) => attempt.courseCode),
  );
  const completedCourses = [...completedCodes]
    .map(courseByCode)
    .filter((course): course is Course => Boolean(course));
  const plannedCourses = [...plannedCodes]
    .map(courseByCode)
    .filter((course): course is Course => Boolean(course));

  return Object.fromEntries(
    requirementGroups.map((group) => {
      const completed = completedCourses.filter((course) =>
        requirementMatches(course, group.id, majorCodes),
      );
      const planned = plannedCourses.filter((course) =>
        requirementMatches(course, group.id, majorCodes),
      );
      const completedUnits = Math.min(
        group.total,
        completed.reduce((total, course) => total + course.units, 0),
      );
      const plannedUnits = Math.min(
        group.total - completedUnits,
        planned.reduce((total, course) => total + course.units, 0),
      );

      return [
        group.id,
        {
          completed,
          planned,
          completedUnits,
          plannedUnits,
          stillNeeded: Math.max(0, group.total - completedUnits - plannedUnits),
        } satisfies RequirementProgress,
      ];
    }),
  ) as Record<string, RequirementProgress>;
}

export function planIssues(attempts: Attempt[]) {
  return attempts
    .map((attempt) => ({
      attempt,
      course: courseByCode(attempt.courseCode),
      status: effectiveStatus(attempt, attempts),
    }))
    .filter(
      (
        item,
      ): item is {
        attempt: Attempt;
        course: Course;
        status: EffectiveStatus;
      } =>
        Boolean(item.course) &&
        (item.status === "blocked" || item.status === "approval"),
    );
}
