"use client";
import { Button } from "@reui/ui/button";
import { Field } from "@reui/ui/field";
import { Textarea } from "@reui/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { AcademicStructureManualSnapshotProjection as Projection } from "@/lib/structure-import/manual-snapshot";
import { CollectionHeader, ProvenanceFields } from "./source-fields-editor";

export function OutcomesSectionEditor({
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
          <Button
            onClick={() =>
              setProjection({
                ...projection,
                learningOutcomes: [
                  ...projection.learningOutcomes,
                  {
                    position: projection.learningOutcomes.length + 1,
                    outcomeText: "",
                    sourceText: "",
                    sourceLocator: `manual:outcome:${projection.learningOutcomes.length + 1}`,
                  },
                ],
              })
            }
            size="sm"
            variant="outline"
            type="button"
          >
            <Plus aria-hidden="true" size={13} />
            Add outcome
          </Button>
        }
        count={projection.learningOutcomes.length}
      >
        Learning outcomes
      </CollectionHeader>
      <div className="space-y-3 p-5 sm:p-6">
        {projection.learningOutcomes.map((outcome, index) => (
          <div
            className="rounded-lg border border-border p-4"
            key={`${outcome.position}-${index}`}
          >
            <div className="flex items-start gap-3">
              <Field className="min-w-0 flex-1">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{`Outcome ${index + 1}`}</span>
                  <Textarea
                    onChange={(event) =>
                      setProjection({
                        ...projection,
                        learningOutcomes: projection.learningOutcomes.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, outcomeText: event.target.value }
                              : item,
                        ),
                      })
                    }
                    required
                    value={outcome.outcomeText}
                  />
                </label>
              </Field>
              <Button
                onClick={() =>
                  setProjection({
                    ...projection,
                    learningOutcomes: projection.learningOutcomes.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
                size="icon-sm"
                variant="outline"
                aria-label={`Remove outcome ${index + 1}`}
                title={`Remove outcome ${index + 1}`}
                type="button"
              >
                <Trash2 aria-hidden="true" size={14} />
              </Button>
            </div>
            <ProvenanceFields
              onLocatorChange={(sourceLocator) =>
                setProjection({
                  ...projection,
                  learningOutcomes: projection.learningOutcomes.map(
                    (item, itemIndex) =>
                      itemIndex === index ? { ...item, sourceLocator } : item,
                  ),
                })
              }
              onSourceTextChange={(sourceText) =>
                setProjection({
                  ...projection,
                  learningOutcomes: projection.learningOutcomes.map(
                    (item, itemIndex) =>
                      itemIndex === index ? { ...item, sourceText } : item,
                  ),
                })
              }
              sourceLocator={outcome.sourceLocator}
              sourceText={outcome.sourceText}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
