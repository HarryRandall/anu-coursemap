import type { AcademicStructureKind } from "@/lib/structure-import/contract";

const ADMIN_COLLECTION_PATHS = {
  programme: "/admin/programmes",
  major: "/admin/majors",
  minor: "/admin/minors",
  specialisation: "/admin/specialisations",
} as const satisfies Record<AcademicStructureKind, string>;

const LEGACY_COLLECTION_FILTER_KEYS = [
  "availability",
  "page",
  "q",
  "status",
  "year",
] as const;

type LegacyCollectionSearchParams = Partial<
  Record<
    (typeof LEGACY_COLLECTION_FILTER_KEYS)[number] | "kind",
    string | string[]
  >
>;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function adminAcademicStructureCollectionPath(
  kind: AcademicStructureKind,
) {
  return ADMIN_COLLECTION_PATHS[kind];
}

export function adminAcademicStructureDetailPath({
  kind,
  publicId,
  year,
}: {
  kind: AcademicStructureKind;
  publicId: string;
  year?: number;
}) {
  const pathname = `${adminAcademicStructureCollectionPath(kind)}/${encodeURIComponent(publicId)}`;
  return year === undefined ? pathname : `${pathname}?year=${year}`;
}

/**
 * Migrates the former programme-directory query route to the collection route
 * that now owns the selected structure kind. Returns null for a current URL.
 */
export function legacyAdminAcademicStructureCollectionRedirect(
  searchParams: LegacyCollectionSearchParams,
) {
  const legacyKind = firstSearchParam(searchParams.kind);
  if (legacyKind === undefined) return null;

  const kind = (
    Object.hasOwn(ADMIN_COLLECTION_PATHS, legacyKind) ? legacyKind : "programme"
  ) as AcademicStructureKind;
  const redirected = new URLSearchParams();
  for (const key of LEGACY_COLLECTION_FILTER_KEYS) {
    const value = firstSearchParam(searchParams[key]);
    if (value) redirected.set(key, value);
  }
  const query = redirected.toString();
  return `${adminAcademicStructureCollectionPath(kind)}${query ? `?${query}` : ""}`;
}

export function allAdminAcademicStructureCollectionPaths() {
  return Object.values(ADMIN_COLLECTION_PATHS);
}
