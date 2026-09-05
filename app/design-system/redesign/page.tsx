import { notFound } from "next/navigation";
import { DashboardPreview } from "@/components/design-system/redesign/dashboard-preview";

export default function RedesignPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DashboardPreview />;
}
