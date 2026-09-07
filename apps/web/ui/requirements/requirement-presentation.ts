import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Circle,
} from "lucide-react";
import type {
  PlanCatalogue,
  PlanRequirementCondition,
  PlanRequirementGroup,
  PlanStructureRequirements,
} from "@/lib/coursemap/plan-catalogue";
import {
  type RequirementNodeProgress,
  type RequirementNodeState,
  type RequirementTreeProgress,
} from "@/lib/coursemap/requirement-progress";
import { type Tone } from "@/lib/ui";

export function formatUnits(units: number) {
  return `${units.toLocaleString("en-AU", { maximumFractionDigits: 2 })} units`;
}
export function unitsDescription(
  minimum: number | null,
  maximum: number | null,
) {
  if (minimum !== null && maximum !== null && minimum === maximum) {
    return formatUnits(minimum);
  }
  if (minimum !== null && maximum !== null) {
    return `${formatUnits(minimum)} to ${formatUnits(maximum)}`;
  }
  if (minimum !== null) return `At least ${formatUnits(minimum)}`;
  if (maximum !== null) return `Up to ${formatUnits(maximum)}`;
  return null;
}
export function groupInstruction(group: PlanRequirementGroup) {
  if (group.operator === "any_of") return "Choose one alternative";
  if (group.operator === "minimum_count") {
    return group.minimumCount
      ? `Choose at least ${group.minimumCount}`
      : "Choose the required number";
  }
  return "Complete every item";
}
export function levelCourseDescription(
  minimumLevel: number | null,
  maximumLevel: number | null,
) {
  if (minimumLevel !== null && maximumLevel !== null) {
    return minimumLevel === maximumLevel
      ? `${minimumLevel} level courses`
      : `${minimumLevel} to ${maximumLevel} level courses`;
  }
  if (minimumLevel !== null) return `${minimumLevel} level courses or above`;
  if (maximumLevel !== null) return `Courses up to ${maximumLevel} level`;
  return null;
}

/** The plain-English reading of a rule that Coursemap derived from the ANU text. */
export /** The plain-English reading of a rule that Coursemap derived from the ANU text. */
function conditionInterpretation(condition: PlanRequirementCondition) {
  const parts: string[] = [];
  if (condition.conditionKind === "unit_total") {
    const units = unitsDescription(
      condition.minimumUnits,
      condition.maximumUnits,
    );
    if (units) parts.push(units);
  } else if (condition.conditionKind === "course_list") {
    parts.push(
      condition.minimumCourses
        ? `Complete at least ${condition.minimumCourses} listed course${condition.minimumCourses === 1 ? "" : "s"}`
        : "Complete from the listed courses",
    );
  } else if (condition.conditionKind === "structure_list") {
    parts.push(
      condition.minimumCourses
        ? `Complete at least ${condition.minimumCourses} listed academic structure${condition.minimumCourses === 1 ? "" : "s"}`
        : "Complete from the listed academic structures",
    );
  } else if (condition.conditionKind === "subject" && condition.subjectCode) {
    const levels = levelCourseDescription(
      condition.minimumLevel,
      condition.maximumLevel,
    );
    parts.push(
      levels
        ? `${condition.subjectCode} ${levels.toLowerCase()}`
        : `${condition.subjectCode} coded courses`,
    );
  } else if (condition.conditionKind === "level") {
    const levels = levelCourseDescription(
      condition.minimumLevel,
      condition.maximumLevel,
    );
    if (levels) parts.push(levels);
  } else if (condition.conditionKind === "tag" && condition.tag) {
    parts.push(condition.tag);
  } else if (condition.conditionKind === "unrestricted") {
    parts.push("Unrestricted elective courses");
  } else if (condition.freeText) {
    parts.push(condition.freeText);
  }

  if (condition.conditionKind !== "unit_total") {
    const units = unitsDescription(
      condition.minimumUnits,
      condition.maximumUnits,
    );
    if (units) parts.push(units);
  }
  return parts.join(" · ");
}
export function attemptTone(status: string): Tone {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "enrolled") return "brand";
  return "info";
}
export const structureKindLabels = {
  programme: "Programme",
  major: "Major",
  minor: "Minor",
  specialisation: "Specialisation",
} as const;
export const structureKindOrder = {
  programme: 0,
  major: 1,
  minor: 2,
  specialisation: 3,
} as const;

/* ------------------------------------------------------------------ */
/* Progress presentation                                               */
/* ------------------------------------------------------------------ */
export const stateMeta: Record<
  RequirementNodeState,
  { label: string; tone: Tone; icon: typeof CircleCheck }
> = {
  satisfied: { label: "Satisfied", tone: "success", icon: CircleCheck },
  in_progress: { label: "In progress", tone: "brand", icon: CircleDashed },
  not_started: { label: "Not started", tone: "neutral", icon: Circle },
  over_limit: { label: "Over limit", tone: "danger", icon: CircleAlert },
  unmeasured: { label: "Not measured", tone: "neutral", icon: CircleHelp },
};

/** A cap that has not been crossed reads better as "within limit" than "satisfied". */
export /** A cap that has not been crossed reads better as "within limit" than "satisfied". */
function stateLabel(progress: RequirementNodeProgress | undefined) {
  if (!progress) return stateMeta.unmeasured.label;
  const capOnly =
    progress.targetUnits === null &&
    progress.targetCourses === null &&
    progress.maximumUnits !== null;
  if (capOnly && progress.state === "satisfied") return "Within limit";
  return stateMeta[progress.state].label;
}
export function unitsSummary(progress: RequirementNodeProgress) {
  if (progress.state === "unmeasured") return null;
  const goal = progress.targetUnits ?? progress.maximumUnits;
  const completed = progress.completedUnits;
  const planned = progress.plannedUnits;
  if (goal === null) {
    return progress.targetCourses
      ? `${progress.matchedCourseCodes.length} of ${progress.targetCourses} courses`
      : null;
  }
  const head =
    progress.targetUnits === null
      ? `${completed + planned} of up to ${goal} units mapped`
      : `${completed} of ${goal} units completed`;
  return planned > 0 && progress.targetUnits !== null
    ? `${head} · ${planned} planned`
    : head;
}

/* ------------------------------------------------------------------ */
/* Rule tree                                                           */
/* ------------------------------------------------------------------ */
export function hasRequirementContent(requirements: PlanStructureRequirements) {
  return requirements.root !== null || requirements.unmodelled.length > 0;
}
export function structureAnchor(requirements: PlanStructureRequirements) {
  return `requirements-${requirements.structureKind}-${requirements.structureCode}`;
}
export function countStates(progress: RequirementTreeProgress) {
  const counts: Record<RequirementNodeState, number> = {
    satisfied: 0,
    in_progress: 0,
    not_started: 0,
    over_limit: 0,
    unmeasured: 0,
  };
  for (const [key, node] of progress) {
    // Leaf rules are what a student ticks off; group roll-ups would double count.
    if (key.startsWith("condition-")) counts[node.state] += 1;
  }
  return counts;
}
export type TreeContext = {
  catalogue: PlanCatalogue;
  attemptStatusByCode: ReadonlyMap<string, string>;
  selectedStructureCodes: ReadonlySet<string>;
  progress: RequirementTreeProgress;
};
