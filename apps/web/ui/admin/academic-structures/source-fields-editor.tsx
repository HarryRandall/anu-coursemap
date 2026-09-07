"use client";
import type { ReactNode } from "react";
import { Button } from "@coursemap/ui/primitives/button";
import { Field } from "@coursemap/ui/primitives/field";
import { Input } from "@coursemap/ui/primitives/input";
import { Textarea } from "@coursemap/ui/primitives/textarea";
import { OptionPicker } from "@/ui/common/option-picker";
import { Plus, Trash2 } from "lucide-react";
import type { AcademicStructureManualSnapshotProjection } from "@/lib/structure-import/manual-snapshot";
import { nextSummaryFieldKey } from "./editor-utils";
type Projection = AcademicStructureManualSnapshotProjection;
type SummaryField = Projection["summaryFields"][number];
type Evidence = Projection["evidence"][number];

export function CollectionHeader({
  action,
  children,
  count,
}: {
  action: ReactNode;
  children: ReactNode;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{children}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {count} {count === 1 ? "saved row" : "saved rows"}
        </p>
      </div>
      {action}
    </div>
  );
}

export function SummaryFieldsEditor({
  onProjectionChange,
  projection,
}: {
  onProjectionChange: (projection: Projection) => void;
  projection: Projection;
}) {
  const fields = [
    ...new Set(projection.summaryFields.map(({ position }) => position)),
  ]
    .sort((left, right) => left - right)
    .map((position) =>
      projection.summaryFields
        .filter((field) => field.position === position)
        .sort((left, right) => left.valuePosition - right.valuePosition),
    );

  const addField = () => {
    const fieldKey = nextSummaryFieldKey(
      projection.summaryFields.map((field) => field.fieldKey),
    );
    onProjectionChange({
      ...projection,
      summaryFields: [
        ...projection.summaryFields,
        {
          position:
            Math.max(
              0,
              ...projection.summaryFields.map((field) => field.position),
            ) + 1,
          valuePosition: 1,
          fieldKey,
          label: "",
          fieldValue: "",
          sourceText: "",
        },
      ],
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CollectionHeader
        action={
          <Button onClick={addField} size="sm" variant="outline" type="button">
            <Plus aria-hidden="true" size={13} />
            Add summary field
          </Button>
        }
        count={fields.length}
      >
        Summary fields
      </CollectionHeader>
      <div className="space-y-3 p-5 sm:p-6">
        {fields.map((values) => {
          const field = values[0];
          if (!field) return null;
          const updateField = (changes: Partial<SummaryField>) =>
            onProjectionChange({
              ...projection,
              summaryFields: projection.summaryFields.map((item) =>
                item.position === field.position
                  ? { ...item, ...changes }
                  : item,
              ),
            });
          const updateValue = (
            valuePosition: number,
            changes: Partial<SummaryField>,
          ) =>
            onProjectionChange({
              ...projection,
              summaryFields: projection.summaryFields.map((item) =>
                item.position === field.position &&
                item.valuePosition === valuePosition
                  ? { ...item, ...changes }
                  : item,
              ),
            });

          return (
            <div
              className="rounded-lg border border-border p-4"
              key={`${field.position}-${field.fieldKey}`}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Label"}</span>
                      <Input
                        onChange={(event) =>
                          updateField({ label: event.target.value })
                        }
                        required
                        value={field.label}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Field key"}</span>
                      <Input
                        className="font-mono"
                        onChange={(event) =>
                          updateField({
                            fieldKey: event.target.value.toLowerCase(),
                          })
                        }
                        pattern="[a-z0-9]+(?:_[a-z0-9]+)*"
                        required
                        value={field.fieldKey}
                      />
                    </label>
                  </Field>
                </div>
                <Button
                  onClick={() =>
                    onProjectionChange({
                      ...projection,
                      summaryFields: projection.summaryFields.filter(
                        (item) => item.position !== field.position,
                      ),
                    })
                  }
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Remove ${field.label || "summary field"}`}
                  title={`Remove ${field.label || "summary field"}`}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </Button>
              </div>

              <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-foreground/80">
                    Values
                  </p>
                  <Button
                    onClick={() =>
                      onProjectionChange({
                        ...projection,
                        summaryFields: [
                          ...projection.summaryFields,
                          {
                            ...field,
                            valuePosition: values.length + 1,
                            fieldValue: "",
                          },
                        ],
                      })
                    }
                    size="sm"
                    variant="outline"
                    type="button"
                  >
                    <Plus aria-hidden="true" size={13} />
                    Add value
                  </Button>
                </div>
                {values.map((value) => (
                  <div
                    className="flex items-center gap-2"
                    key={value.valuePosition}
                  >
                    <Input
                      aria-label={`${field.label || field.fieldKey} value ${value.valuePosition}`}
                      onChange={(event) =>
                        updateValue(value.valuePosition, {
                          fieldValue: event.target.value,
                        })
                      }
                      required
                      value={value.fieldValue}
                    />
                    {values.length > 1 ? (
                      <Button
                        onClick={() =>
                          onProjectionChange({
                            ...projection,
                            summaryFields: projection.summaryFields.filter(
                              (item) =>
                                item.position !== field.position ||
                                item.valuePosition !== value.valuePosition,
                            ),
                          })
                        }
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Remove value ${value.valuePosition}`}
                        title={`Remove value ${value.valuePosition}`}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>

              <Field className="mt-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{"Source text"}</span>
                  <Textarea
                    className="min-h-20"
                    onChange={(event) =>
                      updateField({ sourceText: event.target.value })
                    }
                    required
                    value={field.sourceText}
                  />
                </label>
              </Field>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function EvidenceEditor({
  onProjectionChange,
  projection,
}: {
  onProjectionChange: (projection: Projection) => void;
  projection: Projection;
}) {
  const addEvidence = () =>
    onProjectionChange({
      ...projection,
      evidence: [
        ...projection.evidence,
        {
          position: projection.evidence.length + 1,
          fieldKey: "",
          sourceLocator: `manual:evidence:${projection.evidence.length + 1}`,
          evidenceExcerpt: "",
          confidence: 1,
          method: "deterministic",
        },
      ],
    });

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CollectionHeader
        action={
          <Button
            onClick={addEvidence}
            size="sm"
            variant="outline"
            type="button"
          >
            <Plus aria-hidden="true" size={13} />
            Add evidence
          </Button>
        }
        count={projection.evidence.length}
      >
        Evidence
      </CollectionHeader>
      <div className="space-y-3 p-5 sm:p-6">
        {projection.evidence.map((evidence, index) => {
          const updateEvidence = (changes: Partial<Evidence>) =>
            onProjectionChange({
              ...projection,
              evidence: projection.evidence.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...changes } : item,
              ),
            });
          return (
            <div
              className="rounded-lg border border-border p-4"
              key={`${evidence.position}-${index}`}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Field key"}</span>
                      <Input
                        className="font-mono"
                        onChange={(event) =>
                          updateEvidence({ fieldKey: event.target.value })
                        }
                        required
                        value={evidence.fieldKey}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Method"}</span>
                      <OptionPicker
                        value={"coursemap:" + String(evidence.method)}
                        onValueChange={(nextValue) => {
                          const option = (
                            [
                              {
                                value: "deterministic",
                                label: "Deterministic",
                              },
                              { value: "model", label: "Model" },
                            ] as const
                          ).find(
                            (option) =>
                              "coursemap:" + String(option.value) === nextValue,
                          );
                          if (option)
                            ((method) => updateEvidence({ method }))(
                              option.value,
                            );
                        }}
                        aria-label={"Evidence method"}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder={"Select..."}
                        items={[
                          { value: "deterministic", label: "Deterministic" },
                          { value: "model", label: "Model" },
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
                        {"Confidence"}
                      </span>
                      <Input
                        max="1"
                        min="0"
                        onChange={(event) =>
                          updateEvidence({
                            confidence: Number(event.target.value),
                          })
                        }
                        required
                        step="0.01"
                        type="number"
                        value={evidence.confidence}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        {"Source locator"}
                      </span>
                      <Input
                        onChange={(event) =>
                          updateEvidence({ sourceLocator: event.target.value })
                        }
                        required
                        value={evidence.sourceLocator}
                      />
                    </label>
                  </Field>
                </div>
                <Button
                  onClick={() =>
                    onProjectionChange({
                      ...projection,
                      evidence: projection.evidence.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Remove evidence ${index + 1}`}
                  title={`Remove evidence ${index + 1}`}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </Button>
              </div>
              <Field className="mt-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">
                    {"Evidence excerpt"}
                  </span>
                  <Textarea
                    className="min-h-20"
                    onChange={(event) =>
                      updateEvidence({ evidenceExcerpt: event.target.value })
                    }
                    required
                    value={evidence.evidenceExcerpt}
                  />
                </label>
              </Field>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ProvenanceFields({
  sourceLocator,
  sourceText,
  onLocatorChange,
  onSourceTextChange,
}: {
  sourceLocator: string;
  sourceText: string;
  onLocatorChange: (value: string) => void;
  onSourceTextChange: (value: string) => void;
}) {
  return (
    <details className="mt-3 border-t border-border/60 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground/90">
        Source provenance
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Source locator"}</span>
            <Input
              onChange={(event) => onLocatorChange(event.target.value)}
              required
              value={sourceLocator}
            />
          </label>
        </Field>
        <Field className="sm:col-span-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Source text"}</span>
            <Textarea
              className="min-h-20"
              onChange={(event) => onSourceTextChange(event.target.value)}
              required
              value={sourceText}
            />
          </label>
        </Field>
      </div>
    </details>
  );
}
