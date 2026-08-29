import { redirect } from "next/navigation";

export default function LegacyImportRunPage() {
  redirect("/admin/imports/runs");
}
