"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { archiveCourseVersion } from "@/lib/coursemap/catalogue-publication-actions";
import type {
  AdminCourseRecord,
  PaginatedAdminResult,
} from "@/lib/coursemap/admin-catalogue";
import {
  AdminRecordTable,
  type AdminTableColumn,
} from "@/components/admin/admin-record-table";
import { AdminRowActions } from "@/components/admin/admin-row-actions";
import { readImportStream } from "@/components/admin/imports/import-stream";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilterBar } from "@/components/ui/filter-bar";

const columns: AdminTableColumn<AdminCourseRecord>[] = [
  {
    id: "course",
    label: "Course",
    required: true,
    cell: (record) => (
      <>
        <span className="block font-medium text-zinc-950 group-hover:text-brand-700">
          {record.title}
        </span>
        <span className="mt-0.5 block font-mono text-xs text-zinc-500">
          {record.code}
        </span>
      </>
    ),
  },
  {
    id: "subject",
    label: "Subject",
    cell: (record) => (
      <span className="font-mono text-xs text-zinc-600">{record.subject}</span>
    ),
  },
  {
    id: "level",
    label: "Level",
    cell: (record) => (
      <span className="text-xs text-zinc-600 tabular-nums">
        {record.code.slice(4, 5)}000
      </span>
    ),
  },
  {
    id: "units",
    label: "Units",
    align: "right",
    cell: (record) => (
      <span className="text-xs text-zinc-600 tabular-nums">{record.units}</span>
    ),
  },
  {
    id: "year",
    label: "Catalogue",
    align: "right",
    cell: (record) => (
      <span className="text-xs text-zinc-600 tabular-nums">{record.year}</span>
    ),
  },
  {
    id: "status",
    label: "Status",
    cell: (record) => (
      <Badge
        tone={record.publicationStatus === "published" ? "success" : "warning"}
      >
        {record.publicationStatus === "published" ? "Published" : "Draft"}
      </Badge>
    ),
  },
  {
    id: "review",
    label: "Review",
    cell: (record) =>
      record.reviewState === "verified" ? (
        <Badge tone="brand">Verified</Badge>
      ) : (
        <Badge tone="neutral">Unverified</Badge>
      ),
  },
];

export function AdminCourseList({
  data,
  searchParams,
  subjects,
}: {
  data: PaginatedAdminResult<AdminCourseRecord>;
  searchParams: Record<string, string | undefined>;
  subjects: string[];
}) {
  const router = useRouter();
  const [resyncing, setResyncing] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function archive(record: AdminCourseRecord) {
    setNotice(null);
    const result = await archiveCourseVersion(record.code, record.year);
    setNotice({ ok: result.ok, text: result.message });
    if (result.ok) router.refresh();
  }

  async function resync(record: AdminCourseRecord) {
    setResyncing(record.code);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/catalogue/imports/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogueYear: record.year,
          courseCodes: [record.code],
        }),
      });
      await readImportStream(response, () => undefined);
      setNotice({ ok: true, text: `${record.code} was resynced from ANU.` });
      router.refresh();
    } catch (error) {
      setNotice({
        ok: false,
        text:
          error instanceof Error
            ? error.message
            : `${record.code} could not be resynced.`,
      });
    } finally {
      setResyncing(null);
    }
  }

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        <h1 className="sr-only">Courses</h1>

        <FilterBar
          searchPlaceholder="Search by code, title or subject"
          filters={[
            {
              key: "status",
              label: "Status",
              allLabel: "All courses",
              options: [
                { label: "Drafts", value: "draft" },
                { label: "Published", value: "published" },
                { label: "Archived", value: "archived" },
                { label: "Unverified", value: "needs-review" },
                { label: "Verified", value: "verified" },
              ],
            },
            {
              key: "subject",
              label: "Subject",
              allLabel: "All subjects",
              options: subjects.map((subject) => ({
                label: subject,
                value: subject,
              })),
            },
          ]}
        />

        {notice ? (
          <Alert role="status" tone={notice.ok ? "success" : "danger"}>
            <AlertDescription>{notice.text}</AlertDescription>
          </Alert>
        ) : null}

        <AdminRecordTable
          actions={(record) => (
            <AdminRowActions
              archived={record.publicationStatus === "archived"}
              label={record.code}
              onArchive={() => archive(record)}
              onResync={() => void resync(record)}
              openHref={`/admin/courses/${record.publicId}`}
              resyncing={resyncing === record.code}
              sourceUrl={`https://programsandcourses.anu.edu.au/${record.year}/course/${record.code}`}
              studentHref={
                record.publicationStatus === "published"
                  ? `/courses/${record.code}`
                  : undefined
              }
            />
          )}
          caption="Imported course versions"
          columns={columns}
          emptyDescription="Clear the search, choose a different filter, or run an import to bring course pages in from ANU."
          emptyTitle="No courses match this view"
          itemName="courses"
          page={data.page}
          pageSize={data.pageSize}
          pathname="/admin/courses"
          rowHref={(record) => `/admin/courses/${record.publicId}`}
          rowKey={(record) => record.code}
          rows={data.records}
          searchParams={searchParams}
          storageKey="coursemap:admin:courses:hidden-columns"
          total={data.total}
        />
      </div>
    </AppShell>
  );
}
