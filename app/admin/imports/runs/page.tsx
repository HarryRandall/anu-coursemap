import { CourseImportRuns } from "@/components/admin/imports/course-import-runs";
import { loadCourseImportRunPage } from "@/lib/coursemap/admin-course-imports";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CourseImportRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const data = await loadCourseImportRunPage({
    page: Number(first(params.page)),
  });
  return <CourseImportRuns data={data} />;
}
