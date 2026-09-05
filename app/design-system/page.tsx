import { notFound, redirect } from "next/navigation";

export default function DesignSystemIndexPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  redirect("/design-system/foundations");
}
