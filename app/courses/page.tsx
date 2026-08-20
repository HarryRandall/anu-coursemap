import { CircleAlert } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  loadPublishedCoursePage,
  type PublishedCoursePage,
} from "@/lib/coursemap/published-catalogue";
import { CourseDirectory } from "./course-directory";

type CoursesSearchParams = {
  q?: string | string[];
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
  const query = firstParam(params.q).slice(0, 100);
  const levelParam = firstParam(params.level);
  const level = ["1", "2", "3", "4"].includes(levelParam) ? levelParam : "";
  const sessionParam = firstParam(params.session);
  const session = ["Semester 1", "Semester 2"].includes(sessionParam)
    ? sessionParam
    : "";
  const filters = { query, level, session };
  let result: PublishedCoursePage = {
    courses: [],
    page,
    pageSize: 24,
    total: 0,
  };
  let catalogueUnavailable = false;
  try {
    result = await loadPublishedCoursePage({ page, filters });
  } catch {
    // Show an explicit outage state rather than an empty catalogue.
    catalogueUnavailable = true;
  }
  const paginationSearchParams = {
    q: query || undefined,
    level: level || undefined,
    session: session || undefined,
  };

  if (catalogueUnavailable) {
    const retryQuery = new URLSearchParams();
    for (const [key, value] of Object.entries(paginationSearchParams)) {
      if (value) retryQuery.set(key, value);
    }
    if (page > 1) retryQuery.set("page", String(page));
    const retryHref = retryQuery.size
      ? `/courses?${retryQuery.toString()}`
      : "/courses";
    return (
      <AppShell>
        <h1 className="sr-only">Courses</h1>
        <Card className="mx-auto max-w-xl p-4 sm:p-5">
          <Alert tone="warning" role="alert">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Course catalogue temporarily unavailable</AlertTitle>
            <AlertDescription>
              Courses could not be loaded. Please try again shortly.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <ButtonLink href={retryHref} size="sm" variant="primary">
              Try again
            </ButtonLink>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="sr-only">Courses</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col gap-5">
        <FilterBar
          key={query}
          searchPlaceholder="Search by course code, name or school"
          filters={[
            {
              key: "level",
              label: "Level",
              options: [
                { value: "1", label: "1000 level" },
                { value: "2", label: "2000 level" },
                { value: "3", label: "3000 level" },
                { value: "4", label: "4000 level" },
              ],
            },
            {
              key: "session",
              label: "Teaching period",
              options: [
                { value: "Semester 1", label: "Semester 1" },
                { value: "Semester 2", label: "Semester 2" },
              ],
            },
          ]}
        />
        <CourseDirectory
          courses={result.courses}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          filtered={Boolean(query || level || session)}
          searchParams={paginationSearchParams}
        />
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
