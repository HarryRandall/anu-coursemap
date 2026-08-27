"use server";

import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ImportSearchResult = {
  code: string;
  subject: string | null;
  title: string | null;
  /** Catalogue years already stored for this course, newest first. */
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
 * Searches what Coursemap already holds so a re-import can be picked from a
 * list rather than retyped. A course that has never been imported will not
 * appear here at all -- that is the normal case for a first import, so the
 * caller also offers any well-formed code the search did not match.
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
    const [{ data: byCode, error: codeError }, { data: byTitle, error: titleError }] =
      await Promise.all([
        supabase
          .from("courses")
          .select("id")
          .ilike("code", `%${term}%`)
          .limit(25),
        supabase
          .from("course_versions")
          .select("course_id")
          .ilike("title", `%${term}%`)
          .limit(50),
      ]);
    if (codeError) throw codeError;
    if (titleError) throw titleError;

    const matchedIds = [
      ...new Set([
        ...(byCode ?? []).map((course) => course.id),
        ...(byTitle ?? []).map((version) => version.course_id),
      ]),
    ];
    if (matchedIds.length === 0) return [];

    const { data: courses, error } = await supabase
      .from("courses")
      .select("id,code")
      .in("id", matchedIds)
      .order("code")
      .limit(25);
    if (error) throw error;

    const rows = courses ?? [];
    if (rows.length === 0) return [];

    const { data: versions, error: versionsError } = await supabase
      .from("course_versions")
      .select("course_id,title,subject,catalogue_year_id")
      .in(
        "course_id",
        rows.map((course) => course.id),
      );
    if (versionsError) throw versionsError;

    const { data: years, error: yearsError } = await supabase
      .from("catalogue_years")
      .select("id,year");
    if (yearsError) throw yearsError;
    const yearById = new Map((years ?? []).map((row) => [row.id, row.year]));

    const byCourse = new Map<
      number,
      {
        subject: string | null;
        title: string | null;
        years: Set<number>;
      }
    >();
    for (const version of versions ?? []) {
      const year = yearById.get(version.catalogue_year_id);
      const existing = byCourse.get(version.course_id) ?? {
        subject: version.subject,
        title: version.title,
        years: new Set<number>(),
      };
      if (year != null) existing.years.add(year);
      // Prefer the newest year's title when several versions exist.
      if (
        year != null &&
        [...existing.years].every((held) => held <= year)
      ) {
        existing.subject = version.subject;
        existing.title = version.title;
      }
      byCourse.set(version.course_id, existing);
    }

    return rows.map((course) => {
      const version = byCourse.get(course.id);
      const held = version ? [...version.years].sort((a, b) => b - a) : [];
      return {
        code: course.code,
        subject: version?.subject ?? null,
        title: version?.title ?? null,
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
 * Searches programmes Coursemap already holds. Unknown codes are still
 * offered by the picker when the typed value looks like an ANU programme code.
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
      { data: byCode, error: codeError },
      { data: byName, error: nameError },
    ] = await Promise.all([
      supabase
        .from("academic_structures")
        .select("id")
        .ilike("code", `%${term}%`)
        .limit(25),
      supabase
        .from("academic_structure_versions")
        .select("structure_id")
        .ilike("name", `%${term}%`)
        .limit(50),
    ]);
    if (codeError) throw codeError;
    if (nameError) throw nameError;

    const matchedIds = [
      ...new Set([
        ...(byCode ?? []).map((structure) => structure.id),
        ...(byName ?? []).map((version) => version.structure_id),
      ]),
    ];
    if (matchedIds.length === 0) return [];

    const { data: structures, error } = await supabase
      .from("academic_structures")
      .select("id,code,kind")
      .in("id", matchedIds)
      .order("code")
      .limit(25);
    if (error) throw error;

    const rows = structures ?? [];
    if (rows.length === 0) return [];

    const { data: versions, error: versionsError } = await supabase
      .from("academic_structure_versions")
      .select("structure_id,name,catalogue_year_id")
      .in(
        "structure_id",
        rows.map((structure) => structure.id),
      );
    if (versionsError) throw versionsError;

    const { data: years, error: yearsError } = await supabase
      .from("catalogue_years")
      .select("id,year");
    if (yearsError) throw yearsError;
    const yearById = new Map((years ?? []).map((row) => [row.id, row.year]));

    const byStructure = new Map<
      number,
      { title: string | null; years: Set<number> }
    >();
    for (const version of versions ?? []) {
      const year = yearById.get(version.catalogue_year_id);
      const existing = byStructure.get(version.structure_id) ?? {
        title: version.name,
        years: new Set<number>(),
      };
      if (year != null) existing.years.add(year);
      if (
        year != null &&
        [...existing.years].every((held) => held <= year)
      ) {
        existing.title = version.name;
      }
      byStructure.set(version.structure_id, existing);
    }

    return rows.map((structure) => {
      const version = byStructure.get(structure.id);
      const held = version ? [...version.years].sort((a, b) => b - a) : [];
      return {
        code: structure.code,
        kind: structure.kind,
        title: version?.title ?? null,
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
