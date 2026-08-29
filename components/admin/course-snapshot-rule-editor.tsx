"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AutomaticMapping } from "@/components/admin/requisite-automatic-mapping";
import { RequisiteRuleTree } from "@/components/admin/requisite-rule-tree";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CourseSnapshotProjectionData } from "@/lib/course-import/project-snapshot";
import { parseCourseSnapshotProjection } from "@/lib/course-import/snapshot-projection-contract";
import {
  conditionSourceText,
  createEmptyTree,
  reviewedTreeFromExpression,
  validateReviewedTree,
  type ReviewedConditionNode,
  type ReviewedGroupNode,
  type ReviewedRuleTree,
} from "@/lib/coursemap/requisite-conditions";
import { parseRequisiteSummary } from "@/lib/coursemap/requisite-summary";

const RequisiteRuleGraph = dynamic(
  () =>
    import("@/components/admin/requisite-rule-graph").then(
      (module) => module.RequisiteRuleGraph,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[30rem] place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        Loading the diagram...
      </div>
    ),
  },
);

export type EditableRuleKind =
  | "prerequisite"
  | "corequisite"
  | "incompatibility"
  | "permission"
  | "assumed_knowledge";

const supportedConditionKinds = new Set([
  "course",
  "incompatible",
  "units_total",
  "subject_units",
  "level_units",
  "permission",
  "admission",
  "gpa",
  "other",
]);

function conditionFromProjection(
  condition: CourseSnapshotProjectionData["ruleConditions"][number],
): ReviewedConditionNode | null {
  if (!supportedConditionKinds.has(condition.conditionKind)) return null;
  const base = {
    type: "condition" as const,
    id: condition.key,
  };
  switch (condition.conditionKind) {
    case "course":
      return condition.requiredCourseCode
        ? {
            ...base,
            kind: "course",
            courseCode: condition.requiredCourseCode,
            courseRequirementMode:
              condition.courseRequirementMode ?? "completed",
            mark: condition.minimumMark,
          }
        : null;
    case "incompatible":
      return condition.requiredCourseCode
        ? {
            ...base,
            kind: "incompatible",
            courseCode: condition.requiredCourseCode,
          }
        : null;
    case "admission":
      return {
        ...base,
        kind: "admission",
        structureCode: condition.requiredStructureCode,
        freeText: condition.freeText,
      };
    case "units_total":
      return { ...base, kind: "units_total", units: condition.minimumUnits };
    case "subject_units":
      return {
        ...base,
        kind: "subject_units",
        units: condition.minimumUnits,
        subjectCode: condition.subjectCode,
      };
    case "level_units":
      return {
        ...base,
        kind: "level_units",
        units: condition.minimumUnits,
        level: condition.minimumCourseLevel,
        subjectCode: condition.subjectCode,
      };
    case "gpa":
      return { ...base, kind: "gpa", gpa: condition.minimumGpa };
    case "permission":
      return { ...base, kind: "permission", freeText: condition.freeText };
    case "other":
      return { ...base, kind: "other", freeText: condition.freeText };
    default:
      return null;
  }
}

function ruleTreeFromProjection(
  projection: CourseSnapshotProjectionData,
  kind: EditableRuleKind,
) {
  const groups = projection.ruleGroups.filter(
    (group) => group.ruleKey === kind,
  );
  const conditions = projection.ruleConditions.filter(
    (condition) => condition.ruleKey === kind,
  );
  const unsupported = conditions.filter(
    (condition) => !supportedConditionKinds.has(condition.conditionKind),
  );
  const root = groups.find((group) => group.parentGroupKey === null);
  if (!root) {
    return {
      tree: createEmptyTree(`${kind}-root`),
      unsupportedKinds: unsupported.map((row) => row.conditionKind),
    };
  }

  function groupToTree(
    group: CourseSnapshotProjectionData["ruleGroups"][number],
  ): ReviewedGroupNode {
    const children = [
      ...groups
        .filter((candidate) => candidate.parentGroupKey === group.key)
        .map((candidate) => ({
          position: candidate.position,
          node: groupToTree(candidate),
        })),
      ...conditions
        .filter((condition) => condition.groupKey === group.key)
        .flatMap((condition) => {
          const node = conditionFromProjection(condition);
          return node ? [{ position: condition.position, node }] : [];
        }),
    ]
      .sort((left, right) => left.position - right.position)
      .map((entry) => entry.node);
    return {
      type: "group",
      id: group.key,
      operator: group.operator,
      minimumCount: group.minimumCount,
      children,
    };
  }

  return {
    tree: groupToTree(root),
    unsupportedKinds: unsupported.map((row) => row.conditionKind),
  };
}

