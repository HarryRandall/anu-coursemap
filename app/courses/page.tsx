import { AppShell } from "@/components/shell";
import { FilterBar } from "@/components/ui/filter-bar";
import { courses, type Course } from "@/lib/catalogue";
import { CourseDirectory } from "./course-directory";

type CoursesSearchParams = {
  q?: string | string[];
  subject?: string | string[];
  level?: string | string[];
  session?: string | string[];
};

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function filterCourses(params: CoursesSearchParams): Course[] {
  const query = firstParam(params.q).slice(0, 120).toLowerCase();
  const subject = firstParam(params.subject);
  const level = firstParam(params.level);
  const session = firstParam(params.session);

  return courses.filter((course) => {
    const text =
      `${course.code} ${course.name} ${course.school} ${course.convener}`.toLowerCase();
    return (
      (!query || text.includes(query)) &&
      (!subject || course.subject === subject) &&
      (!level || String(course.level / 1000) === level) &&
      (!session || course.sessions.includes(session))
    );
  });
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<CoursesSearchParams>;
}) {
  const params = await searchParams;
  const filtered = filterCourses(params);
  const subjects = [...new Set(courses.map((course) => course.subject))].sort();
  const levels = [
    ...new Set(courses.map((course) => String(course.level / 1000))),
  ].sort();
  const sessions = [
    ...new Set(courses.flatMap((course) => course.sessions)),
  ].sort();

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
              options: subjects.map((item) => ({ value: item, label: item })),
            },
            {
              key: "level",
              label: "Level",
              options: levels.map((item) => ({
                value: item,
                label: `Level ${item}`,
              })),
            },
            {
              key: "session",
              label: "Session",
              options: sessions.map((item) => ({ value: item, label: item })),
            },
          ]}
        />
        <CourseDirectory courses={filtered} />
      </div>
    </AppShell>
  );
}
