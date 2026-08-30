"use client";

import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/filter-bar";
import { SortMenu, type SortOption } from "@/components/ui/sort-menu";
import {
  DEFAULT_IMPORT_LIST_SORT,
  type ImportListSort,
  type ImportSystem,
} from "@/lib/coursemap/import-list-query";

/**
 * Only offer a workflow state backed by that import system's status values.
 * Course and structure targets use different processing and review words, so
 * each option is resolved through its system-specific query mapping.
 */
const STATUS_OPTIONS_BY_SYSTEM: Record<
  ImportSystem,
  Array<{ label: string; value: string }>
> = {
  course: [
    { label: "Queued", value: "queued" },
    { label: "Processing", value: "processing" },
    { label: "Needs review", value: "needs-review" },
    { label: "Accepted", value: "accepted" },
    { label: "Rejected", value: "rejected" },
    { label: "Unchanged", value: "unchanged" },
    { label: "Failed", value: "failed" },
  ],
  structure: [
    { label: "Queued", value: "queued" },
    { label: "Processing", value: "processing" },
    { label: "Needs review", value: "needs-review" },
    { label: "Accepted", value: "accepted" },
    { label: "Rejected", value: "rejected" },
    { label: "Unchanged", value: "unchanged" },
    { label: "Failed", value: "failed" },
  ],
};

const SORT_OPTIONS: SortOption<ImportListSort>[] = [
  { descending: true, label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Code, A to Z", value: "code-asc" },
  { descending: true, label: "Code, Z to A", value: "code-desc" },
];

/**
 * Search, filter and sort for an import list. The filter bar binds itself to
 * the URL; sorting is pushed the same way so a narrowed view stays shareable.
 */
export function ImportsToolbar({
  importsPath,
  searchPlaceholder,
  searchParams,
  sort,
  system,
}: {
  importsPath: string;
  searchPlaceholder: string;
  searchParams: Record<string, string | undefined>;
  sort: ImportListSort;
  system: ImportSystem;
}) {
  const router = useRouter();
  const STATUS_OPTIONS = STATUS_OPTIONS_BY_SYSTEM[system];

  function chooseSort(value: ImportListSort) {
    const params = new URLSearchParams();
    for (const [key, parameter] of Object.entries(searchParams)) {
      if (parameter) params.set(key, parameter);
    }
    if (value === DEFAULT_IMPORT_LIST_SORT) params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${importsPath}?${query}` : importsPath, {
      scroll: false,
    });
  }

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              allLabel: "All imports",
              negatable: true,
              options: STATUS_OPTIONS,
            },
          ]}
          searchPlaceholder={searchPlaceholder}
        />
      </div>
      <SortMenu
        defaultValue={DEFAULT_IMPORT_LIST_SORT}
        onChange={chooseSort}
        options={SORT_OPTIONS}
        value={sort}
      />
    </div>
  );
}
