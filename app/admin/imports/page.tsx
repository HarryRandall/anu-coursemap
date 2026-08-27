import { redirect } from "next/navigation";

/**
 * Importing is four destinations now, so the bare section path is not a page.
 * It stays routable because the breadcrumb links to it.
 */
export default function ImportsPage() {
  redirect("/admin/imports/sync");
}
