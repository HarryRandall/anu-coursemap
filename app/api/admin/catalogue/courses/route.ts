import { NextResponse } from "next/server";
import { isSupportedCatalogueYear } from "@/lib/catalogue-import/catalogue-years";

const catalogueBaseUrl = "https://programsandcourses.anu.edu.au";

type AnuCourse = {
  CourseCode?: unknown;
  Name?: unknown;
  Year?: unknown;
  Units?: unknown;
};

type AnuSearchResponse = {
  Items?: unknown;
};

type CourseSearchResult = {
  code: string;
  name: string;
  year: number;
  units: number | null;
};

function parseCourse(value: unknown, year: number): CourseSearchResult | null {
  if (!value || typeof value !== "object") return null;

  const course = value as AnuCourse;
  const code =
    typeof course.CourseCode === "string"
      ? course.CourseCode.trim().toUpperCase()
      : "";
  const name = typeof course.Name === "string" ? course.Name.trim() : "";
  if (!/^[A-Z]{4}\d{4}[A-Z]?$/.test(code) || !name) return null;

  const sourceYear = Number(course.Year);
  const units = Number(course.Units);
  return {
    code,
    name,
    year: Number.isInteger(sourceYear) ? sourceYear : year,
    units: Number.isFinite(units) ? units : null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const year = Number(searchParams.get("year"));

  if (!query || query.length > 120) {
    return NextResponse.json({ results: [] });
  }
  if (!isSupportedCatalogueYear(year)) {
    return NextResponse.json(
      { error: "Unsupported catalogue year." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    SearchText: query,
    SelectedYear: String(year),
    PageIndex: "0",
    PageSize: "20",
    ShowAll: "false",
  });
  const response = await fetch(
    `${catalogueBaseUrl}/data/CourseSearch/GetCourses?${params}`,
    { headers: { accept: "application/json" }, next: { revalidate: 60 * 60 } },
  );
  if (!response.ok) {
    return NextResponse.json(
      { error: "ANU course search is unavailable. Try again shortly." },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as AnuSearchResponse;
  const normalisedQuery = query.toLowerCase();
  const results = Array.isArray(payload.Items)
    ? payload.Items.map((item) => parseCourse(item, year))
        .filter((course): course is CourseSearchResult => course !== null)
        .filter(
          (course) =>
            course.code.toLowerCase().includes(normalisedQuery) ||
            course.name.toLowerCase().includes(normalisedQuery),
        )
        .sort((left, right) => left.code.localeCompare(right.code))
    : [];

  return NextResponse.json({ results });
}
