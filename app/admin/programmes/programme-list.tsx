"use client";

import type {
  AdminStructureRecord,
  PaginatedAdminResult,
} from "@/lib/coursemap/admin-catalogue";
import {
  AdminRecordTable,
  type AdminTableColumn,
} from "@/components/admin/admin-record-table";
import { AdminRowActions } from "@/components/admin/admin-row-actions";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";

const columns: AdminTableColumn<AdminStructureRecord>[] = [
  {
    id: "programme",
    label: "Programme",
    required: true,
    cell: (record) => (
      <>
        <span className="block font-medium text-zinc-950 group-hover:text-brand-700">
          {record.name}
        </span>
        <span className="mt-0.5 block font-mono text-xs text-zinc-500">
          {record.code}
        </span>
      </>
    ),
  },
  {
    id: "kind",
    label: "Kind",
    cell: (record) => (
      <span className="text-xs text-zinc-600 capitalize">{record.kind}</span>
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

export function ProgrammeList({
  data,
  searchParams,
}: {
  data: PaginatedAdminResult<AdminStructureRecord>;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        <h1 className="sr-only">Programmes</h1>

        <FilterBar
          searchPlaceholder="Search by code or name"
          filters={[
            {
              key: "status",
              label: "Status",
              allLabel: "All programmes",
              options: [
                { label: "Drafts", value: "draft" },
                { label: "Published", value: "published" },
                { label: "Unverified", value: "needs-review" },
                { label: "Verified", value: "verified" },
              ],
            },
            {
              key: "kind",
              label: "Kind",
              allLabel: "All kinds",
              options: [
                { label: "Degree", value: "degree" },
                { label: "Major", value: "major" },
                { label: "Minor", value: "minor" },
                { label: "Specialisation", value: "specialisation" },
              ],
            },
          ]}
        />

        <AdminRecordTable
          actions={(record) => (
            <AdminRowActions
              label={record.code}
              openHref={`/admin/programmes/${record.code}`}
              sourceUrl={`https://programsandcourses.anu.edu.au/${record.year}/program/${record.code}`}
            />
          )}
          caption="Imported programme versions"
          columns={columns}
          emptyDescription="Clear the search, choose a different filter, or run an import to bring programmes in from ANU."
          emptyTitle="No programmes match this view"
          itemName="programmes"
          page={data.page}
          pageSize={data.pageSize}
          pathname="/admin/programmes"
          rowHref={(record) => `/admin/programmes/${record.code}`}
          rowKey={(record) => record.code}
          rows={data.records}
          searchParams={searchParams}
          storageKey="coursemap:admin:programmes:hidden-columns"
          total={data.total}
        />
      </div>
    </AppShell>
  );
}
