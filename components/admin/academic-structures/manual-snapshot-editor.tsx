"use client";

import { CircleAlert, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveAcademicStructureManualSnapshot } from "@/lib/coursemap/academic-structure-snapshot-actions";
import type { AdminStructureReviewRecord } from "@/lib/coursemap/admin-catalogue";
import {
  normaliseAcademicStructureManualSnapshotProjection,
  type AcademicStructureManualSnapshotProjection,
} from "@/lib/structure-import/manual-snapshot";

type Projection = AcademicStructureManualSnapshotProjection;
type Group = Projection["requirementGroups"][number];
type Condition = Projection["requirementConditions"][number];
type RequirementOption = Projection["requirementOptions"][number];
type SummaryField = Projection["summaryFields"][number];
type Evidence = Projection["evidence"][number];

const conditionKindOptions = [
  { value: "course_list", label: "Course list" },
  { value: "structure_list", label: "Programme or plan list" },
  { value: "unit_total", label: "Unit total" },
  { value: "level", label: "Course level" },
  { value: "subject", label: "Subject area" },
  { value: "tag", label: "Tagged course set" },
  { value: "unrestricted", label: "Unrestricted electives" },
  { value: "free_text", label: "Preserved wording" },
] as const;

const structureKindOptions = [
  { value: "programme", label: "Programme" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "specialisation", label: "Specialisation" },
] as const;

function nullableText(value: string) {
  return value.trim() ? value : null;
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: number | null) {
  return value === null ? "" : String(value);
}

