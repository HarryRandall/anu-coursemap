import "server-only";

import type { Database } from "@/types/database";
import type { AcademicStructureKind } from "@/lib/structure-import/contract";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const ACADEMIC_STRUCTURE_IMPORT_YEARS = Array.from(
  { length: 11 },
  (_, index) => 2020 + index,
);

export type AcademicStructureDirectoryStatus =
  | "all"
  | "directory"
  | "queued"
  | "processing"
  | "needs-review"
  | "draft"
  | "draft-changes"
  | "published"
  | "unchanged"
  | "failed";

export type AcademicStructureDirectoryAvailability =
  "all" | "available" | "unavailable";

export type AcademicStructureYearOption = {
  id: number | null;
  year: number;
  importEnabled: boolean;
  sourceAvailability: "available" | "unavailable" | "unknown";
  availabilityCheckedAt: string | null;
  availabilityNote: string | null;
  directoryRefreshedAt: string | null;
  receivedCount: number | null;
  uniqueCount: number | null;
};

export type AcademicStructureDirectoryRecord = {
  id: number;
  kind: AcademicStructureKind;
  code: string;
  title: string;
  shortTitle: string | null;
  academicCareer: string | null;
  durationYears: number | null;
  units: number | null;
  modeOfDelivery: string | null;
  selectionRank: number | null;
  sourceUrl: string;
  isAvailable: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  structureId: number | null;
  structurePublicId: string | null;
  structureYearId: number | null;
  draftSnapshotId: number | null;
  publishedSnapshotId: number | null;
  importStatus: Exclude<AcademicStructureDirectoryStatus, "all">;
  latestImport: {
    runId: string;
    runNumber: number;
    targetId: string;
    processingStatus: string;
    reviewStatus: string;
    changeKind: string | null;
    errorSummary: string | null;
    createdAt: string;
  } | null;
};

export type AcademicStructureDirectoryPage = {
  kind: AcademicStructureKind;
  year: AcademicStructureYearOption;
  years: AcademicStructureYearOption[];
  records: AcademicStructureDirectoryRecord[];
  page: number;
  pageSize: number;
  total: number;
  activeRun: {
    id: string;
    runNumber: number;
    status: string;
    structureKind: AcademicStructureKind;
    targetCount: number;
    processedCount: number;
  } | null;
};

type DirectoryEntryRow =
  Database["public"]["Tables"]["academic_structure_directory_entries"]["Row"];
type ImportTargetRow =
  Database["public"]["Tables"]["academic_structure_import_targets"]["Row"];
type ImportRunRow =
  Database["public"]["Tables"]["academic_structure_import_runs"]["Row"];
type AcademicStructureRow =
  Database["public"]["Tables"]["academic_structures"]["Row"];
type AcademicStructureYearRow =
  Database["public"]["Tables"]["academic_structure_years"]["Row"];

function safePage(value: number | undefined) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 1;
}

function safeSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .slice(0, 120)
    .replace(/[^A-Za-z0-9 &-]/gu, " ")
    .replace(/\s+/gu, " ");
}

function normaliseAvailability(value: string | null | undefined) {
  return value === "available" || value === "unavailable" ? value : "unknown";
}

function defaultYear(year: number): AcademicStructureYearOption {
  return {
    id: null,
    year,
    importEnabled: false,
    sourceAvailability: "unknown",
    availabilityCheckedAt: null,
    availabilityNote: null,
    directoryRefreshedAt: null,
    receivedCount: null,
    uniqueCount: null,
  };
}

export function academicStructureDirectoryRecordStatus(
  record: Pick<
    AcademicStructureDirectoryRecord,
    "draftSnapshotId" | "latestImport" | "publishedSnapshotId"
  >,
): Exclude<AcademicStructureDirectoryStatus, "all"> {
  const latest = record.latestImport;
  if (latest?.processingStatus === "queued") return "queued";
  if (latest?.processingStatus === "running") return "processing";
  if (
    latest?.processingStatus === "failed" ||
    latest?.processingStatus === "cancelled"
  ) {
    return "failed";
  }
  if (latest?.reviewStatus === "needs_review") return "needs-review";
  if (
    record.draftSnapshotId !== null &&
    record.publishedSnapshotId !== null &&
    record.draftSnapshotId !== record.publishedSnapshotId
  ) {
    return "draft-changes";
  }
  if (record.publishedSnapshotId !== null) return "published";
  if (record.draftSnapshotId !== null) return "draft";
  if (
    latest?.reviewStatus === "unchanged" ||
    latest?.changeKind === "unchanged"
  ) {
    return "unchanged";
  }
  return "directory";
}

