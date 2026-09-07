"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Circle,
  GitBranch,
  ListChecks,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@coursemap/ui/components/alert";
import { Badge } from "@coursemap/ui/components/badge";
import { Button } from "@coursemap/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coursemap/ui/primitives/empty";
import { Progress } from "@coursemap/ui/primitives/progress";

import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/ui/shell";
import { CourseToken } from "@/ui/ui/course-token";
import { cn } from "@/lib/cn";
import type {
  PlanCatalogue,
  PlanRequirementCondition,
  PlanRequirementGroup,
  PlanRequirementNode,
  PlanStructureRequirements,
} from "@/lib/coursemap/plan-catalogue";
import {
  requirementNodeKey,
  requirementTreeProgress,
  type RequirementNodeProgress,
  type RequirementNodeState,
  type RequirementTreeProgress,
} from "@/lib/coursemap/requirement-progress";
import type { Attempt } from "@/lib/coursemap/types";
import {
  degreeUnitProgress,
  planningCourseForAttempt,
  unitsForAttempt,
} from "@/lib/planner";
import { badgeVariantForTone, type Tone } from "@/lib/ui";

/* ------------------------------------------------------------------ */
/* Copy helpers                                                        */
/* ------------------------------------------------------------------ */

function formatUnits(units: number) {
  return `${units.toLocaleString("en-AU", { maximumFractionDigits: 2 })} units`;
}

function unitsDescription(minimum: number | null, maximum: number | null) {
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

function groupInstruction(group: PlanRequirementGroup) {
  if (group.operator === "any_of") return "Choose one alternative";
  if (group.operator === "minimum_count") {
    return group.minimumCount
      ? `Choose at least ${group.minimumCount}`
      : "Choose the required number";
  }
  return "Complete every item";
}

function levelCourseDescription(
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

function attemptTone(status: string): Tone {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "enrolled") return "brand";
  return "info";
}

const structureKindLabels = {
  programme: "Programme",
  major: "Major",
  minor: "Minor",
  specialisation: "Specialisation",
} as const;

const structureKindOrder = {
  programme: 0,
  major: 1,
  minor: 2,
  specialisation: 3,
} as const;

/* ------------------------------------------------------------------ */
/* Progress presentation                                               */
/* ------------------------------------------------------------------ */

const stateMeta: Record<
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
function stateLabel(progress: RequirementNodeProgress | undefined) {
  if (!progress) return stateMeta.unmeasured.label;
  const capOnly =
    progress.targetUnits === null &&
    progress.targetCourses === null &&
    progress.maximumUnits !== null;
  if (capOnly && progress.state === "satisfied") return "Within limit";
  return stateMeta[progress.state].label;
}

function StateBadge({
  progress,
}: {
  progress: RequirementNodeProgress | undefined;
}) {
  const state = progress?.state ?? "unmeasured";
  const meta = stateMeta[state];
  const Icon = meta.icon;
  return (
    <Badge variant={badgeVariantForTone[meta.tone]}>
      <Icon aria-hidden="true" />
      {stateLabel(progress)}
    </Badge>
  );
}

function StateIcon({
  state,
  className,
}: {
  state: RequirementNodeState;
  className?: string;
}) {
  const Icon = stateMeta[state].icon;
  const colour =
    state === "satisfied"
      ? "text-success"
      : state === "in_progress"
        ? "text-primary"
        : state === "over_limit"
          ? "text-destructive"
          : "text-muted-foreground/70";
  return (
    <Icon
      aria-hidden="true"
      className={cn("shrink-0", colour, className)}
      size={18}
      strokeWidth={2}
    />
  );
}

/**
 * Completed and planned units stacked against a target so the two kinds of
 * progress read at a glance. Falls back to a plain line when the rule has
 * nothing to measure against.
 */
function UnitsBar({
  progress,
  className,
}: {
  progress: RequirementNodeProgress;
  className?: string;
}) {
  const goal = progress.targetUnits ?? progress.maximumUnits;
  if (goal === null || goal <= 0) return null;
  const completed = Math.min(100, (progress.completedUnits / goal) * 100);
  const planned = Math.min(
    100 - completed,
    (progress.plannedUnits / goal) * 100,
  );
  const overLimit = progress.state === "over_limit";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full transition-[width]",
          overLimit ? "bg-destructive" : "bg-primary",
        )}
        style={{ width: `${completed}%` }}
      />
      <span
        className={cn(
          "block h-full transition-[width]",
          overLimit ? "bg-destructive/40" : "bg-primary/35",
        )}
        style={{ width: `${planned}%` }}
      />
    </div>
  );
}

