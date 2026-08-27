import { Suspense } from "react";
import { CourseImport } from "@/components/admin/imports/course-import";
import { loadCatalogueYears } from "@/components/admin/imports/imports-overview-data";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function ImportCoursesPage() {
  const catalogueYears = await loadCatalogueYears();

  return (
    <AppShell admin>
      <Suspense fallback={<div className="mx-auto w-full max-w-7xl pb-10" />}>
        <CourseImport catalogueYears={catalogueYears} />
      </Suspense>
    </AppShell>
  );
}
