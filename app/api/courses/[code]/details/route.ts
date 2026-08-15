import { NextResponse } from "next/server";
import { fetchAnuCourseManifest } from "@/lib/catalogue-import/anu-programs-courses";
import { courseByCode, courseDetail, type CourseDetail } from "@/lib/catalogue";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function officialDetail(
  code: string,
  detail: CourseDetail,
  document: Awaited<
    ReturnType<typeof fetchAnuCourseManifest>
  >["documents"][number],
) {
  const rich = document.course.rich;
  const sessions = document.offering?.sessions ?? [];

  return {
    ...detail,
    about: rich?.introduction ?? document.course.description ?? detail.about,
    college: rich?.college ?? detail.college,
    areasOfInterest: rich?.areasOfInterest ?? detail.areasOfInterest,
    coTaught: rich?.coTaughtCourses ?? detail.coTaught,
    workloadHours: rich?.workloadHours ?? detail.workloadHours,
    feeBand: rich?.feeBand ?? detail.feeBand,
    domesticFee: rich?.domesticFee ?? detail.domesticFee,
    internationalFee: rich?.internationalFee ?? detail.internationalFee,
    learningOutcomes: rich?.learningOutcomes ?? detail.learningOutcomes,
    assessment:
      rich?.indicativeAssessment
        ?.filter((item) => item.weight !== null)
        .map((item) => ({
          title: item.title,
          weight: item.weight ?? 0,
          outcomes: item.outcomes,
        })) ?? detail.assessment,
    assessmentNote: rich?.indicativeAssessment?.length
      ? "Indicative assessment from the current ANU course catalogue."
      : detail.assessmentNote,
    offerings:
      sessions.length > 0
        ? sessions.map((session, index) => ({
            session: session.periodCode,
            classNumber: Number(session.classNumber) || index + 1,
            startDate: formatDate(session.startsOn),
            lastEnrolDate: session.lastEnrolmentDate
              ? formatDate(session.lastEnrolmentDate)
              : "See class summary",
            censusDate: session.censusDate
              ? formatDate(session.censusDate)
              : "See class summary",
            endDate: formatDate(session.endsOn),
            mode:
              session.deliveryMode ??
              document.offering?.deliveryMode ??
              "See class summary",
          }))
        : detail.offerings,
  } satisfies CourseDetail;
}

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

  const course = courseByCode(code);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  try {
    const manifest = await fetchAnuCourseManifest({
      catalogueYear: course.year,
      courseCodes: [code],
      concurrency: 1,
    });
    const document = manifest.documents[0];
    if (
      !document ||
      manifest.diagnostics.some((item) => item.severity === "error")
    ) {
      return NextResponse.json(
        { error: "The official course page is currently unavailable." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        detail: officialDetail(code, courseDetail(course), document),
        sourceUrl: document.canonicalUrl,
        fetchedAt: document.fetchedAt,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "The official course page is currently unavailable." },
      { status: 502 },
    );
  }
}
