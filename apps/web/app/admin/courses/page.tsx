import { loadImportModelSetting } from "@/lib/admin/settings";
import { negatableParam } from "@/lib/filter-params";
import { canManageCourseImports } from "@/lib/auth/viewer";
import { courseImportQueuesEnabled } from "@/lib/course-import/queue";
import {
  COURSE_IMPORT_YEARS,
  loadAcademicYearOptions,
  loadCourseDirectoryPage,
  type CourseDirectorySort,
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

const sorts: CourseDirectorySort[] = [
  "code-asc",
  "code-desc",
  "title-asc",
  "title-desc",
  "status",
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
    sort?: string | string[];
    status?: string | string[];
    year?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const rawYear = first(params.year);
  const requestedYear = Number(rawYear);
  const currentCalendarYear = new Date().getFullYear();
  const year: number | "all" =
    rawYear === "all"
      ? "all"
      : COURSE_IMPORT_YEARS.includes(requestedYear)
        ? requestedYear
        : COURSE_IMPORT_YEARS.includes(currentCalendarYear)
          ? currentCalendarYear
          : COURSE_IMPORT_YEARS.at(-1)!;
  const requestedStatus = negatableParam(params.status, "all");
  const status = statuses.includes(
    requestedStatus.value as CourseDirectoryStatus,
  )
    ? (requestedStatus.value as CourseDirectoryStatus)
    : "all";
  const statusNegated = status === "all" ? false : requestedStatus.negated;
  const requestedSort = first(params.sort) ?? "code-asc";
  const sort = sorts.includes(requestedSort as CourseDirectorySort)
    ? (requestedSort as CourseDirectorySort)
    : "code-asc";
  const query = (first(params.q) ?? "").trim();
  const page = Number(first(params.page));

  const academicYearOptions = loadAcademicYearOptions();
  const [data, years, canImport, importModel] = await Promise.all([
    loadCourseDirectoryPage({
      year,
      page,
      query,
      sort,
      status,
      statusNegated,
      academicYearOptions,
    }),
    academicYearOptions,
    canManageCourseImports(),
    loadImportModelSetting(),
  ]);

  return (
    <AdminCourseDirectory
      key={year}
      canImport={canImport}
      data={data}
      importModel={importModel.model}
      modelOptions={importModel.options}
      queueEnabled={courseImportQueuesEnabled()}
      searchParams={{
        year: String(year),
        ...(query ? { q: query } : {}),
        ...(sort === "code-asc" ? {} : { sort }),
        ...(status === "all"
          ? {}
          : { status: statusNegated ? `!${status}` : status }),
      }}
      years={years}
    />
  );
}
