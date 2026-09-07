"use client";

import { useGraphColorMode } from "@/ui/common/use-graph-color-mode";
import { useMemo } from "react";
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { AcademicStructureManualSnapshotProjection as Projection } from "@/lib/structure-import/manual-snapshot";

export function StructureRequirementDiagram({
  projection,
}: {
  projection: Projection;
}) {
  const colorMode = useGraphColorMode();
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nextRow = 0;
    const seen = new Set<string>();
    function visit(key: string, depth: number) {
      // Imported trees are untrusted; a malformed cycle must not lock the viewer.
      if (seen.has(key)) return;
      seen.add(key);
      const group = projection.requirementGroups.find(
        (item) => item.key === key,
      );
      if (!group) return;
      const label =
        group.operator === "all_of"
          ? "Complete all"
          : group.operator === "minimum_count"
            ? `Complete at least ${group.minimumCount ?? 1}`
            : "Complete any";
      nodes.push({
        id: key,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: { x: depth * 320, y: nextRow++ * 110 },
        data: {
          label: `${group.title || "Requirements"} · ${label}${group.minimumUnits ? ` · ${group.minimumUnits} units` : ""}`,
        },
        style: {
          width: 265,
          background: "var(--card)",
          color: "var(--foreground)",
          borderColor: "var(--border)",
          borderRadius: 10,
        },
      });
      for (const child of projection.requirementGroups.filter(
        (item) => item.parentGroupKey === key,
      )) {
        edges.push({
          id: `${key}:${child.key}`,
          source: key,
          target: child.key,
          type: "smoothstep",
        });
        visit(child.key, depth + 1);
      }
      for (const condition of projection.requirementConditions.filter(
        (item) => item.groupKey === key,
      )) {
        const options = projection.requirementOptions
          .filter((item) => item.conditionKey === condition.key)
          .map((item) => item.optionCode);
        const quantity = [
          condition.minimumUnits !== null
            ? `At least ${condition.minimumUnits} units`
            : null,
          condition.maximumUnits !== null
            ? `Up to ${condition.maximumUnits} units`
            : null,
          condition.minimumCourses !== null
            ? `At least ${condition.minimumCourses} courses`
            : null,
          condition.minimumLevel !== null
            ? `Level ${condition.minimumLevel} or above`
            : null,
          condition.maximumLevel !== null
            ? `Up to level ${condition.maximumLevel}`
            : null,
          condition.subjectCode,
        ]
          .filter(Boolean)
          .join(" · ");
        const summary = options.length
          ? `${quantity ? `${quantity} from: ` : "Complete: "}${options.join(" / ")}`
          : [
              quantity,
              condition.freeText ||
                condition.sourceText ||
                condition.conditionKind.replaceAll("_", " "),
            ]
              .filter(Boolean)
              .join(" · ");
        nodes.push({
          id: condition.key,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          position: { x: (depth + 1) * 320, y: nextRow++ * 110 },
          data: { label: summary },
          style: {
            width: 265,
            background: "var(--card)",
            color: "var(--foreground)",
            borderColor: "var(--border)",
            borderRadius: 10,
            fontSize: 12,
          },
        });
        edges.push({
          id: `${key}:${condition.key}`,
          source: key,
          target: condition.key,
          type: "smoothstep",
        });
      }
    }
    if (projection.requirementRootKey) visit(projection.requirementRootKey, 0);
    return { nodes, edges };
  }, [projection]);
  if (!nodes.length)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        No requirements recorded.
      </p>
    );
  return (
    <div
      className="h-[36rem] overflow-hidden rounded-xl border border-border"
      aria-label="Requirement diagram"
    >
      <ReactFlow
        colorMode={colorMode}
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
