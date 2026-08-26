"use client";

import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { publishStructureVersion } from "@/lib/coursemap/catalogue-publication-actions";
import type {
  AdminCourseListStatus,
  AdminStructureRecord,
  PaginatedAdminResult,
} from "@/lib/coursemap/admin-catalogue";
import { AdminListControls } from "@/components/admin/admin-list-controls";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Pagination } from "@/components/ui/pagination";

const statusOptions = [
  { label: "All programmes", value: "all" },
  { label: "Drafts", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Needs source review", value: "needs-review" },
  { label: "Verified", value: "verified" },
];

const statusHeadings: Record<AdminCourseListStatus, string> = {
  all: "All programme versions",
  draft: "Draft programme versions",
  published: "Published programme versions",
  "needs-review": "Programme versions needing source review",
  verified: "Verified programme versions",
};

export function ProgrammeList({
  data,
  searchParams,
  status,
}: {
  data: PaginatedAdminResult<AdminStructureRecord>;
  searchParams: Record<string, string | undefined>;
  status: AdminCourseListStatus;
}) {
  const router = useRouter();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);

  async function publish(record: AdminStructureRecord) {
    setPendingCode(record.code);
    setNotice(null);
    const result = await publishStructureVersion(record.code, record.year);
    setPendingCode(null);
    setNotice({ message: result.message, ok: result.ok });
    if (result.ok) router.refresh();
  }

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Programmes
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {statusHeadings[status]} · {data.total}{" "}
              {data.total === 1 ? "version" : "versions"}
            </p>
          </div>
          <ButtonLink href="/admin/imports/new" size="lg" variant="primary">
            New import
          </ButtonLink>
        </header>

        {notice ? (
          <Alert tone={notice.ok ? "success" : "danger"}>
            {notice.ok ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <CircleAlert aria-hidden="true" />
            )}
            <AlertDescription>{notice.message}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="overflow-hidden">
          <Suspense
            fallback={<div className="h-[65px] border-b border-zinc-200/80" />}
          >
            <AdminListControls
              searchPlaceholder="Search by code or name"
              statuses={statusOptions}
            />
          </Suspense>

          {data.records.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GraduationCap />
                </EmptyMedia>
                <EmptyTitle>No programmes match this view</EmptyTitle>
                <EmptyDescription>
                  Clear the search, choose a different status, or run an import
                  to bring programmes in from ANU.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.records.map((record) => {
                const isPublished = record.publicationStatus === "published";
                return (
                  <li
                    className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/70 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                    key={record.id}
                  >
                    <Link
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                      href={`/admin/programmes/${record.code}`}
                    >
                      <span className="w-22 shrink-0 font-mono text-sm font-semibold text-zinc-700">
                        {record.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-zinc-950">
                          {record.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          {record.kind} · {record.units} units · {record.year}{" "}
                          catalogue
                        </span>
                      </span>
                    </Link>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge tone={isPublished ? "success" : "warning"}>
                        {isPublished ? "Published" : "Draft"}
                      </Badge>
                      {record.reviewState === "verified" ? (
                        <Badge tone="brand">Verified</Badge>
                      ) : (
                        <Badge tone="neutral">Source review</Badge>
                      )}
                      {!isPublished ? (
                        <Button
                          disabled={pendingCode === record.code}
                          onClick={() => publish(record)}
                          size="sm"
                          variant="primary"
                        >
                          {pendingCode === record.code
                            ? "Publishing..."
                            : "Publish"}
                        </Button>
                      ) : (
                        <ButtonLink
                          href="/onboarding"
                          size="sm"
                          variant="secondary"
                        >
                          <ExternalLink aria-hidden="true" size={14} />
                          In onboarding
                        </ButtonLink>
                      )}
                      <Link
                        aria-label={`Review ${record.code} ${record.name}`}
                        className="grid size-9 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                        href={`/admin/programmes/${record.code}`}
                      >
                        <ChevronRight aria-hidden="true" size={17} />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <CardFooter className="bg-zinc-50/40">
            <Pagination
              pathname="/admin/programmes"
              searchParams={searchParams}
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              itemName="programme versions"
            />
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