export async function loadAcademicStructureYearOptions(
  structureKind: AcademicStructureKind,
): Promise<AcademicStructureYearOption[]> {
  if (isDemoMode()) {
    return ACADEMIC_STRUCTURE_IMPORT_YEARS.toReversed().map(defaultYear);
  }

  const supabase = await createClient();
  const { data: years, error: yearsError } = await supabase
    .from("academic_years")
    .select("id,year,is_import_enabled")
    .gte("year", ACADEMIC_STRUCTURE_IMPORT_YEARS[0]!)
    .lte("year", ACADEMIC_STRUCTURE_IMPORT_YEARS.at(-1)!)
    .order("year", { ascending: false });
  if (yearsError) throw yearsError;

  const yearIds = (years ?? []).map((year) => year.id);
  const { data: statuses, error: statusesError } = yearIds.length
    ? await supabase
        .from("academic_structure_directory_statuses")
        .select(
          "academic_year_id,availability_checked_at,availability_note,directory_refreshed_at,received_count,source_availability,unique_count",
        )
        .eq("structure_kind", structureKind)
        .in("academic_year_id", yearIds)
    : { data: [], error: null };
  if (statusesError) throw statusesError;

  const yearByNumber = new Map((years ?? []).map((year) => [year.year, year]));
  const statusByYearId = new Map(
    (statuses ?? []).map((status) => [status.academic_year_id, status]),
  );
  return ACADEMIC_STRUCTURE_IMPORT_YEARS.toReversed().map((year) => {
    const row = yearByNumber.get(year);
    if (!row) return defaultYear(year);
    const status = statusByYearId.get(row.id);
    return {
      id: row.id,
      year: row.year,
      importEnabled: row.is_import_enabled,
      sourceAvailability: normaliseAvailability(status?.source_availability),
      availabilityCheckedAt: status?.availability_checked_at ?? null,
      availabilityNote: status?.availability_note ?? null,
      directoryRefreshedAt: status?.directory_refreshed_at ?? null,
      receivedCount: status?.received_count ?? null,
      uniqueCount: status?.unique_count ?? null,
    };
  });
}

function latestTargetsByDirectoryEntry(targets: ImportTargetRow[]) {
  const latest = new Map<number, ImportTargetRow>();
  for (const target of targets) {
    if (!latest.has(target.directory_entry_id)) {
      latest.set(target.directory_entry_id, target);
    }
  }
  return latest;
}

