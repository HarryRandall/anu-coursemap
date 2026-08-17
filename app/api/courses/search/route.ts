import { NextResponse } from "next/server";
import { loadPublishedCourses } from "@/lib/coursemap/published-catalogue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json({ courses: [] });

  try {
    const text = query.slice(0, 120).toLowerCase();
    const courses = (await loadPublishedCourses())
      .filter((course) =>
        `${course.code} ${course.name} ${course.subject} ${course.convener}`
          .toLowerCase()
          .includes(text),
      )
      .slice(0, 8)
      .map((course) => ({
        accent: course.accent,
        code: course.code,
        name: course.name,
        units: course.units,
      }));
    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json(
      { error: "Course search is temporarily unavailable." },
      { status: 503 },
    );
  }
}
