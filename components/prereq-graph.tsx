"use client";

import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { CoursePrerequisiteEdge } from "@/lib/coursemap/course-types";

const NODE_H = 46;
const GAP = 14;
const STEP = NODE_H + GAP;

type Layout = {
  columns: { label: string; codes: string[] }[];
  edges: CoursePrerequisiteEdge[];
  position: Map<string, { col: number; row: number }>;
  rows: number;
};

/**
 * Display the complete upstream chain and the direct courses this course
 * unlocks. The graph is intentionally descriptive: an imported reference is
 * not treated as a verified enrolment rule until its source has been reviewed.
 */
function buildLayout(
  code: string,
  prerequisiteEdges: readonly CoursePrerequisiteEdge[],
): Layout {
  const incoming = new Map<string, CoursePrerequisiteEdge[]>();
  for (const edge of prerequisiteEdges) {
    const existing = incoming.get(edge.to) ?? [];
    existing.push(edge);
    incoming.set(edge.to, existing);
  }

  const level = new Map<string, number>([[code, 0]]);
  const visitUpstream = (
    courseCode: string,
    depth: number,
    path: Set<string>,
  ) => {
    for (const edge of incoming.get(courseCode) ?? []) {
      if (path.has(edge.from)) continue;
      const nextDepth = depth - 1;
      const existing = level.get(edge.from);
      if (existing === undefined || nextDepth < existing) {
        level.set(edge.from, nextDepth);
      }
      visitUpstream(edge.from, nextDepth, new Set([...path, edge.from]));
    }
  };
  visitUpstream(code, 0, new Set([code]));

  for (const edge of prerequisiteEdges) {
    if (edge.from === code && edge.to !== code) {
      level.set(edge.to, 1);
    }
  }

  const minLevel = Math.min(-1, ...level.values());
  const maxLevel = Math.max(1, ...level.values());
  const columns = Array.from(
    { length: maxLevel - minLevel + 1 },
    (_, index) => {
      const columnLevel = index + minLevel;
      return {
        label:
          columnLevel === 0
            ? "This course"
            : columnLevel === 1
              ? "Unlocks"
              : columnLevel === -1
                ? "Requires"
                : "Then requires",
        codes: [...level.entries()]
          .filter(([, nodeLevel]) => nodeLevel === columnLevel)
          .map(([courseCode]) => courseCode)
          .sort(),
      };
    },
  );
  const position = new Map<string, { col: number; row: number }>();
  columns.forEach((column, col) =>
    column.codes.forEach((item, row) => position.set(item, { col, row })),
  );
  const edges = prerequisiteEdges.filter(
    (edge) => position.has(edge.from) && position.has(edge.to),
  );

  return {
    columns,
    edges,
    position,
    rows: Math.max(1, ...columns.map((column) => column.codes.length)),
  };
}

export function PrereqGraph({
  academicYear,
  code,
  prerequisiteEdges,
  completedCodes,
  plannedCodes,
}: {
  academicYear: number;
  code: string;
  prerequisiteEdges: readonly CoursePrerequisiteEdge[];
  completedCodes: ReadonlySet<string>;
  plannedCodes: ReadonlySet<string>;
}) {
  const layout = useMemo(
    () => buildLayout(code, prerequisiteEdges),
    [code, prerequisiteEdges],
  );
  const { columns, edges, position, rows } = layout;
  const height = rows * STEP - GAP;
  const columnCount = columns.length;
  const availability = new Map<string, boolean>([[code, true]]);
  for (const edge of prerequisiteEdges) {
    availability.set(
      edge.from,
      availability.get(edge.from) === true || edge.fromIsAvailable,
    );
    availability.set(
      edge.to,
      availability.get(edge.to) === true || edge.toIsAvailable,
    );
  }

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
    <div className="overflow-x-auto px-5 pb-5">
      <div className="min-w-[34rem]">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((column, index) => (
            <p
              key={index}
              className="pb-2 text-center text-[10px] font-bold tracking-wider text-zinc-400 uppercase"
            >
              {column.label}
            </p>
          ))}
        </div>

        <div className="relative" style={{ height }}>
          <svg
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {edges.map((edge) => {
              const x1 = xOf(edge.from);
              const x2 = xOf(edge.to);
              const y1 = yOf(edge.from);
              const y2 = yOf(edge.to);
              const mid = (x1 + x2) / 2;
              const touches = edge.from === code || edge.to === code;
              const completedPath =
                completedCodes.has(edge.from) && completedCodes.has(edge.to);
              return (
                <path
                  key={`${edge.from}:${edge.to}`}
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
            className="relative grid h-full gap-4"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {columns.map((column, colIndex) => {
              const colRows = column.codes.length;
              const offset = (height - (colRows * STEP - GAP)) / 2;
              return (
                <div key={colIndex} className="relative">
                  {column.codes.length === 0 && (
                    <div
                      style={{ top: (height - NODE_H) / 2, height: NODE_H }}
                      className="absolute inset-x-0 mx-auto flex w-full max-w-36 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-2 text-center text-[10px] font-medium text-zinc-400"
                    >
                      {column.label === "Unlocks"
                        ? "No imported unlocks yet"
                        : "No prerequisite listed"}
                    </div>
                  )}
                  {column.codes.map((item, row) => {
                    const isCurrent = item === code;
                    const isAvailable = availability.get(item) === true;
                    const isCompleted = completedCodes.has(item);
                    const isPlanned = plannedCodes.has(item);
                    const nodeClassName = cn(
                      "absolute inset-x-0 mx-auto flex w-full max-w-36 items-center justify-center gap-1.5 rounded-lg px-2 font-mono text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                      isCompleted
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : isCurrent
                          ? "bg-brand-600 text-white shadow-sm"
                          : !isAvailable
                            ? "cursor-not-allowed bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200"
                            : isPlanned
                              ? "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300"
                              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 hover:ring-rose-300",
                    );
                    const content = (
                      <>
                        {isCompleted && <Check size={12} strokeWidth={2.5} />}
                        <span>{item}</span>
                        {!isAvailable && (
                          <span className="sr-only">Not imported yet</span>
                        )}
                      </>
                    );
                    const style = { top: offset + row * STEP, height: NODE_H };

                    if (isCurrent) {
                      return (
                        <span
                          key={item}
                          style={style}
                          aria-current="page"
                          className={nodeClassName}
                        >
                          {content}
                        </span>
                      );
                    }
                    if (!isAvailable) {
                      return (
                        <span
                          key={item}
                          style={style}
                          title={`${item} has not been imported yet`}
                          className={nodeClassName}
                        >
                          <LockKeyhole size={11} aria-hidden="true" />
                          {content}
                        </span>
                      );
                    }
                    return (
                      <Link
                        key={item}
                        href={`/courses/${item}?year=${academicYear}`}
                        prefetch={false}
                        style={style}
                        className={nodeClassName}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-zinc-500">
        Imported courses are links. Locked courses are known references that
        have not been imported yet.
      </p>
    </div>
  );
}