export async function loadAcademicStructureDirectoryPage({
  structureKind,
  year,
  page,
  query,
  status = "all",
  availability = "all",
  pageSize = 50,
}: {
  structureKind: AcademicStructureKind;
  year: number;
  page?: number;
  query?: string;
  status?: AcademicStructureDirectoryStatus;
  availability?: AcademicStructureDirectoryAvailability;
  pageSize?: number;
}): Promise<AcademicStructureDirectoryPage> {
  const currentPage = safePage(page);
  const currentPageSize = Math.min(100, Math.max(10, Math.floor(pageSize)));
  const years = await loadAcademicStructureYearOptions(structureKind);
  const selectedYear =
    years.find((option) => option.year === year) ?? years[0]!;

  if (isDemoMode() || selectedYear.id === null) {
    return {
      kind: structureKind,
      year: selectedYear,
      years,
      records: [],
      page: currentPage,
      pageSize: currentPageSize,
      total: 0,
      activeRun: null,
    };
  }

  const supabase = await createClient();
  const activeRunPromise = supabase
    .from("academic_structure_import_runs")
    .select(
      "id,run_number,status,structure_kind,target_count,succeeded_count,failed_count,cancelled_count",
    )
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let entriesQuery = supabase
    .from("academic_structure_directory_entries")
    .select("*")
    .eq("academic_year_id", selectedYear.id)
    .eq("structure_kind", structureKind);
  if (availability === "available") {
    entriesQuery = entriesQuery.eq("is_available", true);
  } else if (availability === "unavailable") {
    entriesQuery = entriesQuery.eq("is_available", false);
  }
  const search = safeSearch(query);
  if (search) {
    entriesQuery = entriesQuery.or(
      `code.ilike.*${search}*,title.ilike.*${search}*,short_title.ilike.*${search}*`,
    );
  }

  const [entriesResult, activeRunResult] = await Promise.all([
    entriesQuery.order("code").limit(2000),
    activeRunPromise,
  ]);
  if (entriesResult.error) throw entriesResult.error;
  if (activeRunResult.error) throw activeRunResult.error;

  const entries = (entriesResult.data ?? []) as DirectoryEntryRow[];
  const entryIds = entries.map((entry) => entry.id);
  const { data: targetsData, error: targetsError } = entryIds.length
    ? await supabase
        .from("academic_structure_import_targets")
        .select("*")
        .eq("structure_kind", structureKind)
        .in("directory_entry_id", entryIds)
        .order("created_at", { ascending: false })
        .limit(5000)
    : { data: [], error: null };
  if (targetsError) throw targetsError;
  const targets = (targetsData ?? []) as ImportTargetRow[];
  const latestTargetByEntryId = latestTargetsByDirectoryEntry(targets);
  const runIds = [...new Set(targets.map((target) => target.run_id))];
  const { data: runsData, error: runsError } = runIds.length
    ? await supabase
        .from("academic_structure_import_runs")
        .select("*")
        .in("id", runIds)
    : { data: [], error: null };
  if (runsError) throw runsError;
  const runById = new Map(
    ((runsData ?? []) as ImportRunRow[]).map((run) => [run.id, run]),
  );

  const codes = entries.map((entry) => entry.code);
  const { data: structuresData, error: structuresError } = codes.length
    ? await supabase
        .from("academic_structures")
        .select("id,public_id,code,kind,created_at,updated_at")
        .eq("kind", structureKind)
        .in("code", codes)
    : { data: [], error: null };
  if (structuresError) throw structuresError;
  const structures = (structuresData ?? []) as AcademicStructureRow[];
  const structureByCode = new Map(
    structures.map((structure) => [structure.code, structure]),
  );
  const structureIds = structures.map((structure) => structure.id);
  const { data: structureYearsData, error: structureYearsError } =
    structureIds.length
      ? await supabase
          .from("academic_structure_years")
          .select("*")
          .eq("academic_year_id", selectedYear.id)
          .in("structure_id", structureIds)
      : { data: [], error: null };
  if (structureYearsError) throw structureYearsError;
  const structureYearByStructureId = new Map(
    ((structureYearsData ?? []) as AcademicStructureYearRow[]).map(
      (structureYear) => [structureYear.structure_id, structureYear],
    ),
  );

  const records = entries.map((entry) => {
    const latestTarget = latestTargetByEntryId.get(entry.id) ?? null;
    const latestRun = latestTarget
      ? (runById.get(latestTarget.run_id) ?? null)
      : null;
    const structure = structureByCode.get(entry.code) ?? null;
    const structureYear = structure
      ? (structureYearByStructureId.get(structure.id) ?? null)
      : null;
    const latestImport =
      latestTarget && latestRun
        ? {
            runId: latestRun.id,
            runNumber: latestRun.run_number,
            targetId: latestTarget.id,
            processingStatus: latestTarget.processing_status,
            reviewStatus: latestTarget.review_status,
            changeKind: latestTarget.change_kind,
            errorSummary: latestTarget.error_summary,
            createdAt: latestTarget.created_at,
          }
        : null;
    const record: AcademicStructureDirectoryRecord = {
      id: entry.id,
      kind: structureKind,
      code: entry.code,
      title: entry.title,
      shortTitle: entry.short_title,
      academicCareer: entry.academic_career,
      durationYears: entry.duration_years,
      units: entry.units,
      modeOfDelivery: entry.mode_of_delivery,
      selectionRank: entry.selection_rank,
      sourceUrl: entry.source_url,
      isAvailable: entry.is_available,
      firstSeenAt: entry.first_seen_at,
      lastSeenAt: entry.last_seen_at,
      structureId: structure?.id ?? null,
      structurePublicId: structure?.public_id ?? null,
      structureYearId: structureYear?.id ?? null,
      draftSnapshotId: structureYear?.draft_snapshot_id ?? null,
      publishedSnapshotId: structureYear?.published_snapshot_id ?? null,
      importStatus: "directory",
      latestImport,
    };
    record.importStatus = academicStructureDirectoryRecordStatus(record);
    return record;
  });
  const filteredRecords =
    status === "all"
      ? records
      : records.filter((record) => record.importStatus === status);
  const start = (currentPage - 1) * currentPageSize;
  const activeRun = activeRunResult.data;

  return {
    kind: structureKind,
    year: selectedYear,
    years,
    records: filteredRecords.slice(start, start + currentPageSize),
    page: currentPage,
    pageSize: currentPageSize,
    total: filteredRecords.length,
    activeRun: activeRun
      ? {
          id: activeRun.id,
          runNumber: activeRun.run_number,
          status: activeRun.status,
          structureKind: activeRun.structure_kind as AcademicStructureKind,
          targetCount: activeRun.target_count,
          processedCount:
            activeRun.succeeded_count +
            activeRun.failed_count +
            activeRun.cancelled_count,
        }
      : null,
  };
}
