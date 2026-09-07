"use client";
import { Button } from "@coursemap/ui/primitives/button";
import { Field } from "@coursemap/ui/primitives/field";
import { Input } from "@coursemap/ui/primitives/input";
import { Textarea } from "@coursemap/ui/primitives/textarea";
import { OptionPicker } from "@/ui/common/option-picker";
import { Plus, Trash2 } from "lucide-react";
import {
  nullableText,
  nullableNumber,
  numberValue,
  nextKey,
  nextChildPosition,
  type Group,
  type Projection,
} from "./editor-utils";
import { ProvenanceFields } from "./source-fields-editor";
import { RequirementConditionEditor } from "./requirement-condition-editor";

export function RequirementGroupEditor({
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
          ? "rounded-xl border border-border bg-muted/50 p-4 sm:p-5"
          : "rounded-lg border border-border bg-muted/30 p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {depth === 0 ? "Root group" : "Nested group"}
          </p>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {group.key}
          </p>
        </div>
        <Button
          onClick={remove}
          size="icon-sm"
          variant="outline"
          aria-label={"Remove group"}
          title={"Remove group"}
          type="button"
        >
          <Trash2 aria-hidden="true" size={14} />
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Group title"}</span>
            <Input
              onChange={(event) =>
                update({ title: nullableText(event.target.value) })
              }
              value={group.title ?? ""}
            />
          </label>
        </Field>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Operator"}</span>
            <OptionPicker
              value={"coursemap:" + String(group.operator)}
              onValueChange={(nextValue) => {
                const option = (
                  [
                    { value: "all_of", label: "Complete all" },
                    { value: "any_of", label: "Complete any" },
                    { value: "minimum_count", label: "Minimum number" },
                  ] as const
                ).find(
                  (option) => "coursemap:" + String(option.value) === nextValue,
                );
                if (option)
                  ((operator) =>
                    update({
                      operator,
                      minimumCount:
                        operator === "minimum_count"
                          ? (group.minimumCount ?? 1)
                          : null,
                    }))(option.value);
              }}
              aria-label={"Group operator"}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder={"Select..."}
              items={[
                { value: "all_of", label: "Complete all" },
                { value: "any_of", label: "Complete any" },
                { value: "minimum_count", label: "Minimum number" },
              ].map((option) => ({
                value: "coursemap:" + String(option.value),
                label: option.label,
              }))}
            />
          </label>
        </Field>
        {group.operator === "minimum_count" ? (
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Minimum number"}</span>
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
            </label>
          </Field>
        ) : null}
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Minimum units"}</span>
            <Input
              min="0.5"
              onChange={(event) =>
                update({ minimumUnits: nullableNumber(event.target.value) })
              }
              step="0.5"
              type="number"
              value={numberValue(group.minimumUnits)}
            />
          </label>
        </Field>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Maximum units"}</span>
            <Input
              min="0.5"
              onChange={(event) =>
                update({ maximumUnits: nullableNumber(event.target.value) })
              }
              step="0.5"
              type="number"
              value={numberValue(group.maximumUnits)}
            />
          </label>
        </Field>
        <Field className="sm:col-span-2 lg:col-span-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Description"}</span>
            <Textarea
              className="min-h-20"
              onChange={(event) =>
                update({ description: nullableText(event.target.value) })
              }
              value={group.description ?? ""}
            />
          </label>
        </Field>
      </div>
      <ProvenanceFields
        onLocatorChange={(sourceLocator) => update({ sourceLocator })}
        onSourceTextChange={(sourceText) => update({ sourceText })}
        sourceLocator={group.sourceLocator}
        sourceText={group.sourceText}
      />

      <div className="mt-4 space-y-3 border-l-2 border-border pl-3 sm:pl-4">
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
          <p className="rounded-lg border border-dashed border-input bg-card px-4 py-5 text-sm text-muted-foreground">
            Add a condition or nested group before saving.
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={addCondition}
          size="sm"
          variant="outline"
          type="button"
        >
          <Plus aria-hidden="true" size={13} />
          Add condition
        </Button>
        <Button onClick={addGroup} size="sm" variant="outline" type="button">
          <Plus aria-hidden="true" size={13} />
          Add nested group
        </Button>
      </div>
    </div>
  );
}
