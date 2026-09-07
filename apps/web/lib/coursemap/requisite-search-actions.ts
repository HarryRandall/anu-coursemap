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
    kind: "programme",
    title: "Bachelor of Computing",
    years: [2027, 2026],
  },
  {
    code: "BACCT",
    kind: "programme",
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
      { data: byCode, error: codeError },
      { data: byTitle, error: titleError },
    ] = await Promise.all([
      supabase
        .from("academic_structure_directory_entries")
        .select("academic_year_id,code,structure_kind,title")
        .eq("is_available", true)
        .ilike("code", `%${term}%`)
        .limit(50),
      supabase
        .from("academic_structure_directory_entries")
        .select("academic_year_id,code,structure_kind,title")
        .eq("is_available", true)
        .ilike("title", `%${term}%`)
        .limit(50),
    ]);
    if (codeError) throw codeError;
    if (titleError) throw titleError;

    const entries = [...(byCode ?? []), ...(byTitle ?? [])];
    const codes = [...new Set(entries.map((entry) => entry.code))]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 25);
    if (codes.length === 0) return [];
    const academicYearIds = [
      ...new Set(entries.map((entry) => entry.academic_year_id)),
    ];
    const { data: years, error: yearsError } = await supabase
      .from("academic_years")
      .select("id,year")
      .in("id", academicYearIds);
    if (yearsError) throw yearsError;
    const yearById = new Map((years ?? []).map((row) => [row.id, row.year]));

    return codes.map((code) => {
      const matches = entries.filter((entry) => entry.code === code);
      const latest = [...matches].sort(
        (left, right) =>
          (yearById.get(right.academic_year_id) ?? 0) -
          (yearById.get(left.academic_year_id) ?? 0),
      )[0];
      return {
        code,
        kind: latest?.structure_kind ?? null,
        title: latest?.title ?? null,
        years: [
          ...new Set(
            matches.flatMap((entry) => {
              const year = yearById.get(entry.academic_year_id);
              return year === undefined ? [] : [year];
            }),
          ),
        ].sort((left, right) => right - left),
      };
    });
  } catch {
    return [];
  }
}
