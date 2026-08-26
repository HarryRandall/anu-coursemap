import {
  loadAdminCoursePage,
  loadAdminCourseSubjects,
  type AdminCourseListStatus,
} from "@/lib/coursemap/admin-catalogue";
import { AdminCourseList } from "./course-list";

export const dynamic = "force-dynamic";

const statuses: AdminCourseListStatus[] = [
  "all",
  "draft",
  "published",
  "archived",
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
    subject?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const page = Number(first(params.page));
  const query = (first(params.q) ?? "").trim();
  const subject = (first(params.subject) ?? "").trim();
  const requestedStatus = first(params.status) ?? "all";
  const status = statuses.includes(requestedStatus as AdminCourseListStatus)
    ? (requestedStatus as AdminCourseListStatus)
    : "all";

  const [data, subjects] = await Promise.all([
    loadAdminCoursePage({ page, query, status, subject }),
    loadAdminCourseSubjects(),
  ]);

  return (
    <AdminCourseList
      data={data}
      searchParams={{
        ...(query ? { q: query } : {}),
        ...(status === "all" ? {} : { status }),
        ...(subject ? { subject } : {}),
      }}
      subjects={subjects}
    />
  );
}
