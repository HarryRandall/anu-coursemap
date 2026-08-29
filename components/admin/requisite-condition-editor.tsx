"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  confirmCourseRuleSource,
  saveCourseRuleConditions,
} from "@/lib/coursemap/catalogue-rule-actions";
import {
  createEmptyTree,
  reviewedTreeFromExpression,
  type ReviewedRuleTree,
} from "@/lib/coursemap/requisite-conditions";
import { parseRequisiteSummary } from "@/lib/coursemap/requisite-summary";
import { AutomaticMapping } from "@/components/admin/requisite-automatic-mapping";
import { RequisiteRuleTree } from "@/components/admin/requisite-rule-tree";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export function RequisiteConditionEditor({
  canEdit,
  catalogueYear,
  code,
  onMessage,
  reviewed,
  ruleId,
  sourceChanged,
  sourceText,
}: {
  canEdit: boolean;
  catalogueYear: number;
  code: string;
  onMessage: (message: { text: string; tone: "success" | "danger" }) => void;
  reviewed: ReviewedRuleTree | null;
  ruleId: number;
  sourceChanged: boolean;
  sourceText: string;
}) {
  const router = useRouter();
  const expression = useMemo(
    () => parseRequisiteSummary(sourceText),
    [sourceText],
  );
  const codes = useMemo(
    () => [...new Set(sourceText.match(/\b[A-Z]{4}\d{4}[A-Z]?\b/gu) ?? [])],
    [sourceText],
  );
  // An unreviewed rule opens on the importer's reading rather than a blank
  // canvas, so reviewing usually means confirming rather than retyping.
  const [tree, setTree] = useState<ReviewedRuleTree>(
    () =>
      reviewed ??
      (expression ? reviewedTreeFromExpression(expression) : createEmptyTree()),
  );
  const [view, setView] = useState<"tree" | "graph">("tree");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await saveCourseRuleConditions({
      catalogueYear,
      code,
      ruleId,
      tree,
    });
    setSaving(false);
    onMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) router.refresh();
  }

  async function confirmSource() {
    setSaving(true);
    const result = await confirmCourseRuleSource({
      catalogueYear,
      code,
      ruleId,
    });
    setSaving(false);
    onMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      {sourceChanged ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-amber-200 bg-amber-50 py-1.5 pr-1.5 pl-2.5 text-sm text-amber-950">
          <span className="min-w-0 flex-1">
            The ANU wording changed and the saved conditions were kept.
          </span>
          {canEdit ? (
            <Button
              disabled={saving}
              onClick={() => void confirmSource()}
              size="sm"
            >
              Still correct
            </Button>
          ) : null}
        </div>
      ) : null}

      <AutomaticMapping
        canApply={canEdit}
        codes={codes}
        expression={expression}
        onApply={() =>
          setTree(expression ? reviewedTreeFromExpression(expression) : tree)
        }
      />

      <Tabs
        onValueChange={(value) => setView(value === "graph" ? "graph" : "tree")}
        value={view}
      >
        <div className="flex flex-wrap items-center gap-2">
          <TabsList aria-label="Condition view">
            <TabsTrigger value="tree">List</TabsTrigger>
            <TabsTrigger value="graph">Diagram</TabsTrigger>
          </TabsList>
          {canEdit ? (
            <Button
              className="ml-auto"
              disabled={saving}
              onClick={() => void save()}
              size="sm"
              variant="primary"
            >
              {saving ? "Saving..." : "Save conditions"}
            </Button>
          ) : null}
        </div>
        <TabsContent value="tree">
          <RequisiteRuleTree canEdit={canEdit} onChange={setTree} tree={tree} />
        </TabsContent>
        <TabsContent value="graph">
          <RequisiteRuleGraph
            canEdit={canEdit}
            onChange={setTree}
            tree={tree}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
