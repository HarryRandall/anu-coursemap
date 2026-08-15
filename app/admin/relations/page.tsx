"use client";

import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  Network,
  Search,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { AppShell } from "@/components/shell";
import { RelationGraph } from "@/components/admin/relation-graph";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Relation, relations } from "@/lib/catalogue";
import { parseTone } from "@/lib/ui";

const isCourseCode = (value: string) => /^[A-Z]{4}\d{4}$/.test(value);

function relationSummary(relation: Relation) {
  const subject = relation.source;
  const target = relation.target;
  const summaries: Record<string, string> = {
    Prerequisite: `${subject} requires ${target}`,
    Permission: `${subject} needs ${target} approval`,
    Incompatible: `${subject} cannot be taken with ${target}`,
    Requires: `${subject} includes ${target}`,
  };
  return summaries[relation.relation] ?? `${subject} relates to ${target}`;
}

function groupSummary(group: string) {
  if (group.startsWith("all_of")) return "All listed conditions";
  if (group.startsWith("one_of")) return "Choose one option";
  if (group.startsWith("incompat")) return "Cannot be combined";
  if (group.startsWith("structure")) return "Programme structure";
  return "Parsed rule";
}

export default function AdminRelationsPage() {
  const [query, setQuery] = useState("");
  const [relationType, setRelationType] = useState("All rules");
  const [reviewState, setReviewState] = useState("Review");
  const [selected, setSelected] = useState<Relation | null>(relations[7]);
  const [graphCourse, setGraphCourse] = useState<string | null>(null);

  const types = [...new Set(relations.map((item) => item.relation))];
  const filtered = useMemo(
    () =>
      relations.filter(
        (item) =>
          `${item.source} ${item.target} ${item.sourceText}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (relationType === "All rules" || item.relation === relationType) &&
          (reviewState === "All states" || item.state === reviewState),
      ),
    [query, relationType, reviewState],
  );

  return (
    <AppShell
      admin
      actions={
        <ButtonLink href="/admin/sync" size="sm" variant="secondary">
          Plan import <ArrowRight size={14} />
        </ButtonLink>
      }
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-brand-700">
              Catalogue quality
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Rule review
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Compare the source wording with the parsed rule before it is
              published to students.
            </p>
          </div>
          <Badge tone="warning">
            {relations.filter((relation) => relation.state === "Review").length}{" "}
            needs review
          </Badge>
        </div>

        <Card className="mt-7 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-end">
            <label className="flex h-10 flex-1 items-center gap-2 rounded-lg bg-white px-3 shadow-xs ring-1 ring-zinc-200 ring-inset">
              <Search size={16} className="text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a course, programme or source wording"
                className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-zinc-400 focus:outline-none"
              />
              <span className="shrink-0 text-[11px] text-zinc-400">
                {filtered.length} rules
              </span>
            </label>
            <Field label="Rule type" className="w-40">
              <Select
                aria-label="Rule type"
                value={relationType}
                onChange={setRelationType}
                options={[
                  { value: "All rules", label: "All rules" },
                  ...types.map((item) => ({ value: item, label: item })),
                ]}
              />
            </Field>
            <Field label="Review state" className="w-40">
              <Select
                aria-label="Review state"
                value={reviewState}
                onChange={setReviewState}
                options={[
                  { value: "Review", label: "Needs review" },
                  { value: "All states", label: "All states" },
                  { value: "Automatic", label: "Automatic" },
                  { value: "Verified", label: "Verified" },
                ]}
              />
            </Field>
          </div>

          <div className="grid min-h-[34rem] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 border-b border-zinc-100 lg:border-r lg:border-b-0">
              <div className="divide-y divide-zinc-100">
                {filtered.map((relation) => {
                  const active = selected?.id === relation.id;
                  return (
                    <button
                      key={relation.id}
                      type="button"
                      onClick={() => setSelected(relation)}
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-4 text-left transition sm:grid-cols-[minmax(0,1fr)_9rem_5.5rem] sm:items-center",
                        active ? "bg-brand-50/70" : "hover:bg-zinc-50/70",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-zinc-500">
                            {relation.source}
                          </span>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                            {relation.relation}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium text-zinc-900">
                          {relationSummary(relation)}
                        </span>
                        <span className="mt-1 block truncate text-xs text-zinc-500">
                          {relation.sourceText}
                        </span>
                      </span>
                      <span className="hidden text-xs text-zinc-500 sm:block">
                        {groupSummary(relation.group)}
                      </span>
                      <span className="flex justify-end">
                        <Badge tone={parseTone(relation.state)}>
                          {relation.state}
                        </Badge>
                      </span>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                    <Search size={20} className="text-zinc-300" />
                    <p className="mt-3 text-sm font-medium text-zinc-700">
                      No rules match these filters
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-brand-700 hover:text-brand-800"
                      onClick={() => {
                        setQuery("");
                        setRelationType("All rules");
                        setReviewState("All states");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            <aside className="bg-zinc-50/50">
              {selected ? (
                <div className="flex h-full flex-col">
                  <header className="border-b border-zinc-100 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg",
                          selected.state === "Review"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700",
                        )}
                      >
                        {selected.state === "Review" ? (
                          <TriangleAlert size={17} />
                        ) : (
                          <ShieldCheck size={17} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
                          Parsed interpretation
                        </p>
                        <h2 className="mt-1 text-sm leading-5 font-semibold text-zinc-900">
                          {relationSummary(selected)}
                        </h2>
                      </div>
                    </div>
                  </header>

                  <div className="flex-1 px-5 py-5">
                    <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                      Original ANU source text
                    </p>
                    <blockquote className="mt-2 rounded-r-lg border-l-2 border-brand-400 bg-brand-50/60 px-3 py-2.5 text-sm leading-6 text-zinc-700">
                      {selected.sourceText}
                    </blockquote>

                    <dl className="mt-5 divide-y divide-zinc-100 rounded-xl bg-white px-3 ring-1 ring-zinc-200">
                      {[
                        ["Interpretation", groupSummary(selected.group)],
                        ["Enforcement", selected.hardness],
                        ["Parser confidence", `${selected.confidence}%`],
                        ["Review state", selected.state],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-3 py-2.5 text-xs"
                        >
                          <dt className="text-zinc-500">{label}</dt>
                          <dd className="text-right font-medium text-zinc-800">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <footer className="border-t border-zinc-100 bg-white px-5 py-4">
                    {isCourseCode(selected.source) ? (
                      <div className="grid grid-cols-2 gap-2">
                        <ButtonLink
                          href={`/admin/courses/${selected.source}`}
                          variant="secondary"
                          size="sm"
                        >
                          Course record
                        </ButtonLink>
                        <Button
                          size="sm"
                          aria-label={`Open prerequisite graph for ${selected.source}`}
                          onClick={() => setGraphCourse(selected.source)}
                        >
                          <Network size={14} /> Graph
                        </Button>
                      </div>
                    ) : (
                      <ButtonLink
                        href={`/admin/programmes/${selected.source}`}
                        variant="secondary"
                        size="sm"
                        fullWidth
                      >
                        Programme record
                      </ButtonLink>
                    )}
                  </footer>
                </div>
              ) : (
                <div className="flex h-full min-h-52 flex-col items-center justify-center px-8 text-center">
                  <GitBranch size={22} className="text-zinc-300" />
                  <p className="mt-3 text-sm font-medium text-zinc-700">
                    Select a rule to inspect it
                  </p>
                </div>
              )}
            </aside>
          </div>
        </Card>

        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Acceptance and overrides will be enabled only after the review actions
          are backed by catalogue review records. This screen currently makes
          the existing interpretation inspectable without pretending to publish
          a decision.
        </p>
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
