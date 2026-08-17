"use client";

import { CheckCircle2, GraduationCap, Search, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { publishStructureVersion } from "@/lib/coursemap/catalogue-publication-actions";
import type { AdminStructureRecord } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ProgrammeList({
  records,
}: {
  records: AdminStructureRecord[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records.filter(
      (record) =>
        !search ||
        `${record.code} ${record.name} ${record.kind}`
          .toLowerCase()
          .includes(search),
    );
  }, [query, records]);

  async function publish(record: AdminStructureRecord) {
    setPendingCode(record.code);
    setMessage(null);
    const result = await publishStructureVersion(record.code, record.year);
    setPendingCode(null);
    setMessage(result.message);
    if (result.ok) router.refresh();
  }

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">
              Catalogue review
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Degrees and structures
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Publish a degree or major when its imported source is ready for
              student onboarding and planning.
            </p>
          </div>
          <ButtonLink href="/admin/sync" size="sm" variant="secondary">
            <Upload size={15} /> Import a programme
          </ButtonLink>
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex h-10 max-w-xl flex-1 items-center gap-2 rounded-lg bg-white px-3 shadow-xs ring-1 ring-zinc-200 ring-inset">
              <Search size={16} className="text-zinc-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search imported degrees and majors"
                value={query}
              />
            </label>
            <span className="text-xs text-zinc-500">
              {records.length} imported structures
            </span>
          </div>

          {message && (
            <p
              role="status"
              className="border-b border-zinc-100 bg-brand-50 px-4 py-3 text-sm text-brand-900"
            >
              {message}
            </p>
          )}

          <div className="divide-y divide-zinc-100">
            {filtered.map((record) => (
              <div
                key={record.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <GraduationCap size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-900">
                      {record.code}
                    </span>
                    <Badge tone="neutral">{record.kind}</Badge>
                    <Badge
                      tone={
                        record.publicationStatus === "published"
                          ? "success"
                          : "warning"
                      }
                    >
                      {record.publicationStatus === "published"
                        ? "Published"
                        : "Draft"}
                    </Badge>
                    {record.reviewState === "review" && (
                      <Badge tone="warning">Source review</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {record.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                    {record.units} units · {record.year} catalogue ·{" "}
                    {record.description}
                  </p>
                </div>
                {record.publicationStatus === "published" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 size={15} /> Available in onboarding
                  </span>
                ) : (
                  <Button
                    disabled={pendingCode === record.code}
                    onClick={() => publish(record)}
                    size="sm"
                  >
                    {pendingCode === record.code
                      ? "Publishing…"
                      : "Publish for students"}
                  </Button>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">
                No imported programme structures match that search.
              </p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
