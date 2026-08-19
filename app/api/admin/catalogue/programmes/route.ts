import { NextResponse } from "next/server";
import { isSupportedCatalogueYear } from "@/lib/catalogue-import/catalogue-years";

const catalogueBaseUrl = "https://programsandcourses.anu.edu.au";
const programmeEndpoints = [
  "/data/ProgramSearch/GetProgramsUnderGraduate",
  "/data/ProgramSearch/GetProgramsPostGraduate",
  "/data/ProgramSearch/GetProgramsResearch",
  "/data/ProgramSearch/GetProgramsNonAward",
];

type AnuProgramme = {
  AcademicPlanCode?: unknown;
  ProgramName?: unknown;
  ProgramAcademicYear?: unknown;
  AcademicCareer?: unknown;
  Duration?: unknown;
};

type AnuSearchResponse = {
  Items?: unknown;
};

type ProgrammeSearchResult = {
  code: string;
  name: string;
  year: number;
  career: string | null;
  duration: number | null;
};

function parseProgramme(
  value: unknown,
  year: number,
): ProgrammeSearchResult | null {
  if (!value || typeof value !== "object") return null;

  const programme = value as AnuProgramme;
  const code =
    typeof programme.AcademicPlanCode === "string"
      ? programme.AcademicPlanCode.trim().toUpperCase()
      : "";
  const name =
    typeof programme.ProgramName === "string"
      ? programme.ProgramName.trim()
      : "";

  if (!/^[A-Z0-9-]+$/.test(code) || !name) return null;

  const sourceYear = Number(programme.ProgramAcademicYear);
  const duration = Number(programme.Duration);

  return {
    code,
    name,
    year: Number.isInteger(sourceYear) ? sourceYear : year,
    career:
      typeof programme.AcademicCareer === "string"
        ? programme.AcademicCareer
        : null,
    duration: Number.isFinite(duration) ? duration : null,
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
    PageSize: "10",
    ShowAll: "false",
  });

  const responses = await Promise.allSettled(
    programmeEndpoints.map(async (path) => {
      const response = await fetch(`${catalogueBaseUrl}${path}?${params}`, {
        headers: { accept: "application/json" },
        next: { revalidate: 60 * 60 },
      });

      if (!response.ok) throw new Error("ANU catalogue search failed.");
      return (await response.json()) as AnuSearchResponse;
    }),
  );

  const programmes = new Map<string, ProgrammeSearchResult>();
  for (const response of responses) {
    if (
      response.status !== "fulfilled" ||
      !Array.isArray(response.value.Items)
    ) {
      continue;
    }

    for (const item of response.value.Items) {
      const programme = parseProgramme(item, year);
      if (programme) programmes.set(programme.code, programme);
    }
  }

  if (
    programmes.size === 0 &&
    responses.every((response) => response.status === "rejected")
  ) {
    return NextResponse.json(
      { error: "ANU catalogue search is unavailable. Try again shortly." },
      { status: 502 },
    );
  }

  const normalisedQuery = query.toLowerCase();
  const results = [...programmes.values()]
    .filter(
      (programme) =>
        programme.code.toLowerCase().includes(normalisedQuery) ||
        programme.name.toLowerCase().includes(normalisedQuery),
    )
    .sort((left, right) => {
      const leftStartsWithQuery =
        left.code.toLowerCase().startsWith(normalisedQuery) ||
        left.name.toLowerCase().startsWith(normalisedQuery);
      const rightStartsWithQuery =
        right.code.toLowerCase().startsWith(normalisedQuery) ||
        right.name.toLowerCase().startsWith(normalisedQuery);

      if (leftStartsWithQuery !== rightStartsWithQuery) {
        return leftStartsWithQuery ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 12);

  return NextResponse.json({ results });
}
