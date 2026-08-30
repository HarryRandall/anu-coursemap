"use client";

import {
  BookOpenCheck,
  CircleAlert,
  GitBranch,
  ListChecks,
} from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  PlanCatalogue,
  PlanRequirementCondition,
  PlanRequirementGroup,
  PlanRequirementNode,
  PlanStructureRequirements,
} from "@/lib/coursemap/plan-catalogue";
import {
  degreeUnitProgress,
  planningCourseForAttempt,
  unitsForAttempt,
} from "@/lib/planner";

function formatUnits(units: number) {
  return `${units.toLocaleString("en-AU", {
    maximumFractionDigits: 2,
  })} units`;
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
    parts.push(`${condition.subjectCode} coded courses`);
  } else if (condition.conditionKind === "level") {
    if (condition.minimumLevel !== null && condition.maximumLevel !== null) {
      parts.push(
        `${condition.minimumLevel} to ${condition.maximumLevel} level courses`,
      );
    } else if (condition.minimumLevel !== null) {
      parts.push(`${condition.minimumLevel} level courses or above`);
    } else if (condition.maximumLevel !== null) {
      parts.push(`Courses up to ${condition.maximumLevel} level`);
    }
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

function attemptTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "enrolled") return "brand" as const;
  return "info" as const;
}

