"use server";

import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ImportSearchResult = {
  code: string;
  imported: boolean;
  subject: string | null;
  title: string | null;
  year: number | null;
};

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/u;

const DEMO_RESULTS: ImportSearchResult[] = [
  {
    code: "COMP1100",
    imported: true,
    subject: "COMP",
    title: "Programming as Problem Solving",
    year: 2026,
  },
  {
    code: "COMP1110",
    imported: true,
    subject: "COMP",
    title: "Structured Programming",
    year: 2026,
  },
  {
    code: "COMP2100",
    imported: false,
    subject: "COMP",
    title: "Software Design Methodologies",
    year: 2026,
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
    return DEMO_RESULTS.filter((result) => result.code.includes(term));
  }

  try {
    const supabase = await createClient();
    const { data: courses, error } = await supabase
      .from("courses")
      .select("id,code")
      .ilike("code", `%${term}%`)
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

    // Keep the newest catalogue year per course so the row says which version
    // Coursemap is actually holding.
    const latestByCourse = new Map<
      number,
      { subject: string | null; title: string | null; year: number | null }
    >();
    for (const version of versions ?? []) {
      const year = yearById.get(version.catalogue_year_id) ?? null;
      const existing = latestByCourse.get(version.course_id);
      if (existing && (existing.year ?? 0) >= (year ?? 0)) continue;
      latestByCourse.set(version.course_id, {
        subject: version.subject,
        title: version.title,
        year,
      });
    }

    return rows.map((course) => {
      const version = latestByCourse.get(course.id);
      return {
        code: course.code,
        imported: version !== undefined,
        subject: version?.subject ?? null,
        title: version?.title ?? null,
        year: version?.year ?? null,
      };
    });
  } catch {
    return [];
  }
}

export async function isImportableCourseCode(code: string) {
  return COURSE_CODE_PATTERN.test(code.trim().toUpperCase());
}
