"use client";
import { Button } from "@coursemap/ui/primitives/button";
import { Field } from "@coursemap/ui/primitives/field";
import { Input } from "@coursemap/ui/primitives/input";
import { OptionPicker } from "@/ui/ui/option-picker";
import { Plus, Trash2 } from "lucide-react";
import type { AcademicStructureManualSnapshotProjection as Projection } from "@/lib/structure-import/manual-snapshot";
import { CollectionHeader, ProvenanceFields } from "./source-fields-editor";
import { structureKindOptions } from "./requirement-group-editor";
import { nullableText } from "./editor-utils";

export function RelationshipsSectionEditor({
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
                relationships: [
                  ...projection.relationships,
                  {
                    position: projection.relationships.length + 1,
                    relationshipKind: "source_reference",
                    targetKind: "course",
                    targetCode: "",
                    targetTitle: null,
                    sourceText: "",
                    sourceLocator: `manual:relationship:${projection.relationships.length + 1}`,
                  },
                ],
              })
            }
            size="sm"
            variant="outline"
            type="button"
          >
            <Plus aria-hidden="true" size={13} />
            Add relationship
          </Button>
        }
        count={projection.relationships.length}
      >
        Relationships
      </CollectionHeader>
      <div className="space-y-3 p-5 sm:p-6">
        {projection.relationships.map((relationship, index) => {
          const updateRelationship = (
            changes: Partial<(typeof projection.relationships)[number]>,
          ) =>
            setProjection({
              ...projection,
              relationships: projection.relationships.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...changes } : item,
              ),
            });
          return (
            <div
              className="rounded-lg border border-border p-4"
              key={`${relationship.position}-${index}`}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        {"Relationship"}
                      </span>
                      <OptionPicker
                        value={
                          "coursemap:" + String(relationship.relationshipKind)
                        }
                        onValueChange={(nextValue) => {
                          const option = (
                            [
                              {
                                value: "source_reference",
                                label: "Source reference",
                              },
                              { value: "relevant", label: "Relevant" },
                              { value: "option", label: "Option" },
                              { value: "required", label: "Required" },
                              {
                                value: "incompatible",
                                label: "Incompatible",
                              },
                              { value: "other", label: "Other" },
                            ] as const
                          ).find(
                            (option) =>
                              "coursemap:" + String(option.value) === nextValue,
                          );
                          if (option)
                            ((relationshipKind) =>
                              updateRelationship({ relationshipKind }))(
                              option.value,
                            );
                        }}
                        aria-label={"Relationship kind"}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder={"Select..."}
                        items={[
                          {
                            value: "source_reference",
                            label: "Source reference",
                          },
                          { value: "relevant", label: "Relevant" },
                          { value: "option", label: "Option" },
                          { value: "required", label: "Required" },
                          { value: "incompatible", label: "Incompatible" },
                          { value: "other", label: "Other" },
                        ].map((option) => ({
                          value: "coursemap:" + String(option.value),
                          label: option.label,
                        }))}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        {"Target kind"}
                      </span>
                      <OptionPicker
                        value={"coursemap:" + String(relationship.targetKind)}
                        onValueChange={(nextValue) => {
                          const option = (
                            [
                              ...structureKindOptions,
                              { value: "course", label: "Course" },
                            ] as const
                          ).find(
                            (option) =>
                              "coursemap:" + String(option.value) === nextValue,
                          );
                          if (option)
                            ((targetKind) =>
                              updateRelationship({
                                targetKind,
                                targetCode: "",
                              }))(option.value);
                        }}
                        aria-label={"Relationship target kind"}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder={"Select..."}
                        items={[
                          ...structureKindOptions,
                          { value: "course", label: "Course" },
                        ].map((option) => ({
                          value: "coursemap:" + String(option.value),
                          label: option.label,
                        }))}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        {"Target code"}
                      </span>
                      <Input
                        className="font-mono"
                        onChange={(event) =>
                          updateRelationship({
                            targetCode: event.target.value.toUpperCase(),
                          })
                        }
                        required
                        value={relationship.targetCode}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        {"Target title"}
                      </span>
                      <Input
                        onChange={(event) =>
                          updateRelationship({
                            targetTitle: nullableText(event.target.value),
                          })
                        }
                        value={relationship.targetTitle ?? ""}
                      />
                    </label>
                  </Field>
                </div>
                <Button
                  onClick={() =>
                    setProjection({
                      ...projection,
                      relationships: projection.relationships.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Remove relationship ${index + 1}`}
                  title={`Remove relationship ${index + 1}`}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </Button>
              </div>
              <ProvenanceFields
                onLocatorChange={(sourceLocator) =>
                  updateRelationship({ sourceLocator })
                }
                onSourceTextChange={(sourceText) =>
                  updateRelationship({ sourceText })
                }
                sourceLocator={relationship.sourceLocator}
                sourceText={relationship.sourceText}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
