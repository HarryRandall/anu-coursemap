import { NextResponse } from "next/server";
import { loadPublishedCourse } from "@/lib/coursemap/published-courses";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}[A-Z]?$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const code = (await params).code.trim().toUpperCase();
  if (!COURSE_CODE_PATTERN.test(code)) {
    return NextResponse.json(
      { error: "Invalid course code." },
      { status: 400 },
    );
  }
  const academicYear = Number(new URL(request.url).searchParams.get("year"));
  if (
    !Number.isInteger(academicYear) ||
    academicYear < 2020 ||
    academicYear > 2030
  ) {
    return NextResponse.json(
      { error: "A valid academic year from 2020 to 2030 is required." },
      { status: 400 },
    );
  }

  try {
    const course = await loadPublishedCourse(code, academicYear);
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    return NextResponse.json({ course });
  } catch {
    return NextResponse.json(
      { error: "Coursemap could not load this course." },
      { status: 500 },
    );
  }
}