function conditionProjection(
  condition: ReviewedConditionNode,
  input: {
    groupKey: string;
    hardness: "hard" | "advisory";
    key: string;
    kind: EditableRuleKind;
    position: number;
  },
): CourseSnapshotProjectionData["ruleConditions"][number] {
  const sourceText = conditionSourceText(condition);
  return {
    key: input.key,
    ruleKey: input.kind,
    groupKey: input.groupKey,
    position: input.position,
    conditionKind: condition.kind,
    requiredCourseCode:
      condition.kind === "course" || condition.kind === "incompatible"
        ? (condition.courseCode ?? null)
        : null,
    requiredStructureCode:
      condition.kind === "admission" ? (condition.structureCode ?? null) : null,
    minimumUnits:
      condition.kind === "units_total" ||
      condition.kind === "subject_units" ||
      condition.kind === "level_units"
        ? (condition.units ?? null)
        : null,
    minimumMark: condition.kind === "course" ? (condition.mark ?? null) : null,
    subjectCode:
      condition.kind === "subject_units" || condition.kind === "level_units"
        ? (condition.subjectCode ?? null)
        : null,
    minimumCourseLevel:
      condition.kind === "level_units" ? (condition.level ?? null) : null,
    maximumCourseLevel:
      condition.kind === "level_units" && condition.level != null
        ? condition.level + 999
        : null,
    minimumGpa: condition.kind === "gpa" ? (condition.gpa ?? null) : null,
    minimumYear: null,
    minimumWam: null,
    freeText:
      condition.kind === "admission" ||
      condition.kind === "permission" ||
      condition.kind === "other"
        ? (condition.freeText ?? null)
        : null,
    courseRequirementMode:
      condition.kind === "course"
        ? (condition.courseRequirementMode ?? "completed")
        : null,
    hardness: input.hardness,
    sourceText,
  };
}

export function applyRuleTreeToProjection({
  hardness,
  kind,
  projection,
  sourceText,
  tree,
}: {
  hardness: "hard" | "advisory";
  kind: EditableRuleKind;
  projection: CourseSnapshotProjectionData;
  sourceText: string;
  tree: ReviewedRuleTree;
}) {
  const next = structuredClone(projection);
  const previousConditionKeys = new Set(
    next.ruleConditions
      .filter((condition) => condition.ruleKey === kind)
      .map((condition) => condition.key),
  );
  next.rules = next.rules.filter((rule) => rule.ruleKind !== kind);
  next.ruleGroups = next.ruleGroups.filter((group) => group.ruleKey !== kind);
  next.ruleConditions = next.ruleConditions.filter(
    (condition) => condition.ruleKey !== kind,
  );
  next.ruleConditionCourses = next.ruleConditionCourses.filter(
    (member) => !previousConditionKeys.has(member.conditionKey),
  );
  next.ruleCourseReferences = next.ruleCourseReferences.filter(
    (reference) => reference.ruleKey !== kind,
  );
  next.rules.push({ key: kind, ruleKind: kind, hardness, sourceText });

  const referencedCodes = new Set<string>();
  function visitGroup(
    group: ReviewedGroupNode,
    parentGroupKey: string | null,
    path: number[],
    position: number,
  ) {
    const suffix = path.length ? path.join("-") : "root";
    const groupKey = `${kind}-group-${suffix}`;
    next.ruleGroups.push({
      key: groupKey,
      ruleKey: kind,
      parentGroupKey,
      operator: group.operator,
      minimumCount: group.operator === "at_least" ? group.minimumCount : null,
      position,
    });
    group.children.forEach((child, childPosition) => {
      if (child.type === "group") {
        visitGroup(child, groupKey, [...path, childPosition], childPosition);
        return;
      }
      const conditionKey = `${kind}-condition-${[...path, childPosition].join("-") || "root"}`;
      next.ruleConditions.push(
        conditionProjection(child, {
          groupKey,
          hardness,
          key: conditionKey,
          kind,
          position: childPosition,
        }),
      );
      if (child.courseCode) referencedCodes.add(child.courseCode);
    });
  }
  visitGroup(tree, null, [], 0);
  next.ruleCourseReferences.push(
    ...[...referencedCodes].sort().map((referencedCourseCode) => ({
      ruleKey: kind,
      referencedCourseCode,
      sourceText: referencedCourseCode,
    })),
  );
  return parseCourseSnapshotProjection(next);
}