function unitsSummary(progress: RequirementNodeProgress) {
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

type TreeContext = {
  catalogue: PlanCatalogue;
  attemptStatusByCode: ReadonlyMap<string, string>;
  selectedStructureCodes: ReadonlySet<string>;
  progress: RequirementTreeProgress;
};

function SourceWording({
  text,
  label = "ANU source wording",
}: {
  text: string;
  label?: string;
}) {
  return (
    <details className="group text-xs text-muted-foreground">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-md py-1 font-medium text-foreground/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <GitBranch aria-hidden="true" size={12} className="opacity-70" />
        {label}
      </summary>
      <blockquote className="mt-1.5 border-l-2 border-border pl-3 leading-5 whitespace-pre-wrap">
        {text}
      </blockquote>
    </details>
  );
}

function RequirementConditionView({
  condition,
  context,
}: {
  condition: PlanRequirementCondition;
  context: TreeContext;
}) {
  const progress = context.progress.get(requirementNodeKey(condition));
  const state = progress?.state ?? "unmeasured";
  const interpretation = conditionInterpretation(condition);
  const summary = progress ? unitsSummary(progress) : null;
  const courseByCode = new Map(
    context.catalogue.courses.map((course) => [course.code, course]),
  );
  const structureNameByCode = new Map(
    context.catalogue.structures.map((structure) => [
      structure.code,
      structure.name,
    ]),
  );

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4",
        state === "satisfied" && "border-success/30",
        state === "over_limit" && "border-destructive/40",
        (state === "not_started" || state === "unmeasured") && "border-border",
        state === "in_progress" && "border-primary/30",
      )}
    >
      <div className="flex items-start gap-3">
        <StateIcon state={state} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="text-sm font-medium text-foreground">
              <span className="sr-only">Structured interpretation: </span>
              {interpretation || condition.sourceText}
            </p>
            <StateBadge progress={progress} />
          </div>
          {progress ? (
            <>
              <UnitsBar className="mt-3" progress={progress} />
              {summary ? (
                <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                  {summary}
                </p>
              ) : null}
            </>
          ) : null}
          {state === "unmeasured" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Coursemap cannot check this rule automatically. Confirm it against
              your transcript.
            </p>
          ) : null}
        </div>
      </div>

      {condition.options.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {condition.options.map((option) => {
            const course = courseByCode.get(option.code);
            const attemptStatus = context.attemptStatusByCode.get(option.code);
            const structureName = structureNameByCode.get(option.code);
            const selectedStructure =
              option.kind === "structure" &&
              context.selectedStructureCodes.has(option.code);
            const status = selectedStructure
              ? "selected"
              : (attemptStatus ?? null);
            return (
              <li
                className={cn(
                  "flex max-w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5",
                  status
                    ? "border-border bg-background"
                    : "border-border/60 bg-muted/40",
                )}
                key={`${condition.id}-${option.kind}-${option.code}`}
                title={course?.name ?? structureName ?? option.code}
              >
                {option.kind === "course" ? (
                  <CourseToken
                    accent={course?.accent ?? "violet"}
                    code={option.code}
                    size="sm"
                  />
                ) : (
                  <Badge variant="outline">
                    {option.structureKind ?? "structure"}
                  </Badge>
                )}
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-semibold text-foreground">
                    {course ? (
                      <Link
                        className="hover:underline"
                        href={`/courses/${course.code}?year=${course.year}`}
                      >
                        {option.code}
                      </Link>
                    ) : (
                      option.code
                    )}
                  </span>
                  {course?.name || structureName ? (
                    <span className="block max-w-56 truncate text-xs text-muted-foreground">
                      {course?.name ?? structureName}
                    </span>
                  ) : null}
                </span>
                {status ? (
                  <Badge
                    className="ml-1"
                    variant={
                      status === "selected"
                        ? "success-light"
                        : badgeVariantForTone[attemptTone(status)]
                    }
                  >
                    {status}
                  </Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {condition.sourceText && condition.sourceText !== interpretation ? (
        <div className="mt-3">
          <SourceWording text={condition.sourceText} />
        </div>
      ) : null}
    </div>
  );
}

function RequirementNodeView({
  node,
  context,
  depth,
}: {
  node: PlanRequirementNode;
  context: TreeContext;
  depth: number;
}) {
  if (node.type === "condition") {
    return <RequirementConditionView condition={node} context={context} />;
  }
  return <RequirementGroupView context={context} depth={depth} group={node} />;
}

function RequirementGroupView({
  group,
  context,
  depth = 0,
}: {
  group: PlanRequirementGroup;
  context: TreeContext;
  depth?: number;
}) {
  const progress = context.progress.get(requirementNodeKey(group));
  const state = progress?.state ?? "unmeasured";
  const units = unitsDescription(group.minimumUnits, group.maximumUnits);
  const alternative = group.operator === "any_of";
  const summary = progress ? unitsSummary(progress) : null;

  return (
    <section
      aria-label={group.title ?? groupInstruction(group)}
      className={cn(
        "rounded-xl border p-4",
        depth === 0
          ? "border-border bg-transparent"
          : "border-border/70 bg-muted/30 sm:p-4",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-start gap-3">
          <StateIcon state={state} className="mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {group.title ?? groupInstruction(group)}
            </h3>
            {group.description ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {group.description}
              </p>
            ) : null}
            {summary ? (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {summary}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* The heading already carries the instruction when there is no title. */}
          {group.title ? (
            <Badge variant={alternative ? "primary-light" : "outline"}>
              <GitBranch aria-hidden="true" />
              {groupInstruction(group)}
            </Badge>
          ) : null}
          {units ? <Badge variant="outline">{units}</Badge> : null}
          <StateBadge progress={progress} />
        </div>
      </div>

      {progress && (progress.targetUnits ?? progress.maximumUnits) !== null ? (
        <UnitsBar className="mt-3" progress={progress} />
      ) : null}

      {group.children.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {group.children.map((child, index) => (
            <li key={requirementNodeKey(child)}>
              {alternative && index > 0 ? (
                <div
                  aria-hidden="true"
                  className="mb-3 flex items-center gap-2"
                >
                  <span className="h-px flex-1 bg-primary/15" />
                  <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                    or
                  </span>
                  <span className="h-px flex-1 bg-primary/15" />
                </div>
              ) : null}
              <RequirementNodeView
                context={context}
                depth={depth + 1}
                node={child}
              />
            </li>
          ))}
        </ol>
      ) : null}

      {group.sourceText ? (
        <div className="mt-3">
          <SourceWording label="ANU group wording" text={group.sourceText} />
        </div>
      ) : null}
    </section>
  );
}

function hasRequirementContent(requirements: PlanStructureRequirements) {
  return requirements.root !== null || requirements.unmodelled.length > 0;
}

function structureAnchor(requirements: PlanStructureRequirements) {
  return `requirements-${requirements.structureKind}-${requirements.structureCode}`;
}

function StructureRequirementsCard({
  requirements,
  context,
}: {
  requirements: PlanStructureRequirements;
  context: TreeContext;
}) {
  const typeLabel = structureKindLabels[requirements.structureKind];
  const rootProgress = requirements.root
    ? context.progress.get(requirementNodeKey(requirements.root))
    : undefined;
  const year = context.catalogue.academicYear;
  return (
    <Card className="overflow-hidden" id={structureAnchor(requirements)}>
      <CardHeader className="border-b border-border/60">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ListChecks aria-hidden="true" size={17} />
        </span>
        <CardTitle>
          <h2>{requirements.structureName}</h2>
        </CardTitle>
        <CardDescription>
          {typeLabel} {requirements.structureCode}
          {year ? ` · Published ${year}` : ""}
        </CardDescription>
        {rootProgress ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <StateBadge progress={rootProgress} />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {requirements.root ? (
          <RequirementGroupView context={context} group={requirements.root} />
        ) : (
          <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            This published snapshot has no structured requirement tree.
          </p>
        )}

        {requirements.unmodelled.length > 0 ? (
          <Alert variant="warning">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Source rules requiring a manual check</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-2 pl-4">
                {requirements.unmodelled.map((item) => (
                  <li key={`${requirements.snapshotId}-${item.position}`}>
                    {item.sourceText}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Summary rail                                                        */
/* ------------------------------------------------------------------ */

function countStates(progress: RequirementTreeProgress) {
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

function OverallProgressCard({
  unitTarget,
  progress,
}: {
  unitTarget: number | null;
  progress: ReturnType<typeof degreeUnitProgress>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall unit progress</CardTitle>
        <CardDescription>
          {unitTarget === null
            ? "The published programme has no unit total."
            : `${progress.completed} of ${unitTarget} units completed`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unitTarget === null ? (
          <p className="text-sm text-muted-foreground">
            {progress.completed} completed and {progress.planned} planned units
            are mapped. Remaining units cannot be calculated until an
            administrator publishes the programme total.
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <strong className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                {progress.percent}%
              </strong>
              <span className="text-xs text-muted-foreground tabular-nums">
                {progress.remaining} still to plan
              </span>
            </div>
            <Progress
              aria-label="Completed units"
              className="mt-3 h-2"
              value={Math.min(100, progress.percent)}
            />
            <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
              {[
                ["Completed", progress.completed, "bg-primary"],
                ["Planned", progress.planned, "bg-primary/35"],
                ["Remaining", progress.remaining, "bg-muted-foreground/30"],
              ].map(([label, value, swatch]) => (
                <div key={label as string} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className={cn("size-2 rounded-full", swatch as string)}
                    />
                    {label}
                  </dt>
                  <dd className="mt-0.5 font-semibold text-foreground tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RuleSummaryCard({
  structures,
  progressByStructure,
}: {
  structures: PlanStructureRequirements[];
  progressByStructure: ReadonlyMap<number, RequirementTreeProgress>;
}) {
  const totals: Record<RequirementNodeState, number> = {
    satisfied: 0,
    in_progress: 0,
    not_started: 0,
    over_limit: 0,
    unmeasured: 0,
  };
  structures.forEach((structure) => {
    const progress = progressByStructure.get(structure.snapshotId);
    if (!progress) return;
    const counts = countStates(progress);
    (Object.keys(totals) as RequirementNodeState[]).forEach((state) => {
      totals[state] += counts[state];
    });
  });
  const measured =
    totals.satisfied +
    totals.in_progress +
    totals.not_started +
    totals.over_limit;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rules at a glance</CardTitle>
        <CardDescription>
          {measured === 0
            ? "No rules can be checked automatically yet."
            : `${totals.satisfied} of ${measured} checkable rules satisfied`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid grid-cols-2 gap-2">
          {(
            [
              "satisfied",
              "in_progress",
              "not_started",
              "over_limit",
            ] as RequirementNodeState[]
          )
            .filter((state) => state !== "over_limit" || totals.over_limit > 0)
            .map((state) => (
              <li
                key={state}
                className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-2"
              >
                <StateIcon state={state} className="size-4" />
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {stateMeta[state].label}
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {totals[state]}
                </span>
              </li>
            ))}
        </ul>
        {totals.unmeasured > 0 ? (
          <p className="text-xs text-muted-foreground">
            {totals.unmeasured === 1
              ? "1 rule needs a manual check against your transcript."
              : `${totals.unmeasured} rules need a manual check against your transcript.`}
          </p>
        ) : null}
        {structures.length > 1 ? (
          <nav aria-label="Structures on this page">
            <ul className="space-y-1">
              {structures.map((structure) => {
                const rootProgress = structure.root
                  ? progressByStructure
                      .get(structure.snapshotId)
                      ?.get(requirementNodeKey(structure.root))
                  : undefined;
                return (
                  <li key={structure.snapshotId}>
                    <a
                      className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-foreground/80 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      href={`#${structureAnchor(structure)}`}
                    >
                      <StateIcon
                        state={rootProgress?.state ?? "unmeasured"}
                        className="size-4"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {structure.structureName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {structureKindLabels[structure.structureKind]}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PlanCoursesCard({
  courses,
}: {
  courses: Array<{
    attempt: Attempt;
    course: NonNullable<ReturnType<typeof planningCourseForAttempt>>;
  }>;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60">
        <CardTitle>
          <h2>Courses in your plan</h2>
        </CardTitle>
        <CardDescription>
          {courses.length} course{courses.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      {courses.length === 0 ? (
        <Empty className="rounded-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenCheck aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No planned or recorded courses yet</EmptyTitle>
            <EmptyDescription>
              Add courses on the plan board to see how they count.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/plan">Open the plan</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
          {courses.map(({ attempt, course }) => (
            <li
              key={attempt.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <CourseToken
                accent={course.accent}
                code={course.code}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <Link
                  className="block truncate text-sm font-medium text-foreground hover:underline"
                  href={`/courses/${course.code}?year=${course.year}`}
                >
                  {course.code}
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {course.name}
                  </span>
                </Link>
                <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                  {unitsForAttempt(attempt, course)} units
                </span>
              </span>
              <Badge variant={badgeVariantForTone[attemptTone(attempt.status)]}>
                {attempt.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function Requirements({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const degree = catalogue.degrees.find(
    (item) => item.code === state.profile.degreeCode,
  );
  const unitTarget = degree?.units ?? null;
  const progress = degreeUnitProgress(
    state.attempts,
    unitTarget ?? 0,
    catalogue,
  );

  const courses = useMemo(
    () =>
      state.attempts
        .map((attempt) => ({
          attempt,
          course: planningCourseForAttempt(attempt, catalogue),
        }))
        .filter(
          (
            entry,
          ): entry is {
            attempt: Attempt;
            course: NonNullable<ReturnType<typeof planningCourseForAttempt>>;
          } => Boolean(entry.course),
        ),
    [catalogue, state.attempts],
  );
  const attemptStatusByCode = useMemo(
    () =>
      new Map(
        state.attempts.map((attempt) => [attempt.courseCode, attempt.status]),
      ),
    [state.attempts],
  );
  const selectedStructureCodes = useMemo(
    () =>
      new Set(
        [
          state.profile.degreeCode,
          state.profile.majorCode,
          ...state.profile.minorCodes,
          ...state.profile.specialisationCodes,
        ].filter(Boolean),
      ),
    [
      state.profile.degreeCode,
      state.profile.majorCode,
      state.profile.minorCodes,
      state.profile.specialisationCodes,
    ],
  );
  const selectedRequirements = useMemo(
    () =>
      catalogue.structureRequirements
        .filter((requirement) =>
          selectedStructureCodes.has(requirement.structureCode),
        )
        .toSorted(
          (left, right) =>
            structureKindOrder[left.structureKind] -
              structureKindOrder[right.structureKind] ||
            left.structureCode.localeCompare(right.structureCode),
        ),
    [catalogue.structureRequirements, selectedStructureCodes],
  );
  const progressByStructure = useMemo(
    () =>
      new Map(
        selectedRequirements.map((requirements) => [
          requirements.snapshotId,
          requirementTreeProgress({
            root: requirements.root,
            attempts: state.attempts,
            catalogue,
          }),
        ]),
      ),
    [catalogue, selectedRequirements, state.attempts],
  );

  const programmeRequirements = selectedRequirements.find(
    (requirement) => requirement.structureKind === "programme",
  );
  const structuresMissingRequirements = catalogue.structures.filter(
    (structure) =>
      structure.kind !== "programme" &&
      selectedStructureCodes.has(structure.code) &&
      !selectedRequirements.some(
        (requirements) =>
          requirements.structureCode === structure.code &&
          hasRequirementContent(requirements),
      ),
  );
  const hasPublishedProgrammeRequirements = programmeRequirements
    ? hasRequirementContent(programmeRequirements)
    : catalogue.structureRequirements.length === 0 &&
      catalogue.programmeRequirementsImported;
  const structuresWithContent = selectedRequirements.filter(
    hasRequirementContent,
  );

  if (!degree) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="sr-only">Requirements</h1>
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListChecks aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Choose a published degree</EmptyTitle>
                <EmptyDescription>
                  Select a published degree in onboarding to see its rules.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/onboarding">Start onboarding</Link>
                </Button>
              </EmptyContent>
            </Empty>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="sr-only">Requirements</h1>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-5">
            {!hasPublishedProgrammeRequirements ? (
              <Alert variant="warning">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>
                  Published programme requirements are not available yet
                </AlertTitle>
                <AlertDescription>
                  Coursemap will not substitute sample core, elective or major
                  buckets for this programme&apos;s official rules.
                </AlertDescription>
              </Alert>
            ) : null}

            {structuresMissingRequirements.map((structure) => (
              <Alert
                key={`${structure.kind}-${structure.code}`}
                variant="warning"
              >
                <CircleAlert aria-hidden="true" />
                <AlertTitle>
                  Published {structure.kind} requirements are not available yet
                </AlertTitle>
                <AlertDescription>
                  Coursemap will show {structure.name}&apos;s reviewed source
                  rules once its published snapshot includes them.
                </AlertDescription>
              </Alert>
            ))}

            {structuresWithContent.map((requirements) => (
              <StructureRequirementsCard
                context={{
                  catalogue,
                  attemptStatusByCode,
                  selectedStructureCodes,
                  progress:
                    progressByStructure.get(requirements.snapshotId) ??
                    new Map(),
                }}
                key={`${requirements.structureKind}-${requirements.snapshotId}`}
                requirements={requirements}
              />
            ))}

            <p className="flex items-center gap-2 text-xs text-muted-foreground/80">
              <BookOpenCheck aria-hidden="true" size={14} />
              Progress here is indicative. Always confirm enrolment and
              graduation requirements with ANU.
            </p>
          </div>

          <aside
            aria-label="Progress summary"
            className="space-y-4 lg:sticky lg:top-20"
          >
            <OverallProgressCard progress={progress} unitTarget={unitTarget} />
            <RuleSummaryCard
              progressByStructure={progressByStructure}
              structures={structuresWithContent}
            />
            <PlanCoursesCard courses={courses} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
