import { CourseImport } from "@/components/admin/imports/course-import";
import { loadCatalogueYears } from "@/components/admin/imports/imports-overview-data";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function ImportCoursesPage() {
  return (
    <AppShell admin>
      <CourseImport catalogueYears={await loadCatalogueYears()} />
    </AppShell>
  );
}
