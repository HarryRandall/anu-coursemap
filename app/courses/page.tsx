import { AppShell } from "@/components/shell";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  loadPublishedCourseFilterOptions,
  loadPublishedCoursePage,
  type PublishedCoursePage,
} from "@/lib/coursemap/published-catalogue";
import { CourseDirectory } from "./course-directory";

type CoursesSearchParams = {
  q?: string | string[];
  subject?: string | string[];
  level?: string | string[];
  session?: string | string[];
  page?: string | string[];
};

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<CoursesSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(firstParam(params.page)) || 1);
  let result: PublishedCoursePage = {
    courses: [],
    page,
    pageSize: 24,
    total: 0,
  };
  let options: Awaited<ReturnType<typeof loadPublishedCourseFilterOptions>> = {
    subjects: [],
    levels: [],
    sessions: [],
  };
  try {
    [result, options] = await Promise.all([
      loadPublishedCoursePage({
        filters: {
          query: firstParam(params.q),
          subject: firstParam(params.subject),
          level: firstParam(params.level),
          session: firstParam(params.session),
        },
        page,
      }),
      loadPublishedCourseFilterOptions(),
    ]);
  } catch {
    // Keep this public route usable while the catalogue service recovers.
  }
  const paginationSearchParams = {
    q: firstParam(params.q) || undefined,
    subject: firstParam(params.subject) || undefined,
    level: firstParam(params.level) || undefined,
    session: firstParam(params.session) || undefined,
  };

  return (
    <AppShell>
      <h1 className="sr-only">Courses</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col gap-5">
        <FilterBar
          searchPlaceholder="Search code, course name, school or convener…"
          filters={[
            {
              key: "subject",
              label: "Subject",
              options: options.subjects.map((item) => ({
                value: item,
                label: item,
              })),
            },
            {
              key: "level",
              label: "Level",
              options: options.levels.map((item) => ({
                value: String(item),
                label: `Level ${item}`,
              })),
            },
            {
              key: "session",
              label: "Session",
              options: options.sessions.map((item) => ({
                value: item,
                label: item,
              })),
            },
          ]}
        />
        <CourseDirectory
          courses={result.courses}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          searchParams={paginationSearchParams}
        />
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
