import type {
  PlanRequirementCondition,
  PlanRequirementGroup,
  PlanRequirementNode,
  PlanStructureRequirements,
} from "@/lib/coursemap/plan-catalogue";
import type { Attempt } from "@/lib/coursemap/types";
import {
  planningCourseForAttempt,
  unitsForAttempt,
  type PlanningCatalogue,
} from "@/lib/planner";

export type RequirementBucketProgress = {
  key: string;
  title: string;
  /** Unit goal for the bucket, when the published rule states one. */
  targetUnits: number | null;
  completedUnits: number;
  /** Units scheduled (planned or enrolled) but not yet completed. */
  plannedUnits: number;
};

type MatchableCourse = { code: string; subject: string; level: number };
type CoursePredicate = (course: MatchableCourse) => boolean;

const COURSE_CODE = /^[A-Z]{4}\d{4}[A-Z]?$/;

function levelWithin(
  courseLevel: number,
  minimum: number | null,
  maximum: number | null,
) {
  // Levels are published on the 1000 scale but some rules record 1–9.
  const normalise = (value: number) => (value < 10 ? value * 1000 : value);
  if (minimum !== null && normalise(courseLevel) < normalise(minimum)) {
    return false;
  }
  if (maximum !== null && normalise(courseLevel) > normalise(maximum)) {
    return false;
  }
  return true;
}

function conditionPredicates(
  condition: PlanRequirementCondition,
): CoursePredicate[] {
  const predicates: CoursePredicate[] = [];
  const codes = new Set(
    condition.options
      .map((option) => option.code)
      .filter((code) => COURSE_CODE.test(code)),
  );
  if (codes.size > 0) {
    predicates.push((course) => codes.has(course.code));
  }
  if (condition.conditionKind === "subject" && condition.subjectCode) {
    const subject = condition.subjectCode;
    predicates.push(
      (course) =>
        course.subject === subject &&
        levelWithin(
          course.level,
          condition.minimumLevel,
          condition.maximumLevel,
        ),
    );
  } else if (condition.conditionKind === "level") {
    predicates.push((course) =>
      levelWithin(course.level, condition.minimumLevel, condition.maximumLevel),
    );
  }
  return predicates;
}

function collectPredicates(node: PlanRequirementNode): CoursePredicate[] {
  if (node.type === "condition") return conditionPredicates(node);
  return node.children.flatMap(collectPredicates);
}

function bucketTitle(node: PlanRequirementNode): string | null {
  if (node.type === "group") {
    return node.title ?? node.description ?? null;
  }
  if (node.freeText) return node.freeText;
  if (node.subjectCode) return `${node.subjectCode} courses`;
  if (node.sourceText) {
    const text = node.sourceText.replace(/\s+/g, " ").trim();
    return text.length > 64 ? `${text.slice(0, 61)}…` : text;
  }
  return null;
}

function bucketTargetUnits(node: PlanRequirementNode): number | null {
  return node.minimumUnits ?? node.maximumUnits ?? null;
}

/** Last record wins so a completed result supersedes an old planned entry. */
function activeAttempts(attempts: readonly Attempt[]) {
  const byCourse = new Map<string, Attempt>();
  attempts
    .filter((attempt) => attempt.status !== "failed")
    .forEach((attempt) => byCourse.set(attempt.courseCode, attempt));
  return [...byCourse.values()];
}

/**
 * Approximate per-bucket progress for the dashboard requirements panel.
 *
 * Buckets are the top-level nodes of the programme's published requirement
 * tree. A plan attempt credits a bucket when it matches any listed course,
 * subject rule or level rule nested inside — a readable signal, not a formal
 * audit, which stays the job of the requirements page.
 */
export function requirementBucketProgress({
  requirements,
  attempts,
  catalogue,
}: {
  requirements: readonly PlanStructureRequirements[];
  attempts: readonly Attempt[];
  catalogue: PlanningCatalogue;
}): RequirementBucketProgress[] {
  const programme =
    requirements.find(
      (structure) => structure.structureKind === "programme" && structure.root,
    ) ?? requirements.find((structure) => structure.root);
  const root: PlanRequirementGroup | null = programme?.root ?? null;
  if (!root) return [];

  const buckets = root.children
    .map((node) => ({
      node,
      title: bucketTitle(node),
      predicates: collectPredicates(node),
    }))
    .filter(
      (bucket): bucket is typeof bucket & { title: string } =>
        bucket.title !== null && bucket.predicates.length > 0,
    );

  const credited = activeAttempts(attempts).flatMap((attempt) => {
    const course = planningCourseForAttempt(attempt, catalogue);
    if (!course) return [];
    return [
      {
        attempt,
        course,
        units: unitsForAttempt(attempt, course),
      },
    ];
  });

  return buckets.map(({ node, title, predicates }) => {
    let completedUnits = 0;
    let plannedUnits = 0;
    credited.forEach(({ attempt, course, units }) => {
      if (!predicates.some((matches) => matches(course))) return;
      if (attempt.status === "completed") completedUnits += units;
      else plannedUnits += units;
    });
    return {
      key: `${node.type}-${node.id}`,
      title,
      targetUnits: bucketTargetUnits(node),
      completedUnits,
      plannedUnits,
    };
  });
}
