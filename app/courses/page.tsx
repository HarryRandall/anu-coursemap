import { CircleAlert } from "lucide-react";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import {
  loadPublishedCoursePage,
  type PublishedCoursePage,
} from "@/lib/coursemap/published-catalogue";
import { CourseDirectory } from "./course-directory";

type CoursesSearchParams = {
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
  let catalogueUnavailable = false;
  try {
    result = await loadPublishedCoursePage({ page });
  } catch {
    // Show an explicit outage state rather than an empty catalogue.
    catalogueUnavailable = true;
  }
  const paginationSearchParams = {};

  if (catalogueUnavailable) {
    const retryQuery = new URLSearchParams();
    if (page > 1) retryQuery.set("page", String(page));
    const retryHref = retryQuery.size
      ? `/courses?${retryQuery.toString()}`
      : "/courses";
    return (
      <AppShell>
        <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-2xl bg-white p-8 text-center ring-1 ring-zinc-200">
          <CircleAlert className="text-amber-500" size={28} />
          <h1 className="mt-4 text-lg font-semibold text-zinc-900">
            Course catalogue temporarily unavailable
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Courses could not be loaded. Please try again shortly.
          </p>
          <ButtonLink
            className="mt-5"
            href={retryHref}
            size="sm"
            variant="secondary"
          >
            Try again
          </ButtonLink>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="sr-only">Courses</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col gap-5">
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