function RequirementConditionView({
  condition,
  catalogue,
  attemptStatusByCode,
}: {
  condition: PlanRequirementCondition;
  catalogue: PlanCatalogue;
  attemptStatusByCode: ReadonlyMap<string, string>;
}) {
  const interpretation = conditionInterpretation(condition);
  const courseByCode = new Map(
    catalogue.courses.map((course) => [course.code, course]),
  );
  const structureNameByCode = new Map([
    ...catalogue.degrees.map((degree) => [degree.code, degree.name] as const),
    ...catalogue.majors.map((major) => [major.code, major.name] as const),
  ]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
        ANU source wording
      </p>
      <blockquote className="mt-1 text-sm leading-6 whitespace-pre-wrap text-zinc-800">
        {condition.sourceText}
      </blockquote>

      {interpretation ? (
        <div className="mt-3 rounded-md bg-zinc-50 px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
            Structured interpretation
          </p>
          <p className="mt-0.5 text-xs leading-5 text-zinc-700">
            {interpretation}
          </p>
        </div>
      ) : null}

      {condition.options.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {condition.options.map((option) => {
            const course = courseByCode.get(option.code);
            const attemptStatus = attemptStatusByCode.get(option.code);
            const structureName = structureNameByCode.get(option.code);
            return (
              <li
                className="flex min-w-0 items-center gap-2 rounded-md border border-zinc-100 px-2.5 py-2"
                key={`${condition.id}-${option.kind}-${option.code}`}
              >
                {option.kind === "course" ? (
                  <CourseToken
                    accent={course?.accent ?? "violet"}
                    code={option.code}
                    size="sm"
                  />
                ) : (
                  <Badge tone="neutral">
                    {option.structureKind ?? "structure"}
                  </Badge>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs font-semibold text-zinc-900">
                    {option.code}
                  </span>
                  {course?.name || structureName ? (
                    <span className="block truncate text-xs text-zinc-500">
                      {course?.name ?? structureName}
                    </span>
                  ) : null}
                </span>
                {attemptStatus ? (
                  <Badge tone={attemptTone(attemptStatus)}>
                    {attemptStatus}
                  </Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function RequirementNodeView({
  node,
  catalogue,
  attemptStatusByCode,
  depth,
}: {
  node: PlanRequirementNode;
  catalogue: PlanCatalogue;
  attemptStatusByCode: ReadonlyMap<string, string>;
  depth: number;
}) {
  if (node.type === "condition") {
    return (
      <RequirementConditionView
        attemptStatusByCode={attemptStatusByCode}
        catalogue={catalogue}
        condition={node}
      />
    );
  }
  return (
    <RequirementGroupView
      attemptStatusByCode={attemptStatusByCode}
      catalogue={catalogue}
      depth={depth}
      group={node}
    />
  );
}

function RequirementGroupView({
  group,
  catalogue,
  attemptStatusByCode,
  depth = 0,
}: {
  group: PlanRequirementGroup;
  catalogue: PlanCatalogue;
  attemptStatusByCode: ReadonlyMap<string, string>;
  depth?: number;
}) {
  const units = unitsDescription(group.minimumUnits, group.maximumUnits);
  const alternative = group.operator === "any_of";
  return (
    <div
      className={
        depth === 0
          ? "rounded-lg border border-brand-100 bg-brand-50/40 p-4"
          : "rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">
            {group.title ?? groupInstruction(group)}
          </p>
          {group.description ? (
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              {group.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={alternative ? "brand" : "neutral"}>
            <GitBranch aria-hidden="true" />
            {groupInstruction(group)}
          </Badge>
          {units ? <Badge tone="neutral">{units}</Badge> : null}
        </div>
      </div>

      {group.children.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {group.children.map((child, index) => (
            <li key={`${child.type}-${child.id}`}>
              {alternative && index > 0 ? (
                <div
                  className="mb-3 flex items-center gap-2"
                  aria-hidden="true"
                >
                  <span className="h-px flex-1 bg-brand-100" />
                  <span className="text-[10px] font-semibold tracking-wider text-brand-700 uppercase">
                    or
                  </span>
                  <span className="h-px flex-1 bg-brand-100" />
                </div>
              ) : null}
              <RequirementNodeView
                attemptStatusByCode={attemptStatusByCode}
                catalogue={catalogue}
                depth={depth + 1}
                node={child}
              />
            </li>
          ))}
        </ol>
      ) : null}

      <details className="mt-3 text-xs text-zinc-600">
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none">
          ANU group source wording
        </summary>
        <p className="border-l-2 border-zinc-200 pl-3 whitespace-pre-wrap">
          {group.sourceText}
        </p>
      </details>
    </div>
  );
}

function hasRequirementContent(requirements: PlanStructureRequirements) {
  return requirements.root !== null || requirements.unmodelled.length > 0;
}

function StructureRequirementsCard({
  requirements,
  catalogue,
  attemptStatusByCode,
}: {
  requirements: PlanStructureRequirements;
  catalogue: PlanCatalogue;
  attemptStatusByCode: ReadonlyMap<string, string>;
}) {
  const typeLabel =
    requirements.structureKind === "programme" ? "Programme" : "Major";
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="border-b border-zinc-100"
        description={`${typeLabel} ${requirements.structureCode}${catalogue.academicYear ? ` · Published ${catalogue.academicYear}` : ""}`}
        icon={
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <ListChecks aria-hidden="true" size={17} />
          </span>
        }
        title={`${requirements.structureName} requirements`}
      />
      <CardContent className="space-y-4 pt-5">
        {requirements.root ? (
          <RequirementGroupView
            attemptStatusByCode={attemptStatusByCode}
            catalogue={catalogue}
            group={requirements.root}
          />
        ) : (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            This published snapshot has no structured requirement tree.
          </p>
        )}

        {requirements.unmodelled.length > 0 ? (
          <Alert tone="warning">
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
            attempt: (typeof state.attempts)[number];
            course: NonNullable<ReturnType<typeof planningCourseForAttempt>>;
          } => Boolean(entry.course),
        ),
    [catalogue, state],
  );
  const attemptStatusByCode = useMemo(
    () =>
      new Map(
        state.attempts.map((attempt) => [attempt.courseCode, attempt.status]),
      ),
    [state.attempts],
  );
  const selectedRequirements = useMemo(
    () =>
      catalogue.structureRequirements
        .filter(
          (requirement) =>
            (requirement.structureKind === "programme" &&
              requirement.structureCode === state.profile.degreeCode) ||
            (requirement.structureKind === "major" &&
              requirement.structureCode === state.profile.majorCode),
        )
        .toSorted((left, right) =>
          left.structureKind === right.structureKind
            ? 0
            : left.structureKind === "programme"
              ? -1
              : 1,
        ),
    [
      catalogue.structureRequirements,
      state.profile.degreeCode,
      state.profile.majorCode,
    ],
  );
  const programmeRequirements = selectedRequirements.find(
    (requirement) => requirement.structureKind === "programme",
  );
  const majorRequirements = selectedRequirements.find(
    (requirement) => requirement.structureKind === "major",
  );
  const hasPublishedProgrammeRequirements = programmeRequirements
    ? hasRequirementContent(programmeRequirements)
    : catalogue.structureRequirements.length === 0 &&
      catalogue.programmeRequirementsImported;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <h1 className="sr-only">Requirements</h1>

        {!degree ? (
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListChecks aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Choose a published degree</EmptyTitle>
                <EmptyDescription>
                  Select a published degree in onboarding to begin.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <ButtonLink href="/onboarding">Start onboarding</ButtonLink>
              </EmptyContent>
            </Empty>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="px-5 pt-5 pb-4">
                <CardTitle>Overall unit progress</CardTitle>
                <CardAction>
                  <strong className="text-2xl tracking-tight text-zinc-950">
                    {unitTarget === null
                      ? "Not recorded"
                      : `${progress.percent}%`}
                  </strong>
                </CardAction>
              </CardHeader>
              <CardContent>
                {unitTarget === null ? (
                  <p className="rounded-lg bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-950 ring-1 ring-amber-200 ring-inset">
                    {progress.completed} completed and {progress.planned}{" "}
                    planned units are mapped. The published programme does not
                    record a total unit target, so Coursemap cannot calculate
                    remaining units or a completion percentage.
                  </p>
                ) : (
                  <>
                    <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                      <span
                        className="block h-full bg-brand-700"
                        style={{ width: `${Math.min(100, progress.percent)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-zinc-600">
                      {progress.completed} completed units · {progress.planned}{" "}
                      planned units · {progress.remaining} units still to plan
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {!hasPublishedProgrammeRequirements ? (
              <Alert tone="warning" className="rounded-xl px-5 py-4">
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

            {state.profile.majorCode &&
            (!majorRequirements ||
              !hasRequirementContent(majorRequirements)) ? (
              <Alert tone="warning" className="rounded-xl px-5 py-4">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>
                  Published major requirements are not available yet
                </AlertTitle>
                <AlertDescription>
                  Coursemap will show this major&apos;s reviewed source rules
                  once its published snapshot includes them.
                </AlertDescription>
              </Alert>
            ) : null}

            {selectedRequirements
              .filter(hasRequirementContent)
              .map((requirements) => (
                <StructureRequirementsCard
                  attemptStatusByCode={attemptStatusByCode}
                  catalogue={catalogue}
                  key={`${requirements.structureKind}-${requirements.snapshotId}`}
                  requirements={requirements}
                />
              ))}

            <Card className="overflow-hidden">
              <CardHeader
                className="border-b border-zinc-100"
                title="Courses currently in your plan"
                description="Published course data only."
              />
              {courses.length === 0 ? (
                <Empty className="rounded-none">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BookOpenCheck aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No planned or recorded courses yet</EmptyTitle>
                    <EmptyDescription>
                      Add courses to your plan to track them here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {courses.map(({ attempt, course }) => (
                    <div
                      key={attempt.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <CourseToken
                        accent={course.accent}
                        code={course.code}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900">
                          {course.code} · {course.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {unitsForAttempt(attempt, course)} units ·{" "}
                          {attempt.status}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        <p className="flex items-center gap-2 text-xs text-zinc-400">
          <BookOpenCheck size={14} /> Always confirm enrolment and graduation
          requirements with ANU.
        </p>
      </div>
    </AppShell>
  );
}
