import { redirect } from "next/navigation";

/** Academic structure directories are split into kind tabs on this page. */
export default function AcademicStructureImportsPage() {
  redirect("/admin/programmes");
}
