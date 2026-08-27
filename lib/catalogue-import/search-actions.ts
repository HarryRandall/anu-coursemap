"use server";

import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ImportSearchResult = {
  code: string;
  subject: string | null;
  title: string | null;
  /** Catalogue years with a full course version, newest first. */
  years: number[];
};

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/u;

const DEMO_RESULTS: ImportSearchResult[] = [
  {
    code: "COMP1100",
    subject: "COMP",
    title: "Programming as Problem Solving",
    years: [2027, 2026],
  },
  {
    code: "COMP1110",
    subject: "COMP",
    title: "Structured Programming",
    years: [2027],
  },
  {
    code: "COMP2100",
    subject: "COMP",
    title: "Software Design Methodologies",
    years: [2026],
  },
];

/**
 * Searches the directory index and any full course versions already held.
 * Directory-only hits show as New; years with a version show as Update.
 */
export async function searchImportableCourses(
  query: string,
): Promise<ImportSearchResult[]> {
  const term = query.trim().toUpperCase();
  if (term.length < 2) return [];
  if (!(await canManageCatalogueImports())) return [];
  if (isDemoMode()) {
    return DEMO_RESULTS.filter(
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
      { data: byTitle, error: titleError },
    ] = await Promise.all([
      supabase
        .from("catalogue_directory_courses")
        .select("code,title")
        .ilike("code", `%${term}%`)
        .limit(25),
      supabase
        .from("catalogue_directory_courses")
        .select("code,title")
        .ilike("title", `%${term}%`)
        .limit(50),
      supabase
        .from("courses")
        .select("id,code")
        .ilike("code", `%${term}%`)
        .limit(25),
      supabase
        .from("course_versions")
        .select("course_id,title")
        .ilike("title", `%${term}%`)
        .limit(50),
    ]);
    if (dirCodeError) throw dirCodeError;
    if (dirTitleError) throw dirTitleError;
    if (codeError) throw codeError;
    if (titleError) throw titleError;

    const directoryTitle = new Map<string, string>();
    for (const row of [...(dirByCode ?? []), ...(dirByTitle ?? [])]) {
      if (!directoryTitle.has(row.code))
        directoryTitle.set(row.code, row.title);
    }

    const titleMatchedCourseIds = [
      ...new Set((byTitle ?? []).map((row) => row.course_id)),
    ];
    const { data: titleCourses, error: titleCoursesError } =
      titleMatchedCourseIds.length > 0
        ? await supabase
            .from("courses")
            .select("id,code")
            .in("id", titleMatchedCourseIds)
        : { data: [], error: null };
    if (titleCoursesError) throw titleCoursesError;

    const courseByCode = new Map<string, number>();
    for (const course of [...(byCode ?? []), ...(titleCourses ?? [])]) {
      courseByCode.set(course.code, course.id);
    }

    const codes = [
      ...new Set([...directoryTitle.keys(), ...courseByCode.keys()]),
    ]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 25);
    if (codes.length === 0) return [];

    const courseIds = codes
      .map((code) => courseByCode.get(code))
      .filter((id): id is number => id != null);

    const { data: versions, error: versionsError } =
      courseIds.length > 0
        ? await supabase
            .from("course_versions")
            .select("course_id,title,subject,catalogue_year_id")
            .in("course_id", courseIds)
        : { data: [], error: null };
    if (versionsError) throw versionsError;

    const { data: years, error: yearsError } = await supabase
      .from("catalogue_years")
      .select("id,year");
    if (yearsError) throw yearsError;
    const yearById = new Map((years ?? []).map((row) => [row.id, row.year]));
    const codeById = new Map(
      [...courseByCode.entries()].map(([code, id]) => [id, code]),
    );

    const byCourse = new Map<
      string,
      {
        subject: string | null;
        title: string | null;
        years: Set<number>;
      }
    >();
    for (const version of versions ?? []) {
      const code = codeById.get(version.course_id);
      if (!code) continue;
      const year = yearById.get(version.catalogue_year_id);
      const existing = byCourse.get(code) ?? {
        subject: version.subject,
        title: version.title,
        years: new Set<number>(),
      };
      if (year != null) existing.years.add(year);
      if (year != null && [...existing.years].every((held) => held <= year)) {
        existing.subject = version.subject;
        existing.title = version.title;
      }
      byCourse.set(code, existing);
    }

    return codes.map((code) => {
      const version = byCourse.get(code);
      const held = version ? [...version.years].sort((a, b) => b - a) : [];
      return {
        code,
        subject: version?.subject ?? code.slice(0, 4),
        title: version?.title ?? directoryTitle.get(code) ?? null,
        years: held,
      };
    });
  } catch {
    return [];
  }
}

export async function isImportableCourseCode(code: string) {
  return COURSE_CODE_PATTERN.test(code.trim().toUpperCase());
}

export type ProgrammeImportSearchResult = {
  code: string;
  kind: string | null;
  title: string | null;
  years: number[];
};

const PROGRAMME_CODE_PATTERN = /^[A-Z0-9-]{4,}$/u;

const DEMO_PROGRAMME_RESULTS: ProgrammeImportSearchResult[] = [
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

/**
 * Searches the programme directory and any structure versions already held.
 */
export async function searchImportableProgrammes(
  query: string,
): Promise<ProgrammeImportSearchResult[]> {
  const term = query.trim().toUpperCase();
  if (term.length < 2) return [];
  if (!(await canManageCatalogueImports())) return [];
  if (isDemoMode()) {
    return DEMO_PROGRAMME_RESULTS.filter(
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
      const held = version ? [...version.years].sort((a, b) => b - a) : [];
      return {
        code,
        kind: structureByCode.get(code)?.kind ?? directory?.kind ?? null,
        title: version?.title ?? directory?.title ?? null,
        years: held,
      };
    });
  } catch {
    return [];
  }
}

export async function isImportableProgrammeCode(code: string) {
  return PROGRAMME_CODE_PATTERN.test(code.trim().toUpperCase());
}
