import { NextResponse } from "next/server";
import { courses } from "@/lib/catalogue";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const sourceBaseUrl = "https://programsandcourses.anu.edu.au";
const courseCodePattern = /\b[A-Z]{4}\d{4}\b/g;

type CourseSearchResponse = {
  Items?: Array<{ CourseCode?: unknown }>;
};

type ImportedCourseCodes = {
  codes: Set<string>;
  comparison: "database" | "demo";
};

function parseProgrammeCodes(value: string | null) {
  if (!value) return [];
  return [...new Set(value.split(",").map((code) => code.trim().toUpperCase()))]
    .filter((code) => /^[A-Z0-9-]+$/.test(code))
    .slice(0, 20);
}

async function getImportedCourseCodes(
  year: number,
): Promise<ImportedCourseCodes> {
  if (isDemoMode()) {
    return {
      codes: new Set(
        courses
          .filter((course) => course.year === year)
          .map((course) => course.code),
      ),
      comparison: "demo",
    };
  }

  const supabase = await createClient();
  const { data: catalogueYear, error: catalogueYearError } = await supabase
    .from("catalogue_years")
    .select("id")
    .eq("year", year)
    .maybeSingle();

  if (catalogueYearError) throw catalogueYearError;
  if (!catalogueYear) return { codes: new Set(), comparison: "database" };

  const { data: versions, error: versionsError } = await supabase
    .from("course_versions")
    .select("course_id")
    .eq("catalogue_year_id", catalogueYear.id);
  if (versionsError) throw versionsError;

  const courseIds = [
    ...new Set((versions ?? []).map((version) => version.course_id)),
  ];
  if (courseIds.length === 0) {
    return { codes: new Set(), comparison: "database" };
  }

  const { data: importedCourses, error: importedCoursesError } = await supabase
    .from("courses")
    .select("code")
    .in("id", courseIds);
  if (importedCoursesError) throw importedCoursesError;

  return {
    codes: new Set((importedCourses ?? []).map((course) => course.code)),
    comparison: "database",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const target = searchParams.get("target");

  if (!Number.isInteger(year) || year < 2014 || year > 2026) {
    return NextResponse.json(
      { error: "Unsupported catalogue year." },
      { status: 400 },
    );
  }

  let imported: ImportedCourseCodes;
  try {
    imported = await getImportedCourseCodes(year);
  } catch {
    return NextResponse.json(
      { error: "Coursemap catalogue data is unavailable." },
      { status: 502 },
    );
  }

  if (target === "all") {
    const params = new URLSearchParams({
      SearchText: "",
      SelectedYear: String(year),
      PageIndex: "0",
      PageSize: "500",
      ShowAll: "true",
    });
    const response = await fetch(
      `${sourceBaseUrl}/data/CourseSearch/GetCourses?${params}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 60 * 60 },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "ANU course discovery is unavailable." },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as CourseSearchResponse;
    const discoveredCodes = new Set(
      (payload.Items ?? [])
        .map((item) => item.CourseCode)
        .filter((code): code is string => typeof code === "string"),
    );
    const existingCourses = [...discoveredCodes].filter((code) =>
      imported.codes.has(code),
    ).length;

    return NextResponse.json({
      programmes: null,
      coursePages: discoveredCodes.size,
      existingCourses,
      newCourses: discoveredCodes.size - existingCourses,
      isLowerBound: true,
      comparison: imported.comparison,
    });
  }

  const programmeCodes = parseProgrammeCodes(searchParams.get("programmes"));
  if (programmeCodes.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one programme." },
      { status: 400 },
    );
  }

  const pages = await Promise.all(
    programmeCodes.map(async (code) => {
      const response = await fetch(`${sourceBaseUrl}/${year}/program/${code}`, {
        next: { revalidate: 60 * 60 },
      });
      if (!response.ok) throw new Error("ANU programme discovery failed.");
      return response.text();
    }),
  );

  const discoveredCodes = new Set<string>();
  for (const page of pages) {
    for (const code of page.matchAll(courseCodePattern)) {
      discoveredCodes.add(code[0]);
    }
  }

  const existingCourses = [...discoveredCodes].filter((code) =>
    imported.codes.has(code),
  ).length;

  return NextResponse.json({
    programmes: programmeCodes.length,
    coursePages: discoveredCodes.size,
    existingCourses,
    newCourses: discoveredCodes.size - existingCourses,
    isLowerBound: false,
    comparison: imported.comparison,
  });
}
