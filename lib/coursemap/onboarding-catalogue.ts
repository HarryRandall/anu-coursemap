import "server-only";

import { createPublicClient } from "@/lib/supabase/public-server";

export type CatalogueYearOption = {
  id: number;
  year: number;
};

export type ProgrammeOption = {
  catalogueYear: number;
  code: string;
  description: string;
  durationYears: number | null;
  majorCodes: string[];
  name: string;
  units: number;
};

export type OnboardingCatalogue = {
  catalogueYears: CatalogueYearOption[];
  degrees: ProgrammeOption[];
  majors: ProgrammeOption[];
};

type StructureIdentityRow = { code: string; id: number; kind: string };
type StructureVersionRow = {
  catalogue_year_id: number;
  description: string;
  duration_years: number | null;
  id: number;
  name: string;
  structure_id: number;
  units: number;
};
type StructureRelationshipRow = {
  child_structure_version_id: number;
  parent_structure_version_id: number;
};

/**
 * The source of truth for student programme choices. Only catalogue records
 * intentionally published to students may appear here.
 */
export async function loadOnboardingCatalogue(): Promise<OnboardingCatalogue> {
  const supabase = createPublicClient();
  const [yearsResult, versionsResult] = await Promise.all([
    supabase
      .from("catalogue_years")
      .select("id,year")
      .eq("status", "published")
      .order("year", { ascending: false }),
    supabase
      .from("academic_structure_versions")
      .select(
        "catalogue_year_id,description,duration_years,id,name,structure_id,units",
      )
      .eq("publication_status", "published"),
  ]);
  if (yearsResult.error) throw yearsResult.error;
  if (versionsResult.error) throw versionsResult.error;

  const versions = (versionsResult.data ?? []) as StructureVersionRow[];
  const structureIds = [
    ...new Set(versions.map((version) => version.structure_id)),
  ];
  const { data: identities, error: identitiesError } = structureIds.length
    ? await supabase
        .from("academic_structures")
        .select("code,id,kind")
        .in("id", structureIds)
    : { data: [], error: null };
  if (identitiesError) throw identitiesError;

  const versionIds = versions.map((version) => version.id);
  const { data: relationships, error: relationshipsError } = versionIds.length
    ? await supabase
        .from("academic_structure_relationships")
        .select("child_structure_version_id,parent_structure_version_id")
        .in("parent_structure_version_id", versionIds)
    : { data: [], error: null };
  if (relationshipsError) throw relationshipsError;

  const identityById = new Map(
    ((identities ?? []) as StructureIdentityRow[]).map((identity) => [
      identity.id,
      identity,
    ]),
  );
  const catalogueYearById = new Map(
    ((yearsResult.data ?? []) as CatalogueYearOption[]).map((year) => [
      year.id,
      year.year,
    ]),
  );
  const majorCodesByDegreeVersion = new Map<number, string[]>();
  const versionById = new Map(versions.map((version) => [version.id, version]));
  for (const relationship of (relationships ??
    []) as StructureRelationshipRow[]) {
    const child = versionById.get(relationship.child_structure_version_id);
    const identity = child && identityById.get(child.structure_id);
    if (!identity || identity.kind !== "major") continue;
    const current =
      majorCodesByDegreeVersion.get(relationship.parent_structure_version_id) ??
      [];
    majorCodesByDegreeVersion.set(relationship.parent_structure_version_id, [
      ...current,
      identity.code,
    ]);
  }
  const options = (kind: "degree" | "major") =>
    versions
      .flatMap((version) => {
        const identity = identityById.get(version.structure_id);
        const catalogueYear = catalogueYearById.get(version.catalogue_year_id);
        if (!identity || !catalogueYear || identity.kind !== kind) return [];
        return [
          {
            catalogueYear,
            code: identity.code,
            description: version.description,
            durationYears: version.duration_years,
            majorCodes:
              kind === "degree"
                ? (majorCodesByDegreeVersion.get(version.id) ?? []).sort()
                : [],
            name: version.name,
            units: version.units,
          } satisfies ProgrammeOption,
        ];
      })
      .sort((left, right) => left.name.localeCompare(right.name));

  return {
    catalogueYears: (yearsResult.data ?? []) as CatalogueYearOption[],
    degrees: options("degree"),
    majors: options("major"),
  };
}