export function CourseSnapshotRuleEditor({
  canEdit,
  kind,
  onCancel,
  onSave,
  projection,
}: {
  canEdit: boolean;
  kind: EditableRuleKind;
  onCancel: () => void;
  onSave: (projection: CourseSnapshotProjectionData) => Promise<void>;
  projection: CourseSnapshotProjectionData;
}) {
  const existingRule = projection.rules.find((rule) => rule.ruleKind === kind);
  const initial = useMemo(
    () => ruleTreeFromProjection(projection, kind),
    [kind, projection],
  );
  const [tree, setTree] = useState(initial.tree);
  const [sourceText, setSourceText] = useState(existingRule?.sourceText ?? "");
  const [hardness, setHardness] = useState<"hard" | "advisory">(
    existingRule?.hardness ??
      (kind === "assumed_knowledge" ? "advisory" : "hard"),
  );
  const [view, setView] = useState<"tree" | "graph">("tree");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expression = useMemo(
    () => parseRequisiteSummary(sourceText),
    [sourceText],
  );
  const codes = useMemo(
    () => [...new Set(sourceText.match(/\b[A-Z]{4}\d{4}[A-Z]?\b/gu) ?? [])],
    [sourceText],
  );

  async function save() {
    setError(null);
    if (!sourceText.trim()) {
      setError("Source wording is required.");
      return;
    }
    const validated = validateReviewedTree(tree);
    if ("message" in validated) {
      setError(validated.message);
      return;
    }
    if (validated.tree.children.length === 0) {
      setError("Add at least one condition.");
      return;
    }
    try {
      const next = applyRuleTreeToProjection({
        hardness,
        kind,
        projection,
        sourceText: sourceText.trim(),
        tree: validated.tree,
      });
      setSaving(true);
      await onSave(next);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The rule tree could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 px-5 py-5 sm:px-6">
      {initial.unsupportedKinds.length > 0 ? (
        <Alert tone="warning">
          <AlertDescription>
            This rule contains advanced conditions (
            {[...new Set(initial.unsupportedKinds)].join(", ")}) that the visual
            editor cannot change yet. Use All fields to preserve and edit the
            full relational JSON.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label="Original ANU wording">
          <Textarea
            className="min-h-24"
            disabled={!canEdit}
            onChange={(event) => setSourceText(event.target.value)}
            value={sourceText}
          />
        </Field>
        <Field label="Rule strength">
          <Select
            aria-label="Rule strength"
            disabled={!canEdit}
            onChange={setHardness}
            options={[
              { value: "hard", label: "Hard requirement" },
              { value: "advisory", label: "Advisory" },
            ]}
            value={hardness}
          />
        </Field>
      </div>

      <AutomaticMapping
        canApply={canEdit && initial.unsupportedKinds.length === 0}
        codes={codes}
        expression={expression}
        onApply={() => {
          if (expression) setTree(reviewedTreeFromExpression(expression));
        }}
      />

      <Tabs
        onValueChange={(value) => setView(value === "graph" ? "graph" : "tree")}
        value={view}
      >
        <TabsList aria-label="Condition view">
          <TabsTrigger value="tree">List</TabsTrigger>
          <TabsTrigger value="graph">Diagram</TabsTrigger>
        </TabsList>
        <TabsContent value="tree">
          <RequisiteRuleTree
            canEdit={canEdit && initial.unsupportedKinds.length === 0}
            onChange={setTree}
            tree={tree}
          />
        </TabsContent>
        <TabsContent value="graph">
          <RequisiteRuleGraph
            canEdit={canEdit && initial.unsupportedKinds.length === 0}
            onChange={setTree}
            tree={tree}
          />
        </TabsContent>
      </Tabs>

      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Button disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!canEdit || saving || initial.unsupportedKinds.length > 0}
          onClick={() => void save()}
          variant="primary"
        >
          {saving ? "Saving..." : "Save rule as new draft snapshot"}
        </Button>
      </div>
    </div>
  );
}
