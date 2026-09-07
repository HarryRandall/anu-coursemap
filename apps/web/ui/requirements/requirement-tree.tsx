"use client";
import Link from "next/link";
import { GitBranch } from "lucide-react";
import { Badge } from "@coursemap/ui/components/badge";
import { CourseToken } from "@/ui/common/course-token";
import { cn } from "@/lib/cn";
import type {
  PlanRequirementCondition,
  PlanRequirementGroup,
  PlanRequirementNode,
} from "@/lib/coursemap/plan-catalogue";
import { requirementNodeKey } from "@/lib/coursemap/requirement-progress";
import { badgeVariantForTone } from "@/lib/ui";
import {
  TreeContext,
  attemptTone,
  conditionInterpretation,
  groupInstruction,
  unitsDescription,
  unitsSummary,
} from "@/ui/requirements/requirement-presentation";
import { StateBadge, StateIcon } from "@/ui/requirements/requirement-state";
import { UnitsBar } from "@/ui/requirements/units-bar";

export function SourceWording({
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
export function RequirementConditionView({
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
export function RequirementNodeView({
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
export function RequirementGroupView({
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
