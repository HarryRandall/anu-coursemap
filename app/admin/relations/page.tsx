"use client";

import {
  Check,
  GitBranch,
  Network,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { RelationGraph } from "@/components/admin/relation-graph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { parseTone } from "@/lib/ui";
import { Relation, relations } from "@/lib/catalogue";

const isCourseCode = (value: string) => /^[A-Z]{4}\d{4}$/.test(value);

export default function AdminRelationsPage() {
  const { notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [relationType, setRelationType] = useState("All relations");
  const [reviewState, setReviewState] = useState("All states");
  const [selected, setSelected] = useState<Relation | null>(relations[1]);
  const [graphCourse, setGraphCourse] = useState<string | null>(null);

  const types = [...new Set(relations.map((item) => item.relation))];
  const filtered = useMemo(
    () =>
      relations.filter(
        (item) =>
          `${item.source} ${item.target} ${item.sourceText}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (relationType === "All relations" ||
            item.relation === relationType) &&
          (reviewState === "All states" || item.state === reviewState),
      ),
    [query, relationType, reviewState],
  );

  return (
    <AppShell title="Relations" subtitle="Academic rule graph" admin>
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/70 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main */}
        <div className="min-w-0 border-b border-zinc-100 lg:border-r lg:border-b-0">
          <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-end">
            <label className="flex h-10 flex-1 items-center gap-2 rounded-lg bg-white px-3 shadow-xs ring-1 ring-zinc-200 ring-inset">
              <Search size={16} className="text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search source, target or source text"
                className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-zinc-400 focus:outline-none"
              />
              <span className="shrink-0 text-[11px] text-zinc-400">
                {filtered.length} edges
              </span>
            </label>
            <Field label="Relation" className="w-40">
              <Select
                aria-label="Relation type"
                value={relationType}
                onChange={setRelationType}
                options={[
                  { value: "All relations", label: "All relations" },
                  ...types.map((item) => ({ value: item, label: item })),
                ]}
              />
            </Field>
            <Field label="State" className="w-36">
              <Select
                aria-label="Review state"
                value={reviewState}
                onChange={setReviewState}
                options={["All states", "Verified", "Automatic", "Review"].map(
                  (item) => ({ value: item, label: item }),
                )}
              />
            </Field>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  {[
                    "Source",
                    "Relation",
                    "Target",
                    "Group",
                    "Hardness",
                    "Confidence",
                    "State",
                  ].map((head, index) => (
                    <th
                      key={index}
                      className="px-3 py-2.5 whitespace-nowrap first:pl-4"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((relation) => (
                  <tr
                    key={relation.id}
                    onClick={() => setSelected(relation)}
                    className={cn(
                      "cursor-pointer transition",
                      selected?.id === relation.id
                        ? "bg-brand-50/50"
                        : "hover:bg-zinc-50/70",
                    )}
                  >
                    <td className="px-3 py-3 pl-4">
                      {isCourseCode(relation.source) ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(relation);
                            setGraphCourse(relation.source);
                          }}
                          className="rounded font-mono font-semibold text-zinc-900 underline-offset-4 transition hover:text-brand-600 hover:underline"
                          aria-label={`Open prerequisite graph for ${relation.source}`}
                        >
                          {relation.source}
                        </button>
                      ) : (
                        <span className="font-mono font-semibold text-zinc-900">
                          {relation.source}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700 ring-1 ring-brand-100 ring-inset">
                        <GitBranch size={12} />
                        {relation.relation}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {isCourseCode(relation.target) ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(relation);
                            setGraphCourse(relation.target);
                          }}
                          className="rounded font-mono font-semibold text-zinc-900 underline-offset-4 transition hover:text-brand-600 hover:underline"
                          aria-label={`Open prerequisite graph for ${relation.target}`}
                        >
                          {relation.target}
                        </button>
                      ) : (
                        <span className="font-mono font-semibold text-zinc-900">
                          {relation.target}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                        {relation.group}
                      </code>
                    </td>
                    <td className="px-3 py-3 text-zinc-600">
                      {relation.hardness}
                    </td>
                    <td className="px-3 py-3">
                      <span className="relative flex h-5 w-16 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-600">
                        <span
                          className="absolute inset-y-0 left-0 bg-brand-200"
                          style={{ width: `${relation.confidence}%` }}
                        />
                        <span className="relative">{relation.confidence}%</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={parseTone(relation.state)}>
                        {relation.state}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspector */}
        <aside className="bg-zinc-50/50">
          {selected ? (
            <>
              <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    selected.state === "Review"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-emerald-50 text-emerald-600",
                  )}
                >
                  {selected.state === "Review" ? (
                    <TriangleAlert size={17} />
                  ) : (
                    <Check size={17} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] tracking-wide text-zinc-400 uppercase">
                    Selected relation
                  </p>
                  <p className="truncate font-mono text-[12px] font-semibold text-zinc-900">
                    {selected.source} → {selected.target}
                  </p>
                </div>
              </header>

              <section className="border-b border-zinc-100 px-4 py-4">
                <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Relation
                </p>
                <h2 className="mt-1 text-base font-bold tracking-tight text-zinc-900">
                  {selected.relation}
                </h2>
                <dl className="mt-3 divide-y divide-zinc-100 text-[12px]">
                  {[
                    [
                      "Rule group",
                      <code
                        key="c"
                        className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {selected.group}
                      </code>,
                    ],
                    ["Hardness", selected.hardness],
                    ["Confidence", `${selected.confidence}%`],
                    ["Review state", selected.state],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <dt className="text-zinc-400">{label}</dt>
                      <dd className="text-zinc-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="border-b border-zinc-100 px-4 py-4">
                <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Original source text
                </p>
                <blockquote className="mt-2 rounded-r-lg border-l-2 border-brand-300 bg-brand-50/50 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-600">
                  {selected.sourceText}
                </blockquote>
                <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                  The source span stays attached to the semantic tree and this
                  derived edge.
                </p>
              </section>

              {selected.state === "Review" && (
                <footer className="flex flex-col gap-2 px-4 py-4">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() =>
                      notify(`${selected.id} accepted for this prototype`)
                    }
                  >
                    <Check size={15} /> Accept parsed relation
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => notify("Manual override draft opened")}
                  >
                    Create override
                  </Button>
                </footer>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
              <GitBranch size={24} className="text-zinc-300" />
              <p className="text-sm font-medium text-zinc-600">
                Select a relation
              </p>
            </div>
          )}
        </aside>
      </div>

      {graphCourse && (
        <Modal
          onClose={() => setGraphCourse(null)}
          labelledBy="course-relation-graph-title"
          className="max-w-3xl"
        >
          <header className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Network size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
                  Prerequisite graph
                </p>
                <h2
                  id="course-relation-graph-title"
                  className="truncate font-mono text-sm font-semibold text-zinc-900"
                >
                  {graphCourse}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGraphCourse(null)}
              aria-label="Close prerequisite graph"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X size={16} />
            </button>
          </header>
          <div className="overflow-y-auto">
            <RelationGraph active={graphCourse} onSelect={setGraphCourse} />
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
