import { StructureDirectoryList } from "@/components/admin/academic-structures/structure-directory-list";
import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { configuredOpenRouterModels } from "@/lib/course-import/openrouter";
import {
  ACADEMIC_STRUCTURE_IMPORT_YEARS,
  loadAcademicStructureDirectoryPage,
  type AcademicStructureDirectoryAvailability,
  type AcademicStructureDirectoryStatus,
} from "@/lib/coursemap/admin-academic-structures";
import {
  ACADEMIC_STRUCTURE_KINDS,
  type AcademicStructureKind,
} from "@/lib/structure-import/contract";
import { academicStructureImportQueuesEnabled } from "@/lib/structure-import/queue";

export const dynamic = "force-dynamic";

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

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectedKind(value: string | undefined): AcademicStructureKind {
  return ACADEMIC_STRUCTURE_KINDS.includes(value as AcademicStructureKind)
    ? (value as AcademicStructureKind)
    : "programme";
}

export default async function AdminProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<{
    availability?: string | string[];
    kind?: string | string[];
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
    year?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const kind = selectedKind(first(params.kind));
  const requestedYear = Number(first(params.year));
  const currentCalendarYear = new Date().getFullYear();
  const year = ACADEMIC_STRUCTURE_IMPORT_YEARS.includes(requestedYear)
    ? requestedYear
    : ACADEMIC_STRUCTURE_IMPORT_YEARS.includes(currentCalendarYear)
      ? currentCalendarYear
      : ACADEMIC_STRUCTURE_IMPORT_YEARS.at(-1)!;
  const requestedStatus = first(params.status) ?? "all";
  const status = statuses.includes(
    requestedStatus as AcademicStructureDirectoryStatus,
  )
    ? (requestedStatus as AcademicStructureDirectoryStatus)
    : "all";
  const requestedAvailability = first(params.availability) ?? "all";
  const availability = availabilities.includes(
    requestedAvailability as AcademicStructureDirectoryAvailability,
  )
    ? (requestedAvailability as AcademicStructureDirectoryAvailability)
    : "all";
  const query = (first(params.q) ?? "").trim();
  const page = Number(first(params.page));

  const [data, canImport] = await Promise.all([
    loadAcademicStructureDirectoryPage({
      structureKind: kind,
      year,
      page,
      query,
      status,
      availability,
    }),
    canManageCatalogueImports(),
  ]);

  return (
    <StructureDirectoryList
      key={`${kind}-${year}`}
      canImport={canImport}
      data={data}
      modelOptions={configuredOpenRouterModels()}
      queueEnabled={academicStructureImportQueuesEnabled()}
      searchParams={{
        kind,
        year: String(year),
        ...(query ? { q: query } : {}),
        ...(status === "all" ? {} : { status }),
        ...(availability === "all" ? {} : { availability }),
      }}
    />
  );
}
