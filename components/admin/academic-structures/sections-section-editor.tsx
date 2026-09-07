"use client";
import { Button } from "@reui/ui/button";
import { Field } from "@reui/ui/field";
import { Input } from "@reui/ui/input";
import { Textarea } from "@reui/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { AcademicStructureManualSnapshotProjection as Projection } from "@/lib/structure-import/manual-snapshot";
import { CollectionHeader, ProvenanceFields } from "./source-fields-editor";
import { nextKey } from "./editor-utils";

export function ContentSectionEditor({
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
            onClick={() => {
              const sectionKey = nextKey(
                projection.sections.map(({ sectionKey: key }) => key),
                "manual-section",
              );
              setProjection({
                ...projection,
                sections: [
                  ...projection.sections,
                  {
                    position: projection.sections.length + 1,
                    sectionKey,
                    heading: "",
                    markdown: "",
                    sourceText: "",
                    sourceLocator: `manual:section:${sectionKey}`,
                  },
                ],
              });
            }}
            size="sm"
            variant="outline"
            type="button"
          >
            <Plus aria-hidden="true" size={13} />
            Add section
          </Button>
        }
        count={projection.sections.length}
      >
        Sections
      </CollectionHeader>
      <div className="space-y-3 p-5 sm:p-6">
        {projection.sections.map((section, index) => (
          <div
            className="rounded-lg border border-border p-4"
            key={section.sectionKey}
          >
            <div className="flex items-start gap-3">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <Field>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{"Heading"}</span>
                    <Input
                      onChange={(event) =>
                        setProjection({
                          ...projection,
                          sections: projection.sections.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, heading: event.target.value }
                                : item,
                          ),
                        })
                      }
                      required
                      value={section.heading}
                    />
                  </label>
                </Field>
                <Field>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{"Section key"}</span>
                    <Input
                      className="font-mono"
                      onChange={(event) =>
                        setProjection({
                          ...projection,
                          sections: projection.sections.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    sectionKey:
                                      event.target.value.toLowerCase(),
                                  }
                                : item,
                          ),
                        })
                      }
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      required
                      value={section.sectionKey}
                    />
                  </label>
                </Field>
              </div>
              <Button
                onClick={() =>
                  setProjection({
                    ...projection,
                    sections: projection.sections.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
                size="icon-sm"
                variant="outline"
                aria-label={`Remove ${section.heading || "section"}`}
                title={`Remove ${section.heading || "section"}`}
                type="button"
              >
                <Trash2 aria-hidden="true" size={14} />
              </Button>
            </div>
            <Field className="mt-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Content"}</span>
                <Textarea
                  className="min-h-32"
                  onChange={(event) =>
                    setProjection({
                      ...projection,
                      sections: projection.sections.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, markdown: event.target.value }
                          : item,
                      ),
                    })
                  }
                  required
                  value={section.markdown}
                />
              </label>
            </Field>
            <ProvenanceFields
              onLocatorChange={(sourceLocator) =>
                setProjection({
                  ...projection,
                  sections: projection.sections.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, sourceLocator } : item,
                  ),
                })
              }
              onSourceTextChange={(sourceText) =>
                setProjection({
                  ...projection,
                  sections: projection.sections.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, sourceText } : item,
                  ),
                })
              }
              sourceLocator={section.sourceLocator}
              sourceText={section.sourceText}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
