import { NextResponse } from "next/server";
import { loadPublishedCoursePage } from "@/lib/coursemap/published-catalogue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json({ courses: [] });

  try {
    const requestedPage = Number(searchParams.get("page") ?? "1");
    const requestedPageSize = Number(searchParams.get("pageSize") ?? "8");
    const result = await loadPublishedCoursePage({
      filters: { query },
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      pageSize: Number.isFinite(requestedPageSize) ? requestedPageSize : 8,
    });
    return NextResponse.json({
      ...result,
      courses: result.courses.map((course) => ({
        accent: course.accent,
        code: course.code,
        name: course.name,
        year: course.year,
        units: course.units,
        level: course.level,
        subject: course.subject,
        school: course.school,
        convener: course.convener,
        sessions: course.sessions,
        delivery: course.delivery,
        description: course.description,
        prerequisiteText: course.prerequisiteText,
        prerequisiteCodes: course.prerequisiteCodes,
        incompatibilities: course.incompatibilityText
          ? [course.incompatibilityText]
          : [],
        countsTowards: [],
        sourceUrl: course.sourceUrl,
        lastChanged: course.sourceUpdatedAt ?? "Not listed",
        parseState:
          course.reviewState === "verified"
            ? "Verified"
            : course.reviewState === "review"
              ? "Review"
              : "Automatic",
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Course search is temporarily unavailable." },
      { status: 503 },
    );
  }
}
