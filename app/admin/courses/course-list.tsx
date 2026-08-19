"use client";

import { CheckCircle2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishCourseVersion } from "@/lib/coursemap/catalogue-publication-actions";
import type {
  AdminCourseRecord,
  PaginatedAdminResult,
} from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";

function statusTone(status: string) {
  return status === "published" ? "success" : "warning";
}

export function AdminCourseList({
  data,
  searchParams,
}: {
  data: PaginatedAdminResult<AdminCourseRecord>;
  searchParams: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        <h1 className="sr-only">Course versions</h1>
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
            {data.records.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">
                No imported course versions are available yet.
              </p>
            )}
          </div>
          <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-3">
            <Pagination
              pathname="/admin/courses"
              searchParams={searchParams}
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              itemName="course versions"
            />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
