import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { courseDirectoryEntriesRefreshEnabled } from "@/lib/catalogue-import/course-directory-policy";
import { configuredOpenRouterModels } from "@/lib/course-import/openrouter";
import { courseImportQueuesEnabled } from "@/lib/course-import/queue";
import {
  COURSE_IMPORT_YEARS,
  loadAcademicYearOptions,
  loadCourseDirectoryPage,
  type CourseDirectoryStatus,
} from "@/lib/coursemap/admin-course-imports";
import { AdminCourseDirectory } from "./course-list";

export const dynamic = "force-dynamic";

const statuses: CourseDirectoryStatus[] = [
  "all",
  "directory",
  "queued",
  "processing",
  "needs-review",
  "draft",
  "published",
  "unchanged",
  "failed",
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
    year?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const requestedYear = Number(first(params.year));
  const currentCalendarYear = new Date().getFullYear();
  const year = COURSE_IMPORT_YEARS.includes(requestedYear)
    ? requestedYear
    : COURSE_IMPORT_YEARS.includes(currentCalendarYear)
      ? currentCalendarYear
      : COURSE_IMPORT_YEARS.at(-1)!;
  const requestedStatus = first(params.status) ?? "all";
  const status = statuses.includes(requestedStatus as CourseDirectoryStatus)
    ? (requestedStatus as CourseDirectoryStatus)
    : "all";
  const query = (first(params.q) ?? "").trim();
  const page = Number(first(params.page));

  const [data, years, canImport] = await Promise.all([
    loadCourseDirectoryPage({ year, page, query, status }),
    loadAcademicYearOptions(),
    canManageCatalogueImports(),
  ]);

  return (
    <AdminCourseDirectory
      key={year}
      canImport={canImport}
      data={data}
      directoryRefreshEnabled={courseDirectoryEntriesRefreshEnabled()}
      modelOptions={configuredOpenRouterModels()}
      queueEnabled={courseImportQueuesEnabled()}
      searchParams={{
        year: String(year),
        ...(query ? { q: query } : {}),
        ...(status === "all" ? {} : { status }),
      }}
      years={years}
    />
  );
}
