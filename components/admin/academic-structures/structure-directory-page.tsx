import { StructureDirectoryList } from "@/components/admin/academic-structures/structure-directory-list";
import { loadImportModelSetting } from "@/lib/admin/settings";
import { negatableParam } from "@/lib/filter-params";
import { canManageCatalogueImports } from "@/lib/auth/viewer";
import {
  ACADEMIC_STRUCTURE_IMPORT_YEARS,
  loadAcademicStructureDirectoryPage,
  type AcademicStructureDirectoryAvailability,
  type AcademicStructureDirectorySort,
  type AcademicStructureDirectoryStatus,
} from "@/lib/coursemap/admin-academic-structures";
import type { AcademicStructureKind } from "@/lib/structure-import/contract";
import { academicStructureImportQueuesEnabled } from "@/lib/structure-import/queue";

const statuses: AcademicStructureDirectoryStatus[] = [
  "all",
  "directory",
  "queued",
  "processing",
  "needs-review",
  "draft",
  "draft-changes",
  "published",
  "unchanged",
  "failed",
];

const availabilities: AcademicStructureDirectoryAvailability[] = [
  "all",
  "available",
  "unavailable",
];

const sorts: AcademicStructureDirectorySort[] = [
  "code-asc",
  "code-desc",
  "title-asc",
  "title-desc",
  "status",
];

export type AcademicStructureDirectorySearchParams = {
  availability?: string | string[];
  page?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  status?: string | string[];
  year?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function AcademicStructureDirectoryPage({
  kind,
  searchParams,
}: {
  kind: AcademicStructureKind;
  searchParams: Promise<AcademicStructureDirectorySearchParams>;
}) {
  const params = await searchParams;
  const rawYear = first(params.year);
  const requestedYear = Number(rawYear);
  const currentCalendarYear = new Date().getFullYear();
  const year: number | "all" =
    rawYear === "all"
      ? "all"
      : ACADEMIC_STRUCTURE_IMPORT_YEARS.includes(requestedYear)
        ? requestedYear
        : ACADEMIC_STRUCTURE_IMPORT_YEARS.includes(currentCalendarYear)
          ? currentCalendarYear
          : ACADEMIC_STRUCTURE_IMPORT_YEARS.at(-1)!;
  const requestedStatus = negatableParam(params.status, "all");
  const status = statuses.includes(
    requestedStatus.value as AcademicStructureDirectoryStatus,
  )
    ? (requestedStatus.value as AcademicStructureDirectoryStatus)
    : "all";
  const statusNegated = status === "all" ? false : requestedStatus.negated;
  const requestedAvailability = negatableParam(params.availability, "all");
  const availability = availabilities.includes(
    requestedAvailability.value as AcademicStructureDirectoryAvailability,
  )
    ? (requestedAvailability.value as AcademicStructureDirectoryAvailability)
    : "all";
  const availabilityNegated =
    availability === "all" ? false : requestedAvailability.negated;
  const query = (first(params.q) ?? "").trim();
  const requestedSort = first(params.sort) ?? "code-asc";
  const sort = sorts.includes(requestedSort as AcademicStructureDirectorySort)
    ? (requestedSort as AcademicStructureDirectorySort)
    : "code-asc";
  const page = Number(first(params.page));

  const [data, canImport, importModel] = await Promise.all([
    loadAcademicStructureDirectoryPage({
      structureKind: kind,
      year,
      page,
      query,
      sort,
      status,
      statusNegated,
      availability,
      availabilityNegated,
    }),
    canManageCatalogueImports(),
    loadImportModelSetting(),
  ]);

  return (
    <StructureDirectoryList
      key={`${kind}-${year}`}
      canImport={canImport}
      data={data}
      importModel={importModel.model}
      modelOptions={importModel.options}
      queueEnabled={academicStructureImportQueuesEnabled()}
      searchParams={{
        year: String(year),
        ...(query ? { q: query } : {}),
        ...(sort === "code-asc" ? {} : { sort }),
        ...(status === "all"
          ? {}
          : { status: statusNegated ? `!${status}` : status }),
        ...(availability === "all"
          ? {}
          : {
              availability: availabilityNegated
                ? `!${availability}`
                : availability,
            }),
      }}
    />
  );
}
