"use client";

import { Network } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { relations } from "@/lib/catalogue";

const NODE_H = 40;
const GAP = 12;
const STEP = NODE_H + GAP;

const isCourseCode = (value: string) => /^[A-Z]{4}\d{4}$/.test(value);

/**
 * Bipartite prerequisite graph derived from the relation records.
 * Edges are real SVG paths; clicking a node highlights its edges and
 * filters the underlying table query.
 */
export function RelationGraph({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (code: string) => void;
}) {
  const { left, right, edges } = useMemo(() => {
    const prereqEdges = relations.filter(
      (relation) =>
        relation.relation === "Prerequisite" &&
        isCourseCode(relation.source) &&
        isCourseCode(relation.target),
    );
    // Left column: prerequisites. Right column: the courses that need them.
    const left = [...new Set(prereqEdges.map((edge) => edge.target))];
    const right = [...new Set(prereqEdges.map((edge) => edge.source))];
    return { left, right, edges: prereqEdges };
  }, []);

  const rows = Math.max(left.length, right.length);
  const height = rows * STEP - GAP;
  const yOf = (index: number) => index * STEP + NODE_H / 2;

  const nodeButton = (code: string, side: "left" | "right") => {
    const isActive = active === code;
    const isConnected =
      active !== "" &&
      edges.some(
        (edge) =>
          (edge.source === active && edge.target === code) ||
          (edge.target === active && edge.source === code),
      );
    return (
      <button
        key={code}
        type="button"
        onClick={() => onSelect(code)}
        style={{ height: NODE_H, marginBottom: GAP }}
        className={cn(
          "w-full rounded-lg font-mono text-[11px] font-medium transition",
          side === "left" ? "bg-white" : "bg-zinc-50",
          isActive
            ? "bg-brand-50 text-brand-700 ring-2 ring-brand-400"
            : isConnected
              ? "text-zinc-900 ring-1 ring-brand-300"
              : "text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300",
        )}
      >
        {code}
      </button>
    );
  };

  return (
    <div className="p-6 sm:p-10">
      <div className="mx-auto flex max-w-xl items-start">
        <div className="w-28 shrink-0 sm:w-32">
          <p className="h-8 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Prerequisite
          </p>
          {left.map((code) => nodeButton(code, "left"))}
        </div>

        <div className="min-w-16 flex-1 pt-8">
          <svg
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            style={{ height }}
            className="w-full"
            role="img"
            aria-label="Prerequisite relationships"
          >
            {edges.map((edge) => {
              const yL = yOf(left.indexOf(edge.target));
              const yR = yOf(right.indexOf(edge.source));
              const isActive =
                active !== "" && (edge.source === active || edge.target === active);
              return (
                <path
                  key={edge.id}
                  d={`M 0 ${yL} C 50 ${yL}, 50 ${yR}, 100 ${yR}`}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  className={cn(
                    "transition-[stroke]",
                    isActive ? "stroke-brand-500" : active ? "stroke-zinc-200" : "stroke-zinc-300",
                  )}
                  strokeWidth={isActive ? 2 : 1.25}
                />
              );
            })}
          </svg>
        </div>

        <div className="w-28 shrink-0 sm:w-32">
          <p className="h-8 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Unlocks
          </p>
          {right.map((code) => nodeButton(code, "right"))}
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-400">
        <Network size={12} />
        {edges.length} prerequisite edges · click a node to explore its links
      </p>
    </div>
  );
}
