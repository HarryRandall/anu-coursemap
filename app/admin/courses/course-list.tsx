"use client";

import Link from "next/link";
import type {
  AdminCourseRecord,
  PaginatedAdminResult,
} from "@/lib/coursemap/admin-catalogue";
import {
  AdminRecordTable,
  type AdminTableColumn,
} from "@/components/admin/admin-record-table";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";

const columns: AdminTableColumn<AdminCourseRecord>[] = [
  {
    id: "course",
    label: "Course",
    required: true,
    cell: (record) => (
      <Link
        className="block rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        href={`/admin/courses/${record.code}`}
      >
        <span className="block font-medium text-zinc-950 group-hover:text-brand-700">
          {record.title}
        </span>
        <span className="mt-0.5 block font-mono text-xs text-zinc-500">
          {record.code}
        </span>
      </Link>
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
  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        <h1 className="sr-only">Courses</h1>

        <FilterBar
          filterTitle="Filter courses"
          searchPlaceholder="Search by code, title or subject"
          filters={[
            {
              key: "status",
              label: "Status",
              allLabel: "All courses",
              options: [
                { label: "Drafts", value: "draft" },
                { label: "Published", value: "published" },
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

        <AdminRecordTable
          caption="Imported course versions"
          columns={columns}
          emptyDescription="Clear the search, choose a different filter, or run an import to bring course pages in from ANU."
          emptyTitle="No courses match this view"
          itemName="courses"
          page={data.page}
          pageSize={data.pageSize}
          pathname="/admin/courses"
          rowHref={(record) => `/admin/courses/${record.code}`}
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
