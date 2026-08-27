import { notFound } from "next/navigation";
import { loadImportRunDetail } from "@/components/admin/imports/import-detail-data";
import { RunDetail } from "@/components/admin/imports/run-detail";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

const breadcrumbFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "short",
  timeZone: "Australia/Sydney",
});

export default async function ImportRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const detail = await loadImportRunDetail(runId);
  if (!detail) notFound();

  return (
    <AppShell
      admin
      // The run id is a uuid, which the generated crumb would shout verbatim.
      // The time is what an operator recognises the run by.
      currentBreadcrumbLabel={breadcrumbFormatter
        .format(new Date(detail.run.startedAt))
        .replace(",", "")}
    >
      <RunDetail detail={detail} />
    </AppShell>
  );
}
