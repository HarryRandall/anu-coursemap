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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function ProgrammeList({
  data,
  searchParams,
}: {
  data: PaginatedAdminResult<AdminStructureRecord>;
  searchParams: Record<string, string | undefined>;
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
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="sr-only">Degrees and structures</h1>
        <Card className="overflow-hidden">
          {notice && (
            <Alert
              tone={notice.ok ? "success" : "danger"}
              className="rounded-none border-x-0 border-t-0"
            >
              <CheckCircle2 />
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          )}

          <DataList>
            {data.records.map((record) => (
              <DataListItem key={record.id}>
                <DataListIcon className="border-brand-100 bg-brand-50 text-brand-700">
                  <GraduationCap size={18} aria-hidden="true" />
                </DataListIcon>
                <DataListContent>
                  <DataListMeta>
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
                  </DataListMeta>
                  <DataListTitle>{record.name}</DataListTitle>
                  <DataListDescription className="line-clamp-2 whitespace-normal">
                    {record.units} units · {record.year} catalogue ·{" "}
                    {record.description}
                  </DataListDescription>
                </DataListContent>
                {record.publicationStatus === "published" ? (
                  <DataListActions className="text-xs font-medium text-emerald-700">
                    <CheckCircle2 size={15} /> Available in onboarding
                  </DataListActions>
                ) : (
                  <DataListActions>
                    <Button
                      disabled={pendingCode === record.code}
                      onClick={() => publish(record)}
                      size="sm"
                    >
                      {pendingCode === record.code
                        ? "Publishing…"
                        : "Publish for students"}
                    </Button>
                  </DataListActions>
                )}
              </DataListItem>
            ))}
            {data.records.length === 0 && (
              <li>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GraduationCap />
                    </EmptyMedia>
                    <EmptyTitle>No programme structures</EmptyTitle>
                    <EmptyDescription>
                      Imported degrees and structures will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </li>
            )}
          </DataList>
          <CardFooter className="bg-zinc-50/40">
            <Pagination
              pathname="/admin/programmes"
              searchParams={searchParams}
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              itemName="programme structures"
            />
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
