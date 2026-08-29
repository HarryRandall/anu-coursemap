"use server";

import {
  canManageCatalogueImports,
  canManageCourseImports,
  canWriteCourses,
} from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type RequisiteCourseSearchResult = {
  code: string;
  subject: string | null;
  title: string | null;
  /** Academic years with a native course-year record, newest first. */
  years: number[];
};

/** Search the native lightweight directory for requisite editing. */
export async function searchRequisiteCourses(
  query: string,
): Promise<RequisiteCourseSearchResult[]> {
  const term = query.trim().toUpperCase();
  if (term.length < 2) return [];
  if (!(await canWriteCourses()) && !(await canManageCourseImports())) {
    return [];
  }
  if (isDemoMode()) return [];

  try {
    const supabase = await createClient();
    const [
      { data: byCode, error: codeError },
      { data: byTitle, error: titleError },
    ] = await Promise.all([
      supabase
        .from("course_directory_entries")
        .select("academic_year_id,code,course_id,title")
        .eq("is_current", true)
        .ilike("code", `%${term}%`)
        .limit(25),
      supabase
        .from("course_directory_entries")
        .select("academic_year_id,code,course_id,title")
        .eq("is_current", true)
        .ilike("title", `%${term}%`)
        .limit(50),
    ]);
    if (codeError) throw codeError;
    if (titleError) throw titleError;

    const entries = new Map<
      string,
      { courseId: number | null; title: string }
    >();
    for (const row of [...(byCode ?? []), ...(byTitle ?? [])]) {
      if (!entries.has(row.code)) {
        entries.set(row.code, { courseId: row.course_id, title: row.title });
      }
    }
    const codes = [...entries.keys()]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 25);
    const courseIds = codes
      .map((code) => entries.get(code)?.courseId)
      .filter((id): id is number => id !== null && id !== undefined);
    const { data: courseYears, error: courseYearsError } = courseIds.length
      ? await supabase
          .from("course_years")
          .select("academic_year_id,course_id")
          .in("course_id", courseIds)
      : { data: [], error: null };
    if (courseYearsError) throw courseYearsError;
    const academicYearIds = [
      ...new Set((courseYears ?? []).map((row) => row.academic_year_id)),
    ];
    const { data: academicYears, error: academicYearsError } =
      academicYearIds.length
        ? await supabase
            .from("academic_years")
            .select("id,year")
            .in("id", academicYearIds)
        : { data: [], error: null };
    if (academicYearsError) throw academicYearsError;
    const yearById = new Map(
      (academicYears ?? []).map((row) => [row.id, row.year]),
    );
    const yearsByCourseId = new Map<number, number[]>();
    for (const row of courseYears ?? []) {
      const year = yearById.get(row.academic_year_id);
      if (year === undefined) continue;
      const years = yearsByCourseId.get(row.course_id) ?? [];
      years.push(year);
      yearsByCourseId.set(row.course_id, years);
    }

    return codes.map((code) => {
      const entry = entries.get(code)!;
      return {
        code,
        subject: code.slice(0, 4),
        title: entry.title,
        years:
          entry.courseId === null
            ? []
            : (yearsByCourseId
                .get(entry.courseId)
                ?.sort((left, right) => right - left) ?? []),
      };
    });
  } catch {
    return [];
  }
}

export type RequisiteProgrammeSearchResult = {
  code: string;
  kind: string | null;
  title: string | null;
  years: number[];
};

const DEMO_REQUISITE_PROGRAMME_RESULTS: RequisiteProgrammeSearchResult[] = [
  {
    code: "BCOMP",
    kind: "degree",
    title: "Bachelor of Computing",
    years: [2027, 2026],
  },
  {
    code: "BACCT",
    kind: "degree",
    title: "Bachelor of Accounting",
    years: [2026],
  },
  {
    code: "SOFT-MAJ",
    kind: "major",
    title: "Software Development",
    years: [2026],
  },
];

