import { redirect } from "next/navigation";

/** Programmes are the default entry point for the separate structure routes. */
export default function AcademicStructureImportsPage() {
  redirect("/admin/programmes");
}
