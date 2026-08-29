import { redirect } from "next/navigation";

/**
 * The course directory starts imports and this section holds their durable
 * run history.
 */
export default function ImportsPage() {
  redirect("/admin/imports/runs");
}