function nextKey(values: string[], prefix: string) {
  let index = values.length + 1;
  while (values.includes(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function nextSummaryFieldKey(values: string[]) {
  let index = values.length + 1;
  while (values.includes(`manual_field_${index}`)) index += 1;
  return `manual_field_${index}`;
}

function nextChildPosition(projection: Projection, groupKey: string) {
  return (
    Math.max(
      0,
      ...projection.requirementGroups
        .filter(({ parentGroupKey }) => parentGroupKey === groupKey)
        .map(({ position }) => position),
      ...projection.requirementConditions
        .filter(({ groupKey: key }) => key === groupKey)
        .map(({ position }) => position),
    ) + 1
  );
}

function CollectionHeader({
  action,
  children,
  count,
}: {
  action: ReactNode;
  children: ReactNode;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-950">{children}</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {count} {count === 1 ? "saved row" : "saved rows"}
        </p>
      </div>
      {action}
    </div>
  );
}

function SummaryFieldsEditor({
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
          position: fields.length + 1,
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
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <CollectionHeader
        action={
          <Button onClick={addField} size="sm" variant="secondary">
            <Plus aria-hidden="true" size={13} /> Add summary field
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
              className="rounded-lg border border-zinc-200 p-4"
              key={`${field.position}-${field.fieldKey}`}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Field label="Label">
                    <Input
                      onChange={(event) =>
                        updateField({ label: event.target.value })
                      }
                      required
                      value={field.label}
                    />
                  </Field>
                  <Field label="Field key">
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
                  </Field>
                </div>
                <IconButton
                  label={`Remove ${field.label || "summary field"}`}
                  onClick={() =>
                    onProjectionChange({
                      ...projection,
                      summaryFields: projection.summaryFields.filter(
                        (item) => item.position !== field.position,
                      ),
                    })
                  }
                  size="icon-sm"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </IconButton>
              </div>

              <div className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-zinc-700">Values</p>
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
                    variant="secondary"
                  >
                    <Plus aria-hidden="true" size={13} /> Add value
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
                      <IconButton
                        label={`Remove value ${value.valuePosition}`}
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
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </IconButton>
                    ) : null}
                  </div>
                ))}
              </div>

              <Field className="mt-3" label="Source text">
                <Textarea
                  className="min-h-20"
                  onChange={(event) =>
                    updateField({ sourceText: event.target.value })
                  }
                  required
                  value={field.sourceText}
                />
              </Field>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EvidenceEditor({
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
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <CollectionHeader
        action={
          <Button onClick={addEvidence} size="sm" variant="secondary">
            <Plus aria-hidden="true" size={13} /> Add evidence
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
              className="rounded-lg border border-zinc-200 p-4"
              key={`${evidence.position}-${index}`}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Field key">
                    <Input
                      className="font-mono"
                      onChange={(event) =>
                        updateEvidence({ fieldKey: event.target.value })
                      }
                      required
                      value={evidence.fieldKey}
                    />
                  </Field>
                  <Field label="Method">
                    <Select
                      aria-label="Evidence method"
                      onChange={(method) => updateEvidence({ method })}
                      options={[
                        { value: "deterministic", label: "Deterministic" },
                        { value: "model", label: "Model" },
                      ]}
                      value={evidence.method}
                    />
                  </Field>
                  <Field label="Confidence">
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
                  </Field>
                  <Field label="Source locator">
                    <Input
                      onChange={(event) =>
                        updateEvidence({ sourceLocator: event.target.value })
                      }
                      required
                      value={evidence.sourceLocator}
                    />
                  </Field>
                </div>
                <IconButton
                  label={`Remove evidence ${index + 1}`}
                  onClick={() =>
                    onProjectionChange({
                      ...projection,
                      evidence: projection.evidence.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                  size="icon-sm"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </IconButton>
              </div>
              <Field className="mt-3" label="Evidence excerpt">
                <Textarea
                  className="min-h-20"
                  onChange={(event) =>
                    updateEvidence({ evidenceExcerpt: event.target.value })
                  }
                  required
                  value={evidence.evidenceExcerpt}
                />
              </Field>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProvenanceFields({
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
    <details className="mt-3 border-t border-zinc-100 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-800">
        Source provenance
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Source locator">
          <Input
            onChange={(event) => onLocatorChange(event.target.value)}
            required
            value={sourceLocator}
          />
        </Field>
        <Field className="sm:col-span-2" label="Source text">
          <Textarea
            className="min-h-20"
            onChange={(event) => onSourceTextChange(event.target.value)}
            required
            value={sourceText}
          />
        </Field>
      </div>
    </details>
  );
}

function RequirementConditionEditor({
  condition,
  onProjectionChange,
  projection,
}: {
  condition: Condition;
  onProjectionChange: (projection: Projection) => void;
  projection: Projection;
}) {
  const options = projection.requirementOptions
    .filter(({ conditionKey }) => conditionKey === condition.key)
    .sort((left, right) => left.position - right.position);

  const update = (changes: Partial<Condition>) =>
    onProjectionChange({
      ...projection,
      requirementConditions: projection.requirementConditions.map((item) =>
        item.key === condition.key ? { ...item, ...changes } : item,
      ),
    });

  const remove = () =>
    onProjectionChange({
      ...projection,
      requirementConditions: projection.requirementConditions.filter(
        ({ key }) => key !== condition.key,
      ),
      requirementOptions: projection.requirementOptions.filter(
        ({ conditionKey }) => conditionKey !== condition.key,
      ),
    });

  const setKind = (conditionKind: Condition["conditionKind"]) => {
    const structureKind = conditionKind === "structure_list" ? "major" : null;
    const reset: Condition = {
      ...condition,
      conditionKind,
      minimumUnits: null,
      maximumUnits: null,
      minimumCourses: null,
      structureKind,
      subjectCode: null,
      minimumLevel: null,
      maximumLevel: null,
      tag: null,
      freeText: conditionKind === "free_text" ? "" : null,
    };
    const retainedOptions = projection.requirementOptions.filter(
      ({ conditionKey }) => conditionKey !== condition.key,
    );
    const firstOption: RequirementOption[] =
      conditionKind === "course_list" || conditionKind === "structure_list"
        ? [
            {
              conditionKey: condition.key,
              position: 1,
              optionKind:
                conditionKind === "course_list" ? "course" : "structure",
              optionCode: "",
              structureKind,
            },
          ]
        : [];
    onProjectionChange({
      ...projection,
      requirementConditions: projection.requirementConditions.map((item) =>
        item.key === condition.key ? reset : item,
      ),
      requirementOptions: [...retainedOptions, ...firstOption],
    });
  };

  const updateOption = (
    position: number,
    changes: Partial<RequirementOption>,
  ) =>
    onProjectionChange({
      ...projection,
      requirementOptions: projection.requirementOptions.map((option) =>
        option.conditionKey === condition.key && option.position === position
          ? { ...option, ...changes }
          : option,
      ),
    });

  const removeOption = (position: number) =>
    onProjectionChange({
      ...projection,
      requirementOptions: projection.requirementOptions.filter(
        (option) =>
          option.conditionKey !== condition.key || option.position !== position,
      ),
    });

  const addOption = () => {
    const optionKind =
      condition.conditionKind === "structure_list" ? "structure" : "course";
    onProjectionChange({
      ...projection,
      requirementOptions: [
        ...projection.requirementOptions,
        {
          conditionKey: condition.key,
          position: options.length + 1,
          optionKind,
          optionCode: "",
          structureKind:
            optionKind === "structure" ? condition.structureKind : null,
        },
      ],
    });
  };

  const supportsUnits = [
    "course_list",
    "unit_total",
    "level",
    "subject",
    "tag",
    "unrestricted",
  ].includes(condition.conditionKind);
  const supportsLevels = ["level", "subject"].includes(condition.conditionKind);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Condition
          </p>
          <p className="mt-1 truncate font-mono text-xs text-zinc-500">
            {condition.key}
          </p>
        </div>
        <IconButton label="Remove condition" onClick={remove} size="icon-sm">
          <Trash2 aria-hidden="true" size={14} />
        </IconButton>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Condition type">
          <Select
            aria-label="Condition type"
            onChange={setKind}
            options={[...conditionKindOptions]}
            value={condition.conditionKind}
          />
        </Field>
        {condition.conditionKind === "structure_list" ? (
          <Field label="Structure kind">
            <Select
              aria-label="Structure kind"
              onChange={(structureKind) => {
                update({ structureKind });
                onProjectionChange({
                  ...projection,
                  requirementConditions: projection.requirementConditions.map(
                    (item) =>
                      item.key === condition.key
                        ? { ...item, structureKind }
                        : item,
                  ),
                  requirementOptions: projection.requirementOptions.map(
                    (option) =>
                      option.conditionKey === condition.key
                        ? { ...option, structureKind }
                        : option,
                  ),
                });
              }}
              options={[...structureKindOptions]}
              value={condition.structureKind ?? "major"}
            />
          </Field>
        ) : null}
        {condition.conditionKind === "subject" ? (
          <Field label="Subject code">
            <Input
              maxLength={4}
              onChange={(event) =>
                update({ subjectCode: event.target.value.toUpperCase() })
              }
              pattern="[A-Z]{4}"
              required
              value={condition.subjectCode ?? ""}
            />
          </Field>
        ) : null}
        {condition.conditionKind === "tag" ? (
          <Field label="Tag">
            <Input
              onChange={(event) => update({ tag: event.target.value })}
              required
              value={condition.tag ?? ""}
            />
          </Field>
        ) : null}
        {supportsUnits ? (
          <>
            <Field label="Minimum units">
              <Input
                min="0.5"
                onChange={(event) =>
                  update({ minimumUnits: nullableNumber(event.target.value) })
                }
                step="0.5"
                type="number"
                value={numberValue(condition.minimumUnits)}
              />
            </Field>
            <Field label="Maximum units">
              <Input
                min="0.5"
                onChange={(event) =>
                  update({ maximumUnits: nullableNumber(event.target.value) })
                }
                step="0.5"
                type="number"
                value={numberValue(condition.maximumUnits)}
              />
            </Field>
          </>
        ) : null}
        {supportsLevels ? (
          <>
            <Field label="Minimum level">
              <Input
                min="0"
                onChange={(event) =>
                  update({ minimumLevel: nullableNumber(event.target.value) })
                }
                step="1"
                type="number"
                value={numberValue(condition.minimumLevel)}
              />
            </Field>
            <Field label="Maximum level">
              <Input
                min="0"
                onChange={(event) =>
                  update({ maximumLevel: nullableNumber(event.target.value) })
                }
                step="1"
                type="number"
                value={numberValue(condition.maximumLevel)}
              />
            </Field>
          </>
        ) : null}
        {condition.conditionKind === "course_list" ||
        condition.conditionKind === "structure_list" ? (
          <Field label="Minimum choices">
            <Input
              min="1"
              onChange={(event) =>
                update({ minimumCourses: nullableNumber(event.target.value) })
              }
              step="1"
              type="number"
              value={numberValue(condition.minimumCourses)}
            />
          </Field>
        ) : null}
      </div>

      {condition.conditionKind === "free_text" ? (
        <Field className="mt-3" label="Requirement wording">
          <Textarea
            onChange={(event) => update({ freeText: event.target.value })}
            required
            value={condition.freeText ?? ""}
          />
        </Field>
      ) : null}

      {condition.conditionKind === "course_list" ||
      condition.conditionKind === "structure_list" ? (
        <div className="mt-4 rounded-lg bg-zinc-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-zinc-700">Allowed options</p>
            <Button onClick={addOption} size="sm" variant="secondary">
              <Plus aria-hidden="true" size={13} /> Add option
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {options.map((option) => (
              <div className="flex items-center gap-2" key={option.position}>
                <Input
                  aria-label={
                    option.optionKind === "course"
                      ? "Course code"
                      : "Structure code"
                  }
                  className="font-mono"
                  onChange={(event) =>
                    updateOption(option.position, {
                      optionCode: event.target.value.toUpperCase(),
                    })
                  }
                  placeholder={
                    option.optionKind === "course" ? "COMP1100" : "SOFT-MAJ"
                  }
                  required
                  value={option.optionCode}
                />
                <IconButton
                  label={`Remove ${option.optionCode || "option"}`}
                  onClick={() => removeOption(option.position)}
                  size="icon-sm"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ProvenanceFields
        onLocatorChange={(sourceLocator) => update({ sourceLocator })}
        onSourceTextChange={(sourceText) => update({ sourceText })}
        sourceLocator={condition.sourceLocator}
        sourceText={condition.sourceText}
      />
    </div>
  );
}

function RequirementGroupEditor({
  depth,
  group,
  onProjectionChange,
  projection,
}: {
  depth: number;
  group: Group;
  onProjectionChange: (projection: Projection) => void;
  projection: Projection;
}) {
  const childGroups = projection.requirementGroups
    .filter(({ parentGroupKey }) => parentGroupKey === group.key)
    .sort((left, right) => left.position - right.position);
  const conditions = projection.requirementConditions
    .filter(({ groupKey }) => groupKey === group.key)
    .sort((left, right) => left.position - right.position);

  const update = (changes: Partial<Group>) =>
    onProjectionChange({
      ...projection,
      requirementGroups: projection.requirementGroups.map((item) =>
        item.key === group.key ? { ...item, ...changes } : item,
      ),
    });

  const descendantKeys = (key: string): string[] => {
    const children = projection.requirementGroups.filter(
      ({ parentGroupKey }) => parentGroupKey === key,
    );
    return [key, ...children.flatMap((child) => descendantKeys(child.key))];
  };

  const remove = () => {
    const removedGroups = new Set(descendantKeys(group.key));
    const removedConditions = new Set(
      projection.requirementConditions
        .filter(({ groupKey }) => removedGroups.has(groupKey))
        .map(({ key }) => key),
    );
    onProjectionChange({
      ...projection,
      requirementRootKey:
        projection.requirementRootKey === group.key
          ? null
          : projection.requirementRootKey,
      requirementGroups: projection.requirementGroups.filter(
        ({ key }) => !removedGroups.has(key),
      ),
      requirementConditions: projection.requirementConditions.filter(
        ({ key }) => !removedConditions.has(key),
      ),
      requirementOptions: projection.requirementOptions.filter(
        ({ conditionKey }) => !removedConditions.has(conditionKey),
      ),
    });
  };

  const addGroup = () => {
    const key = nextKey(
      projection.requirementGroups.map((item) => item.key),
      "manual-group",
    );
    onProjectionChange({
      ...projection,
      requirementGroups: [
        ...projection.requirementGroups,
        {
          key,
          parentGroupKey: group.key,
          position: nextChildPosition(projection, group.key),
          operator: "all_of",
          minimumCount: null,
          minimumUnits: null,
          maximumUnits: null,
          title: null,
          description: null,
          sourceText: "",
          sourceLocator: `manual:requirements:${key}`,
        },
      ],
    });
  };

  const addCondition = () => {
    const key = nextKey(
      projection.requirementConditions.map((item) => item.key),
      "manual-condition",
    );
    onProjectionChange({
      ...projection,
      requirementConditions: [
        ...projection.requirementConditions,
        {
          key,
          groupKey: group.key,
          position: nextChildPosition(projection, group.key),
          conditionKind: "free_text",
          minimumUnits: null,
          maximumUnits: null,
          minimumCourses: null,
          structureKind: null,
          subjectCode: null,
          minimumLevel: null,
          maximumLevel: null,
          tag: null,
          freeText: "",
          sourceText: "",
          sourceLocator: `manual:requirements:${key}`,
        },
      ],
    });
  };

  return (
    <div
      className={
        depth === 0
          ? "rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5"
          : "rounded-lg border border-zinc-200 bg-zinc-50/70 p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {depth === 0 ? "Root group" : "Nested group"}
          </p>
          <p className="mt-1 truncate font-mono text-xs text-zinc-500">
            {group.key}
          </p>
        </div>
        <IconButton label="Remove group" onClick={remove} size="icon-sm">
          <Trash2 aria-hidden="true" size={14} />
        </IconButton>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Group title">
          <Input
            onChange={(event) =>
              update({ title: nullableText(event.target.value) })
            }
            value={group.title ?? ""}
          />
        </Field>
        <Field label="Operator">
          <Select
            aria-label="Group operator"
            onChange={(operator) =>
              update({
                operator,
                minimumCount:
                  operator === "minimum_count"
                    ? (group.minimumCount ?? 1)
                    : null,
              })
            }
            options={[
              { value: "all_of", label: "Complete all" },
              { value: "any_of", label: "Complete any" },
              { value: "minimum_count", label: "Minimum number" },
            ]}
            value={group.operator}
          />
        </Field>
        {group.operator === "minimum_count" ? (
          <Field label="Minimum number">
            <Input
              min="1"
              onChange={(event) =>
                update({ minimumCount: nullableNumber(event.target.value) })
              }
              required
              step="1"
              type="number"
              value={numberValue(group.minimumCount)}
            />
          </Field>
        ) : null}
        <Field label="Minimum units">
          <Input
            min="0.5"
            onChange={(event) =>
              update({ minimumUnits: nullableNumber(event.target.value) })
            }
            step="0.5"
            type="number"
            value={numberValue(group.minimumUnits)}
          />
        </Field>
        <Field label="Maximum units">
          <Input
            min="0.5"
            onChange={(event) =>
              update({ maximumUnits: nullableNumber(event.target.value) })
            }
            step="0.5"
            type="number"
            value={numberValue(group.maximumUnits)}
          />
        </Field>
        <Field className="sm:col-span-2 lg:col-span-3" label="Description">
          <Textarea
            className="min-h-20"
            onChange={(event) =>
              update({ description: nullableText(event.target.value) })
            }
            value={group.description ?? ""}
          />
        </Field>
      </div>
      <ProvenanceFields
        onLocatorChange={(sourceLocator) => update({ sourceLocator })}
        onSourceTextChange={(sourceText) => update({ sourceText })}
        sourceLocator={group.sourceLocator}
        sourceText={group.sourceText}
      />

      <div className="mt-4 space-y-3 border-l-2 border-zinc-200 pl-3 sm:pl-4">
        {childGroups.map((child) => (
          <RequirementGroupEditor
            depth={depth + 1}
            group={child}
            key={child.key}
            onProjectionChange={onProjectionChange}
            projection={projection}
          />
        ))}
        {conditions.map((condition) => (
          <RequirementConditionEditor
            condition={condition}
            key={condition.key}
            onProjectionChange={onProjectionChange}
            projection={projection}
          />
        ))}
        {childGroups.length === 0 && conditions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
            Add a condition or nested group before saving.
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={addCondition} size="sm" variant="secondary">
          <Plus aria-hidden="true" size={13} /> Add condition
        </Button>
        <Button onClick={addGroup} size="sm" variant="secondary">
          <Plus aria-hidden="true" size={13} /> Add nested group
        </Button>
      </div>
    </div>
  );
}

export function AcademicStructureManualSnapshotEditor({
  onCancel,
  onSaved,
  record,
}: {
  onCancel: () => void;
  onSaved: () => void;
  record: AdminStructureReviewRecord;
}) {
  const router = useRouter();
  const [projection, setProjection] = useState<Projection>(() =>
    JSON.parse(JSON.stringify(record.projection)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSnapshot = (
    key: keyof Projection["snapshot"],
    value: Projection["snapshot"][keyof Projection["snapshot"]],
  ) =>
    setProjection((current) => ({
      ...current,
      snapshot: { ...current.snapshot, [key]: value },
    }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const prepared =
        normaliseAcademicStructureManualSnapshotProjection(projection);
      const result = await saveAcademicStructureManualSnapshot({
        expectedBaseSnapshotId: record.id,
        projection: prepared,
        structurePublicId: record.publicId,
        structureYearId: record.structureYearId,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSaved();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The edited academic structure is not valid.",
      );
    } finally {
      setSaving(false);
    }
  }

  const textField = (
    key: keyof Projection["snapshot"],
    options: { multiline?: boolean; required?: boolean } = {},
  ) => {
    const value = projection.snapshot[key];
    const props = {
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        updateSnapshot(key, nullableText(event.target.value)),
      required: options.required,
      value: typeof value === "string" ? value : "",
    };
    return options.multiline ? <Textarea {...props} /> : <Input {...props} />;
  };

  return (
    <form className="space-y-5" onSubmit={save}>
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-zinc-950">
            Edit draft snapshot
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Saving creates an immutable manual draft based on snapshot{" "}
            {record.id}. It does not publish the structure.
          </p>
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Identity</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field className="sm:col-span-2" label="Name">
                {textField("title", { required: true })}
              </Field>
              <Field label="Acronym">{textField("acronym")}</Field>
              <Field label="Short name">{textField("shortName")}</Field>
              <Field label="Academic career">
                {textField("academicCareer")}
              </Field>
              <Field label="College">{textField("college")}</Field>
              <Field label="Total units">
                <Input
                  min="0.5"
                  onChange={(event) =>
                    updateSnapshot(
                      "totalUnits",
                      nullableNumber(event.target.value),
                    )
                  }
                  step="0.5"
                  type="number"
                  value={numberValue(projection.snapshot.totalUnits)}
                />
              </Field>
              <Field label="Duration in years">
                <Input
                  min="0.1"
                  onChange={(event) =>
                    updateSnapshot(
                      "durationYears",
                      nullableNumber(event.target.value),
                    )
                  }
                  step="0.1"
                  type="number"
                  value={numberValue(projection.snapshot.durationYears)}
                />
              </Field>
              <Field label="Delivery mode">{textField("deliveryMode")}</Field>
              <Field label="Study as">{textField("studyAs")}</Field>
              <Field label="Contact">{textField("contactText")}</Field>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h3 className="text-sm font-semibold text-zinc-950">
              Admissions and combinations
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Selection rank">
                <Input
                  max="100"
                  min="0"
                  onChange={(event) =>
                    updateSnapshot(
                      "selectionRank",
                      nullableNumber(event.target.value),
                    )
                  }
                  step="0.05"
                  type="number"
                  value={numberValue(projection.snapshot.selectionRank)}
                />
              </Field>
              <Field label="ATAR">
                <Input
                  max="100"
                  min="0"
                  onChange={(event) =>
                    updateSnapshot("atar", nullableNumber(event.target.value))
                  }
                  step="0.05"
                  type="number"
                  value={numberValue(projection.snapshot.atar)}
                />
              </Field>
              <Field label="Can combine">
                <Select
                  aria-label="Can combine"
                  onChange={(value) =>
                    updateSnapshot(
                      "canCombine",
                      value === "unknown" ? null : value === "yes",
                    )
                  }
                  options={[
                    { value: "unknown", label: "Not recorded" },
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  value={
                    projection.snapshot.canCombine === null
                      ? "unknown"
                      : projection.snapshot.canCombine
                        ? "yes"
                        : "no"
                  }
                />
              </Field>
              <Field label="Can combine vertically">
                <Select
                  aria-label="Can combine vertically"
                  onChange={(value) =>
                    updateSnapshot(
                      "canCombineVertical",
                      value === "unknown" ? null : value === "yes",
                    )
                  }
                  options={[
                    { value: "unknown", label: "Not recorded" },
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  value={
                    projection.snapshot.canCombineVertical === null
                      ? "unknown"
                      : projection.snapshot.canCombineVertical
                        ? "yes"
                        : "no"
                  }
                />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Introduction">
              {textField("introduction", { multiline: true })}
            </Field>
            <Field className="sm:col-span-2" label="Description">
              {textField("description", { multiline: true })}
            </Field>
          </div>
        </div>
      </section>

      <SummaryFieldsEditor
        onProjectionChange={setProjection}
        projection={projection}
      />

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
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
              variant="secondary"
            >
              <Plus aria-hidden="true" size={13} /> Add section
            </Button>
          }
          count={projection.sections.length}
        >
          Sections
        </CollectionHeader>
        <div className="space-y-3 p-5 sm:p-6">
          {projection.sections.map((section, index) => (
            <div
              className="rounded-lg border border-zinc-200 p-4"
              key={section.sectionKey}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Field label="Heading">
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
                  </Field>
                  <Field label="Section key">
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
                  </Field>
                </div>
                <IconButton
                  label={`Remove ${section.heading || "section"}`}
                  onClick={() =>
                    setProjection({
                      ...projection,
                      sections: projection.sections.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                  size="icon-sm"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </IconButton>
              </div>
              <Field className="mt-3" label="Content">
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

      <EvidenceEditor
        onProjectionChange={setProjection}
        projection={projection}
      />

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
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
              variant="secondary"
            >
              <Plus aria-hidden="true" size={13} /> Add outcome
            </Button>
          }
          count={projection.learningOutcomes.length}
        >
          Learning outcomes
        </CollectionHeader>
        <div className="space-y-3 p-5 sm:p-6">
          {projection.learningOutcomes.map((outcome, index) => (
            <div
              className="rounded-lg border border-zinc-200 p-4"
              key={`${outcome.position}-${index}`}
            >
              <div className="flex items-start gap-3">
                <Field
                  className="min-w-0 flex-1"
                  label={`Outcome ${index + 1}`}
                >
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
                </Field>
                <IconButton
                  label={`Remove outcome ${index + 1}`}
                  onClick={() =>
                    setProjection({
                      ...projection,
                      learningOutcomes: projection.learningOutcomes.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                  size="icon-sm"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </IconButton>
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

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <CollectionHeader
          action={
            <Button
              onClick={() =>
                setProjection({
                  ...projection,
                  fees: [
                    ...projection.fees,
                    {
                      position: projection.fees.length + 1,
                      feeYear: projection.academicYear,
                      audience: "other",
                      feeType: "other",
                      amount: null,
                      currency: null,
                      basis: "unknown",
                      sourceLabel: null,
                      sourceText: "",
                      sourceLocator: `manual:fee:${projection.fees.length + 1}`,
                    },
                  ],
                })
              }
              size="sm"
              variant="secondary"
            >
              <Plus aria-hidden="true" size={13} /> Add fee
            </Button>
          }
          count={projection.fees.length}
        >
          Fees
        </CollectionHeader>
        <div className="space-y-3 p-5 sm:p-6">
          {projection.fees.map((fee, index) => {
            const updateFee = (
              changes: Partial<(typeof projection.fees)[number]>,
            ) =>
              setProjection({
                ...projection,
                fees: projection.fees.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, ...changes } : item,
                ),
              });
            return (
              <div
                className="rounded-lg border border-zinc-200 p-4"
                key={`${fee.position}-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Audience">
                      <Select
                        aria-label="Fee audience"
                        onChange={(audience) => updateFee({ audience })}
                        options={[
                          { value: "domestic", label: "Domestic" },
                          { value: "international", label: "International" },
                          {
                            value: "commonwealth_supported",
                            label: "Commonwealth supported",
                          },
                          { value: "other", label: "Other" },
                        ]}
                        value={fee.audience}
                      />
                    </Field>
                    <Field label="Fee type">
                      <Select
                        aria-label="Fee type"
                        onChange={(feeType) => updateFee({ feeType })}
                        options={[
                          {
                            value: "student_contribution",
                            label: "Student contribution",
                          },
                          { value: "tuition", label: "Tuition" },
                          { value: "indicative", label: "Indicative" },
                          { value: "other", label: "Other" },
                        ]}
                        value={fee.feeType}
                      />
                    </Field>
                    <Field label="Amount">
                      <Input
                        min="0"
                        onChange={(event) =>
                          updateFee({
                            amount: nullableNumber(event.target.value),
                          })
                        }
                        step="0.01"
                        type="number"
                        value={numberValue(fee.amount)}
                      />
                    </Field>
                    <Field label="Currency">
                      <Select
                        aria-label="Fee currency"
                        onChange={(currency) =>
                          updateFee({
                            currency: currency === "unknown" ? null : "AUD",
                          })
                        }
                        options={[
                          { value: "unknown", label: "Not stated" },
                          { value: "AUD", label: "AUD" },
                        ]}
                        value={fee.currency ?? "unknown"}
                      />
                    </Field>
                    <Field label="Basis">
                      <Select
                        aria-label="Fee basis"
                        onChange={(basis) => updateFee({ basis })}
                        options={[
                          { value: "programme", label: "Programme" },
                          { value: "unit", label: "Per unit" },
                          { value: "eftsl", label: "Per EFTSL" },
                          { value: "annual", label: "Annual" },
                          { value: "unknown", label: "Not stated" },
                        ]}
                        value={fee.basis}
                      />
                    </Field>
                    <Field label="Fee year">
                      <Input
                        min="2000"
                        onChange={(event) =>
                          updateFee({
                            feeYear: nullableNumber(event.target.value),
                          })
                        }
                        step="1"
                        type="number"
                        value={numberValue(fee.feeYear)}
                      />
                    </Field>
                    <Field className="sm:col-span-2" label="Source label">
                      <Input
                        onChange={(event) =>
                          updateFee({
                            sourceLabel: nullableText(event.target.value),
                          })
                        }
                        value={fee.sourceLabel ?? ""}
                      />
                    </Field>
                  </div>
                  <IconButton
                    label={`Remove fee ${index + 1}`}
                    onClick={() =>
                      setProjection({
                        ...projection,
                        fees: projection.fees.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                    size="icon-sm"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </IconButton>
                </div>
                <ProvenanceFields
                  onLocatorChange={(sourceLocator) =>
                    updateFee({ sourceLocator })
                  }
                  onSourceTextChange={(sourceText) => updateFee({ sourceText })}
                  sourceLocator={fee.sourceLocator}
                  sourceText={fee.sourceText}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
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
              variant="secondary"
            >
              <Plus aria-hidden="true" size={13} /> Add relationship
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
                relationships: projection.relationships.map(
                  (item, itemIndex) =>
                    itemIndex === index ? { ...item, ...changes } : item,
                ),
              });
            return (
              <div
                className="rounded-lg border border-zinc-200 p-4"
                key={`${relationship.position}-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Relationship">
                      <Select
                        aria-label="Relationship kind"
                        onChange={(relationshipKind) =>
                          updateRelationship({ relationshipKind })
                        }
                        options={[
                          {
                            value: "source_reference",
                            label: "Source reference",
                          },
                          { value: "relevant", label: "Relevant" },
                          { value: "option", label: "Option" },
                          { value: "required", label: "Required" },
                          { value: "incompatible", label: "Incompatible" },
                          { value: "other", label: "Other" },
                        ]}
                        value={relationship.relationshipKind}
                      />
                    </Field>
                    <Field label="Target kind">
                      <Select
                        aria-label="Relationship target kind"
                        onChange={(targetKind) =>
                          updateRelationship({ targetKind, targetCode: "" })
                        }
                        options={[
                          ...structureKindOptions,
                          { value: "course", label: "Course" },
                        ]}
                        value={relationship.targetKind}
                      />
                    </Field>
                    <Field label="Target code">
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
                    </Field>
                    <Field label="Target title">
                      <Input
                        onChange={(event) =>
                          updateRelationship({
                            targetTitle: nullableText(event.target.value),
                          })
                        }
                        value={relationship.targetTitle ?? ""}
                      />
                    </Field>
                  </div>
                  <IconButton
                    label={`Remove relationship ${index + 1}`}
                    onClick={() =>
                      setProjection({
                        ...projection,
                        relationships: projection.relationships.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                    size="icon-sm"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </IconButton>
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

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
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
                variant="secondary"
              >
                <Plus aria-hidden="true" size={13} /> Add root group
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
            <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
              No structured requirement tree is saved.
            </p>
          )}

          <div className="mt-5 border-t border-zinc-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950">
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
                variant="secondary"
              >
                <Plus aria-hidden="true" size={13} /> Add wording
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
                  <IconButton
                    label={`Remove unmodelled requirement ${index + 1}`}
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
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <Alert tone="danger">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button disabled={saving} onClick={onCancel} variant="secondary">
          <X aria-hidden="true" size={15} /> Cancel
        </Button>
        <Button disabled={saving} type="submit" variant="primary">
          <Save aria-hidden="true" size={15} />
          {saving ? "Saving draft..." : "Save new draft"}
        </Button>
      </div>
    </form>
  );
}
