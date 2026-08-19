"use client";

import { CheckCircle2, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishStructureVersion } from "@/lib/coursemap/catalogue-publication-actions";
import type {
  AdminStructureRecord,
  PaginatedAdminResult,
} from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";

export function ProgrammeList({
  data,
  searchParams,
}: {
  data: PaginatedAdminResult<AdminStructureRecord>;
  searchParams: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        <h1 className="sr-only">Degrees and structures</h1>
        <Card className="overflow-hidden">
          {message && (
            <p
              role="status"
              className="border-b border-zinc-100 bg-brand-50 px-4 py-3 text-sm text-brand-900"
            >
              {message}
            </p>
          )}

          <div className="divide-y divide-zinc-100">
            {data.records.map((record) => (
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
            {data.records.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">
                No imported programme structures are available yet.
              </p>
            )}
          </div>
          <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-3">
            <Pagination
              pathname="/admin/programmes"
              searchParams={searchParams}
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              itemName="programme structures"
            />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
