import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { ImportsToolbar } from "@/components/admin/imports/imports-toolbar";
import {
  isImportActive,
  type ImportListSort,
  type ImportSystem,
} from "@/lib/coursemap/import-list-query";
import type { Tone } from "@/lib/ui";
import { CourseImportAutoRefresh } from "./course-import-auto-refresh";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function processingTone(status: string): Tone {
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "queued" || status === "running") return "info";
  return "success";
}

function reviewTone(status: string): Tone {
  if (status === "rejected") return "danger";
  if (status === "needs_review") return "warning";
  if (status === "accepted") return "success";
  return "neutral";
}

const SORT_CAPTIONS: Record<ImportListSort, string> = {
  newest: "newest first",
  oldest: "oldest first",
  "code-asc": "by code, A to Z",
  "code-desc": "by code, Z to A",
};

export type ImportListRow = {
  id: string;
  code: string;
  title: string;
  academicYear: number;
  processingStatus: string;
  reviewStatus: string;
  changeKind: string | null;
  createdAt: string;
};

export type ImportListData = {
  records: ImportListRow[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * One import per row across every catalogue object. Imports are addressed by
 * target id, so the batching run never appears in a URL or a column.
 */
export function ImportsList({
  basePath,
  data,
  heading,
  itemName,
  noun,
  plural,
  searchParams,
  sort,
  system,
}: {
  /** The object's directory path, such as "/admin/majors". */
  basePath: string;
  data: ImportListData;
  heading: string;
  itemName: string;
  /** Lower-case singular used in the empty state, such as "major". */
  noun: string;
  /** Lower-case plural used in the search placeholder, such as "majors". */
  plural: string;
  searchParams: Record<string, string | undefined>;
  sort: ImportListSort;
  system: ImportSystem;
}) {
  const importsPath = `${basePath}/imports`;
  const active = data.records.some((record) =>
    isImportActive(system, record.processingStatus),
  );
  const filtered = Boolean(searchParams.q || searchParams.status);

  return (
    <AppShell admin fill currentBreadcrumbLabel="Imports">
      <CourseImportAutoRefresh active={active} />
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4">
        <h1 className="sr-only">{heading}</h1>

        <ImportsToolbar
          importsPath={importsPath}
          searchParams={searchParams}
          searchPlaceholder={`Search ${plural} by code or title`}
          sort={sort}
          system={system}
        />

        <DataTableShell
          viewport
          footer={
            <Pagination
              alwaysShowControls
              itemName={itemName}
              page={data.page}
              pageSize={data.pageSize}
              pathname={importsPath}
              searchParams={searchParams}
              total={data.total}
            />
          }
        >
          {data.records.length === 0 ? (
            <DataTableEmpty
              description={
                filtered
                  ? "No imports match the current search and filters."
                  : `Choose entries in the directory to import a ${noun}.`
              }
              title={filtered ? "No matching imports" : "No imports yet"}
            />
          ) : (
            <Table className="min-w-[880px]">
              <TableCaption>
                {heading}, {SORT_CAPTIONS[sort]}
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-zinc-950">
                        {record.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-80 truncate text-xs text-zinc-800">
                        {record.title}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {record.academicYear}
                    </TableCell>
                    <TableCell>
                      <Badge tone={processingTone(record.processingStatus)}>
                        {readable(record.processingStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={reviewTone(record.reviewStatus)}>
                        {readable(record.reviewStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600">
                      {record.changeKind ? (
                        readable(record.changeKind)
                      ) : (
                        <span className="text-zinc-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <time
                        className="text-xs text-zinc-600 tabular-nums"
                        dateTime={record.createdAt}
                      >
                        {dateFormatter.format(new Date(record.createdAt))}
                      </time>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        aria-label={`Open the ${record.code} import`}
                        className="inline-grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                        href={`${importsPath}/${record.id}`}
                      >
                        <ArrowUpRight aria-hidden="true" size={15} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableShell>
      </div>
    </AppShell>
  );
}
