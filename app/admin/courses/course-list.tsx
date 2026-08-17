"use client";

import { CheckCircle2, ClipboardCheck, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { publishCourseVersion } from "@/lib/coursemap/catalogue-publication-actions";
import type { AdminCourseRecord } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function statusTone(status: string) {
  return status === "published" ? "success" : "warning";
}

export function AdminCourseList({ records }: { records: AdminCourseRecord[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records.filter(
      (record) =>
        !search ||
        `${record.code} ${record.title} ${record.subject}`
          .toLowerCase()
          .includes(search),
    );
  }, [query, records]);
  const drafts = records.filter(
    (record) => record.publicationStatus !== "published",
  );

  async function publish(record: AdminCourseRecord) {
    setPendingCode(record.code);
    setMessage(null);
    const result = await publishCourseVersion(record.code, record.year);
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
              Course versions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Open a course version to compare every imported field with its
              source, correct draft details and record the review decision
              before publishing it for students.
            </p>
          </div>
          <ButtonLink href="/admin/sync/courses" size="sm" variant="secondary">
            <Upload size={15} /> Import courses
          </ButtonLink>
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex h-10 max-w-xl flex-1 items-center gap-2 rounded-lg bg-white px-3 shadow-xs ring-1 ring-zinc-200 ring-inset">
              <Search size={16} className="text-zinc-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search imported courses"
                value={query}
              />
            </label>
            <span className="text-xs text-zinc-500">
              {drafts.length} awaiting publication · {records.length} imported
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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/courses/${record.code}`}
                      className="font-mono text-xs font-bold text-zinc-900 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                    >
                      {record.code}
                    </Link>
                    <Badge tone={statusTone(record.publicationStatus)}>
                      {record.publicationStatus === "published"
                        ? "Published"
                        : "Draft"}
                    </Badge>
                    {record.reviewState === "review" && (
                      <Badge tone="warning">Source review</Badge>
                    )}
                  </div>
                  <Link
                    href={`/admin/courses/${record.code}`}
                    className="mt-1 block text-sm font-semibold text-zinc-900 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                  >
                    {record.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {record.subject} · {record.units} units · {record.year}{" "}
                    catalogue
                  </p>
                </div>
                {record.publicationStatus === "published" ? (
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink
                      href={`/admin/courses/${record.code}`}
                      size="sm"
                      variant="secondary"
                    >
                      <ClipboardCheck size={15} /> Review record
                    </ButtonLink>
                    <ButtonLink
                      href={`/courses/${record.code}`}
                      size="sm"
                      variant="secondary"
                    >
                      <CheckCircle2 size={15} /> View live course
                    </ButtonLink>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink
                      href={`/admin/courses/${record.code}`}
                      size="sm"
                    >
                      <ClipboardCheck size={15} /> Review draft
                    </ButtonLink>
                    {record.reviewState === "verified" && (
                      <Button
                        disabled={pendingCode === record.code}
                        onClick={() => publish(record)}
                        size="sm"
                        variant="secondary"
                      >
                        {pendingCode === record.code
                          ? "Publishing…"
                          : "Publish for students"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">
                No imported course versions match that search.
              </p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
