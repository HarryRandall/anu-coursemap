"use client";
import { Button } from "@coursemap/ui/primitives/button";
import { Textarea } from "@coursemap/ui/primitives/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { AcademicStructureManualSnapshotProjection as Projection } from "@/lib/structure-import/manual-snapshot";
import { CollectionHeader } from "./source-fields-editor";
import { RequirementGroupEditor } from "./requirement-group-editor";
import { nextKey } from "./editor-utils";

export function RequirementsSectionEditor({
  projection,
  onProjectionChange: setProjection,
}: {
  projection: Projection;
  onProjectionChange: (projection: Projection) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CollectionHeader
        action={
          projection.requirementRootKey === null ? (
            <Button
              onClick={() => {
                const key = nextKey(
                  projection.requirementGroups.map((group) => group.key),
                  "manual-root",
                );
                setProjection({
                  ...projection,
                  requirementRootKey: key,
                  requirementGroups: [
                    ...projection.requirementGroups,
                    {
                      key,
                      parentGroupKey: null,
                      position: 1,
                      operator: "all_of",
                      minimumCount: null,
                      minimumUnits: null,
                      maximumUnits: null,
                      title: "Requirements",
                      description: null,
                      sourceText: "",
                      sourceLocator: "manual:requirements",
                    },
                  ],
                });
              }}
              size="sm"
              variant="outline"
              type="button"
            >
              <Plus aria-hidden="true" size={13} />
              Add root group
            </Button>
          ) : null
        }
        count={
          projection.requirementGroups.length +
          projection.requirementConditions.length
        }
      >
        Requirement tree
      </CollectionHeader>
      <div className="p-5 sm:p-6">
        {projection.requirementRootKey ? (
          <RequirementGroupEditor
            depth={0}
            group={projection.requirementGroups.find(
              ({ key }) => key === projection.requirementRootKey,
            )!}
            onProjectionChange={setProjection}
            projection={projection}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-input px-4 py-8 text-center text-sm text-muted-foreground">
            No structured requirement tree is saved.
          </p>
        )}

        <div className="mt-5 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Preserved unmodelled wording
            </h3>
            <Button
              onClick={() =>
                setProjection({
                  ...projection,
                  unmodelledRequirements: [
                    ...projection.unmodelledRequirements,
                    {
                      position: projection.unmodelledRequirements.length + 1,
                      sourceText: "",
                      sourceLocator: "manual:requirements:unmodelled",
                    },
                  ],
                })
              }
              size="sm"
              variant="outline"
              type="button"
            >
              <Plus aria-hidden="true" size={13} />
              Add wording
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {projection.unmodelledRequirements.map((item, index) => (
              <div
                className="flex items-start gap-2"
                key={`${item.position}-${index}`}
              >
                <Textarea
                  aria-label={`Unmodelled requirement ${index + 1}`}
                  className="min-h-20"
                  onChange={(event) =>
                    setProjection({
                      ...projection,
                      unmodelledRequirements:
                        projection.unmodelledRequirements.map(
                          (row, itemIndex) =>
                            itemIndex === index
                              ? { ...row, sourceText: event.target.value }
                              : row,
                        ),
                    })
                  }
                  required
                  value={item.sourceText}
                />
                <Button
                  onClick={() =>
                    setProjection({
                      ...projection,
                      unmodelledRequirements:
                        projection.unmodelledRequirements.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                    })
                  }
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Remove unmodelled requirement ${index + 1}`}
                  title={`Remove unmodelled requirement ${index + 1}`}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
