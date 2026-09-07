"use client";
import { CircleAlert, ListChecks } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@coursemap/ui/components/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import type { PlanStructureRequirements } from "@/lib/coursemap/plan-catalogue";
import { requirementNodeKey } from "@/lib/coursemap/requirement-progress";
import {
  TreeContext,
  structureAnchor,
  structureKindLabels,
} from "@/ui/requirements/requirement-presentation";
import { StateBadge } from "@/ui/requirements/requirement-state";
import { RequirementGroupView } from "@/ui/requirements/requirement-tree";

export function StructureRequirementsCard({
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
