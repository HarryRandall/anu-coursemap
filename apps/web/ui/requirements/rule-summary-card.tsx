"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import type { PlanStructureRequirements } from "@/lib/coursemap/plan-catalogue";
import {
  requirementNodeKey,
  type RequirementNodeState,
  type RequirementTreeProgress,
} from "@/lib/coursemap/requirement-progress";
import {
  countStates,
  stateMeta,
  structureAnchor,
  structureKindLabels,
} from "@/ui/requirements/requirement-presentation";
import { StateIcon } from "@/ui/requirements/requirement-state";

export function RuleSummaryCard({
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