/** Searches saved programme references for requisite editing. */
export async function searchRequisiteProgrammes(
  query: string,
): Promise<RequisiteProgrammeSearchResult[]> {
  const term = query.trim().toUpperCase();
  if (term.length < 2) return [];
  if (!(await canManageCatalogueImports())) return [];
  if (isDemoMode()) {
    return DEMO_REQUISITE_PROGRAMME_RESULTS.filter(
      (result) =>
        result.code.includes(term) ||
        (result.title?.toUpperCase().includes(term) ?? false),
    );
  }

  try {
    const supabase = await createClient();
    const [
      { data: dirByCode, error: dirCodeError },
      { data: dirByTitle, error: dirTitleError },
      { data: byCode, error: codeError },
      { data: byName, error: nameError },
    ] = await Promise.all([
      supabase
        .from("catalogue_directory_programmes")
        .select("code,title,kind")
        .ilike("code", `%${term}%`)
        .limit(25),
      supabase
        .from("catalogue_directory_programmes")
        .select("code,title,kind")
        .ilike("title", `%${term}%`)
        .limit(50),
      supabase
        .from("academic_structures")
        .select("id,code,kind")
        .ilike("code", `%${term}%`)
        .limit(25),
      supabase
        .from("academic_structure_versions")
        .select("structure_id")
        .ilike("name", `%${term}%`)
        .limit(50),
    ]);
    if (dirCodeError) throw dirCodeError;
    if (dirTitleError) throw dirTitleError;
    if (codeError) throw codeError;
    if (nameError) throw nameError;

    const directoryByCode = new Map<
      string,
      { title: string; kind: string | null }
    >();
    for (const row of [...(dirByCode ?? []), ...(dirByTitle ?? [])]) {
      if (!directoryByCode.has(row.code)) {
        directoryByCode.set(row.code, { title: row.title, kind: row.kind });
      }
    }

    const nameMatchedIds = [
      ...new Set((byName ?? []).map((row) => row.structure_id)),
    ];
    const { data: nameStructures, error: nameStructuresError } =
      nameMatchedIds.length > 0
        ? await supabase
            .from("academic_structures")
            .select("id,code,kind")
            .in("id", nameMatchedIds)
        : { data: [], error: null };
    if (nameStructuresError) throw nameStructuresError;

    const structureByCode = new Map<
      string,
      { id: number; kind: string | null }
    >();
    for (const structure of [...(byCode ?? []), ...(nameStructures ?? [])]) {
      structureByCode.set(structure.code, {
        id: structure.id,
        kind: structure.kind,
      });
    }

    const codes = [
      ...new Set([...directoryByCode.keys(), ...structureByCode.keys()]),
    ]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 25);
    if (codes.length === 0) return [];

    const structureIds = codes
      .map((code) => structureByCode.get(code)?.id)
      .filter((id): id is number => id != null);
    const { data: versions, error: versionsError } =
      structureIds.length > 0
        ? await supabase
            .from("academic_structure_versions")
            .select("structure_id,name,catalogue_year_id")
            .in("structure_id", structureIds)
        : { data: [], error: null };
    if (versionsError) throw versionsError;

    const { data: years, error: yearsError } = await supabase
      .from("catalogue_years")
      .select("id,year");
    if (yearsError) throw yearsError;
    const yearById = new Map((years ?? []).map((row) => [row.id, row.year]));
    const codeById = new Map(
      [...structureByCode.entries()].map(([code, value]) => [value.id, code]),
    );

    const byStructure = new Map<
      string,
      { title: string | null; years: Set<number> }
    >();
    for (const version of versions ?? []) {
      const code = codeById.get(version.structure_id);
      if (!code) continue;
      const year = yearById.get(version.catalogue_year_id);
      const existing = byStructure.get(code) ?? {
        title: version.name,
        years: new Set<number>(),
      };
      if (year != null) existing.years.add(year);
      if (year != null && [...existing.years].every((held) => held <= year)) {
        existing.title = version.name;
      }
      byStructure.set(code, existing);
    }

    return codes.map((code) => {
      const version = byStructure.get(code);
      const directory = directoryByCode.get(code);
      return {
        code,
        kind: structureByCode.get(code)?.kind ?? directory?.kind ?? null,
        title: version?.title ?? directory?.title ?? null,
        years: version
          ? [...version.years].sort((left, right) => right - left)
          : [],
      };
    });
  } catch {
    return [];
  }
}
