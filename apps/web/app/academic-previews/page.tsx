import { notFound } from "next/navigation";
import { AcademicPreviews } from "@/ui/academic/previews/academic-previews";

export default function AcademicPreviewsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AcademicPreviews />;
}
