import { negatableParam } from "@/lib/filter-params";
import {
  DEFAULT_IMPORT_LIST_SORT,
  IMPORT_LIST_SORTS,
  IMPORT_LIST_STATUSES,
  type ImportListSort,
  type ImportListStatus,
} from "@/lib/coursemap/import-list-query";

export type ImportListSearchParams = {
  page?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  status?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Reads the shared import list URL parameters and hands back both the loader
 * arguments and the canonical parameters to thread through links.
 */
export function parseImportListSearchParams(params: ImportListSearchParams) {
  const requestedStatus = negatableParam(params.status, "all");
  const status = IMPORT_LIST_STATUSES.includes(
    requestedStatus.value as ImportListStatus,
  )
    ? (requestedStatus.value as ImportListStatus)
    : "all";
  const statusNegated = status === "all" ? false : requestedStatus.negated;
  const requestedSort = first(params.sort) ?? DEFAULT_IMPORT_LIST_SORT;
  const sort = IMPORT_LIST_SORTS.includes(requestedSort as ImportListSort)
    ? (requestedSort as ImportListSort)
    : DEFAULT_IMPORT_LIST_SORT;
  const query = (first(params.q) ?? "").trim();

  return {
    page: Number(first(params.page)),
    query,
    sort,
    status,
    statusNegated,
    searchParams: {
      ...(query ? { q: query } : {}),
      ...(sort === DEFAULT_IMPORT_LIST_SORT ? {} : { sort }),
      ...(status === "all"
        ? {}
        : { status: statusNegated ? `!${status}` : status }),
    } as Record<string, string | undefined>,
  };
}
