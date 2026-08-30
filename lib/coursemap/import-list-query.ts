/**
 * Filter and sort vocabulary shared by the course and academic structure
 * import lists. Both read the same URL parameters, so the two tables behave
 * the same way even though they page over different tables.
 */

export type ImportListStatus =
  | "all"
  | "queued"
  | "processing"
  | "needs-review"
  | "accepted"
  | "rejected"
  | "unchanged"
  | "failed";

export type ImportListSort = "newest" | "oldest" | "code-asc" | "code-desc";

export const IMPORT_LIST_STATUSES: ImportListStatus[] = [
  "all",
  "queued",
  "processing",
  "needs-review",
  "accepted",
  "rejected",
  "unchanged",
  "failed",
];

export const IMPORT_LIST_SORTS: ImportListSort[] = [
  "newest",
  "oldest",
  "code-asc",
  "code-desc",
];

export const DEFAULT_IMPORT_LIST_SORT: ImportListSort = "newest";

/** Caps how many directory entries a search resolves to before narrowing. */
export const MAX_SEARCH_ENTRY_IDS = 1000;

/** The two import systems store their statuses with different vocabularies. */
export type ImportSystem = "course" | "structure";

type StatusFilter = {
  column: "processing_status" | "review_status";
  values: string[];
};

/**
 * Workflow status spans two columns: the worker owns processing_status and a
 * reviewer owns review_status. A reader picks one status, so each choice maps
 * to whichever column carries it -- and the two systems disagree on the
 * literals, so each has its own table. Course rows never say "running" and
 * mark unresolved reviews as "pending"; structure rows use "running" and
 * "needs_review". Mapping one system with the other's words returns an empty
 * table in silence.
 */
const STATUS_FILTERS: Record<
  ImportSystem,
  Partial<Record<ImportListStatus, StatusFilter>>
> = {
  course: {
    queued: { column: "processing_status", values: ["queued"] },
    processing: { column: "processing_status", values: ["processing"] },
    "needs-review": {
      column: "review_status",
      values: ["pending"],
    },
    unchanged: { column: "processing_status", values: ["unchanged"] },
    accepted: { column: "review_status", values: ["accepted"] },
    rejected: { column: "review_status", values: ["rejected"] },
    failed: { column: "processing_status", values: ["failed", "cancelled"] },
  },
  structure: {
    queued: { column: "processing_status", values: ["queued"] },
    processing: { column: "processing_status", values: ["running"] },
    "needs-review": { column: "review_status", values: ["needs_review"] },
    unchanged: { column: "review_status", values: ["unchanged"] },
    accepted: { column: "review_status", values: ["accepted"] },
    rejected: { column: "review_status", values: ["rejected"] },
    failed: { column: "processing_status", values: ["failed", "cancelled"] },
  },
};

export function importStatusFilter(
  system: ImportSystem,
  status: ImportListStatus,
): StatusFilter | null {
  return STATUS_FILTERS[system][status] ?? null;
}

/** Processing statuses that mean the worker is still on the row. */
const ACTIVE_PROCESSING: Record<ImportSystem, string[]> = {
  course: ["queued", "processing"],
  structure: ["queued", "running"],
};

export function isImportActive(system: ImportSystem, processingStatus: string) {
  return ACTIVE_PROCESSING[system].includes(processingStatus);
}

export function importSortOrder(sort: ImportListSort, codeColumn: string) {
  switch (sort) {
    case "oldest":
      return { column: "created_at", ascending: true };
    case "code-asc":
      return { column: codeColumn, ascending: true };
    case "code-desc":
      return { column: codeColumn, ascending: false };
    default:
      return { column: "created_at", ascending: false };
  }
}

/** Trims a search box value down to something safe to interpolate. */
export function safeImportSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .slice(0, 120)
    .replace(/[^A-Za-z0-9 &-]/g, " ")
    .replace(/\s+/g, " ");
}
