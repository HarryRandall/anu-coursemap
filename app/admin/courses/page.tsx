import { loadAdminCourseRecords } from "@/lib/coursemap/admin-catalogue";
import { AdminCourseList } from "./course-list";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  return <AdminCourseList records={await loadAdminCourseRecords()} />;
}
