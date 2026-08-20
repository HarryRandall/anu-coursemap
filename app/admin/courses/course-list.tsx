"use client";

import { CheckCircle2, ClipboardCheck, LibraryBig } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishCourseVersion } from "@/lib/coursemap/catalogue-publication-actions";
import type {
  AdminCourseRecord,
  PaginatedAdminResult,
} from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import {
  DataList,
  DataListActions,
  DataListContent,
  DataListDescription,
  DataListIcon,
  DataListItem,
  DataListMeta,
  DataListTitle,
} from "@/components/ui/data-list";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  const [notice, setNotice] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);

  async function publish(record: AdminCourseRecord) {
    setPendingCode(record.code);
    setNotice(null);
    const result = await publishCourseVersion(record.code, record.year);
    setPendingCode(null);
    setNotice({ message: result.message, ok: result.ok });
    if (result.ok) router.refresh();
  }

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="sr-only">Course versions</h1>
        <Card className="overflow-hidden">
          {notice && (
            <Alert
              tone={notice.ok ? "success" : "danger"}
              className="rounded-none border-x-0 border-t-0"
            >
              {notice.ok ? <CheckCircle2 /> : <ClipboardCheck />}
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          )}

          <DataList>
            {data.records.map((record) => (
              <DataListItem key={record.id}>
                <DataListIcon className="border-brand-100 bg-brand-50 text-brand-700">
                  <LibraryBig />
                </DataListIcon>
                <DataListContent>
                  <DataListMeta>
                    <span className="font-mono text-[11px] font-semibold text-zinc-700">
                      {record.code}
                    </span>
                    <Badge tone={statusTone(record.publicationStatus)}>
                      {record.publicationStatus === "published"
                        ? "Published"
                        : "Draft"}
                    </Badge>
                    {record.reviewState === "review" && (
                      <Badge tone="warning">Source review</Badge>
                    )}
                  </DataListMeta>
                  <DataListTitle>
                    <Link
                      href={`/admin/courses/${record.code}`}
                      className="rounded-sm hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                    >
                      {record.title}
                    </Link>
                  </DataListTitle>
                  <DataListDescription>
                    {record.subject} · {record.units} units · {record.year}{" "}
                    catalogue
                  </DataListDescription>
                </DataListContent>
                {record.publicationStatus === "published" ? (
                  <DataListActions>
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
                  </DataListActions>
                ) : (
                  <DataListActions>
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
                  </DataListActions>
                )}
              </DataListItem>
            ))}
            {data.records.length === 0 && (
              <li>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <LibraryBig />
                    </EmptyMedia>
                    <EmptyTitle>No course versions</EmptyTitle>
                    <EmptyDescription>
                      Imported course versions will appear here for review.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </li>
            )}
          </DataList>
          <CardFooter className="bg-zinc-50/40">
            <Pagination
              pathname="/admin/courses"
              searchParams={searchParams}
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              itemName="course versions"
            />
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
