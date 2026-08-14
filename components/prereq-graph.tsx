"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { courseByCode, courses } from "@/lib/catalogue";

const NODE_H = 38;
const GAP = 12;
const STEP = NODE_H + GAP;

type Layout = {
  columns: { label: string; codes: string[] }[];
  /** column index + row index per code */
  position: Map<string, { col: number; row: number }>;
  edges: { from: string; to: string }[];
  rows: number;
};

/**
 * Layered prerequisite graph for one course: the full upstream chain on the
 * left, the course itself, then everything it unlocks on the right.
 */
function buildLayout(code: string): Layout {
  // Walk upstream — level 0 is the course, prerequisites go negative.
  const level = new Map<string, number>([[code, 0]]);
  const visit = (current: string) => {
    const course = courseByCode(current);
    if (!course) return;
    for (const prereq of course.prerequisiteCodes) {
      const proposed = (level.get(current) ?? 0) - 1;
      if (!level.has(prereq) || proposed < (level.get(prereq) as number)) {
        level.set(prereq, proposed);
        visit(prereq);
      }
    }
  };
  visit(code);

  const unlocks = courses
    .filter((course) => course.prerequisiteCodes.includes(code))
    .map((course) => course.code);
  unlocks.forEach((unlock) => level.set(unlock, 1));

  const minLevel = Math.min(-1, ...level.values());
  const maxLevel = Math.max(...level.values());
  const columnCount = maxLevel - minLevel + 1;

  const columns = Array.from({ length: columnCount }, (_, index) => {
    const lvl = index + minLevel;
    return {
      label: lvl === 0 ? "This course" : lvl === 1 ? "Unlocks" : lvl === -1 ? "Requires" : "Then requires",
      codes: [...level.entries()]
        .filter(([, value]) => value === lvl)
        .map(([key]) => key)
        .sort(),
    };
  });

  const position = new Map<string, { col: number; row: number }>();
  columns.forEach((column, col) =>
    column.codes.forEach((item, row) => position.set(item, { col, row })),
  );

  const inGraph = new Set(level.keys());
  const edges: { from: string; to: string }[] = [];
  for (const item of inGraph) {
    const course = courseByCode(item);
    if (!course) continue;
    for (const prereq of course.prerequisiteCodes) {
      if (inGraph.has(prereq)) edges.push({ from: prereq, to: item });
    }
  }

  const rows = Math.max(...columns.map((column) => column.codes.length));
  return { columns, position, edges, rows };
}

export function PrereqGraph({
  code,
  completedCodes,
  plannedCodes,
}: {
  code: string;
  completedCodes: ReadonlySet<string>;
  plannedCodes: ReadonlySet<string>;
}) {
  const router = useRouter();
  const layout = useMemo(() => buildLayout(code), [code]);
  const { columns, position, edges, rows } = layout;
  const height = rows * STEP - GAP;
  const columnCount = columns.length;

  if (columnCount === 1) {
    return (
      <p className="px-5 py-8 text-center text-[12px] text-zinc-400">
        No prerequisites, and nothing in the catalogue depends on this course yet.
      </p>
    );
  }

  // Centre each column vertically; y is the node centre in px.
  const yOf = (item: string) => {
    const spot = position.get(item);
    if (!spot) return 0;
    const colRows = columns[spot.col].codes.length;
    const offset = (height - (colRows * STEP - GAP)) / 2;
    return offset + spot.row * STEP + NODE_H / 2;
  };
  const xOf = (item: string) => {
    const spot = position.get(item);
    return spot ? ((spot.col + 0.5) / columnCount) * 100 : 0;
  };

  return (
    <div className="px-5 pb-5">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {columns.map((column, index) => (
          <p
            key={index}
            className="pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400"
          >
            {column.label}
          </p>
        ))}
      </div>

      <div className="relative" style={{ height }}>
        {/* Edges live behind the nodes */}
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {edges.map((edge, index) => {
            const x1 = xOf(edge.from);
            const x2 = xOf(edge.to);
            const y1 = yOf(edge.from);
            const y2 = yOf(edge.to);
            const mid = (x1 + x2) / 2;
            const touches = edge.from === code || edge.to === code;
            const completedPath = completedCodes.has(edge.from) && completedCodes.has(edge.to);
            return (
              <path
                key={index}
                d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className={
                  completedPath
                    ? "stroke-emerald-400"
                    : touches
                      ? "stroke-brand-400"
                      : "stroke-zinc-300"
                }
                strokeWidth={completedPath || touches ? 1.75 : 1.25}
              />
            );
          })}
        </svg>

        <div
          className="pointer-events-none absolute inset-0 grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {columns.map((column, index) => (
            <div key={index} className="relative">
              {column.label === "Requires" && column.codes.length === 0 && (
                <span
                  data-testid="empty-prerequisite-edge"
                  className="absolute h-px bg-zinc-300"
                  style={{
                    left: "calc(50% + 4rem)",
                    top: height / 2,
                    width: "calc(100% + 1rem - 8rem)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Nodes */}
        <div
          className="relative grid h-full gap-4"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {columns.map((column, colIndex) => {
            const colRows = column.codes.length;
            const offset = (height - (colRows * STEP - GAP)) / 2;
            return (
              <div key={colIndex} className="relative">
                {column.codes.length === 0 && (
                  <div
                    aria-label="No prerequisite courses"
                    style={{ top: (height - NODE_H) / 2, height: NODE_H }}
                    className="absolute inset-x-0 mx-auto flex w-full max-w-32 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 text-[10px] font-medium text-zinc-400"
                  >
                    No prerequisite
                  </div>
                )}
                {column.codes.map((item, row) => {
                  const isCurrent = item === code;
                  const isCompleted = completedCodes.has(item);
                  const isPlanned = plannedCodes.has(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => router.push(`/courses/${item}`)}
                      title={courseByCode(item)?.name}
                      style={{ top: offset + row * STEP, height: NODE_H }}
                      className={cn(
                        "absolute inset-x-0 mx-auto flex w-full max-w-32 items-center justify-center gap-1.5 rounded-lg font-mono text-[11px] font-medium transition",
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : isCurrent
                            ? "bg-brand-600 text-white shadow-sm"
                            : isPlanned
                              ? "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300"
                              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 hover:ring-rose-300",
                      )}
                    >
                      {isCompleted && <Check size={12} strokeWidth={2.5} />}
                      {item}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-zinc-400">
        Click any course to see its own chain
      </p>
    </div>
  );
}
