import {
  loadAdminCoursePage,
  type AdminCourseListStatus,
} from "@/lib/coursemap/admin-catalogue";
import { AdminCourseList } from "./course-list";

export const dynamic = "force-dynamic";

const statuses: AdminCourseListStatus[] = [
  "all",
  "draft",
  "published",
  "needs-review",
  "verified",
];

function first(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const page = Number(first(params.page));
  const query = (first(params.q) ?? "").trim();
  const requestedStatus = first(params.status) ?? "all";
  const status = statuses.includes(requestedStatus as AdminCourseListStatus)
    ? (requestedStatus as AdminCourseListStatus)
    : "all";

  return (
    <AdminCourseList
      data={await loadAdminCoursePage({ page, query, status })}
      searchParams={{
        ...(query ? { q: query } : {}),
        ...(status === "all" ? {} : { status }),
      }}
      status={status}
    />
  );
}
