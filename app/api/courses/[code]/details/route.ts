import { NextResponse } from "next/server";
import { loadPublishedCourse } from "@/lib/coursemap/published-catalogue";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;

export async function GET(
  _: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const code = (await params).code.trim().toUpperCase();
  if (!COURSE_CODE_PATTERN.test(code)) {
    return NextResponse.json(
      { error: "Invalid course code." },
      { status: 400 },
    );
  }

  try {
    const course = await loadPublishedCourse(code);
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
