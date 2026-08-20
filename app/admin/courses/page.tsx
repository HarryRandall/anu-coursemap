import { loadAdminCoursePage } from "@/lib/coursemap/admin-catalogue";
import { AdminCourseList } from "./course-list";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const page = Number(
    Array.isArray(params.page) ? params.page[0] : params.page,
  );
  return (
    <AdminCourseList
      data={await loadAdminCoursePage({ page })}
      searchParams={{}}
    />
  );
}
