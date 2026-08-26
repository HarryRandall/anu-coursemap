import { ImportsActivity } from "@/components/admin/imports/imports-activity";
import { ImportsNavigation } from "@/components/admin/imports/imports-navigation";
import { loadImportsDashboard } from "@/components/admin/imports/imports-overview-data";
import { AppShell } from "@/components/shell";
import { parseDateParam, withinDateRange } from "@/lib/coursemap/date-range";

export const dynamic = "force-dynamic";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function ImportsActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string | string[];
    q?: string | string[];
    status?: string | string[];
    to?: string | string[];
  }>;
}) {
  const [data, params] = await Promise.all([
    loadImportsDashboard(),
    searchParams,
  ]);
  const query = (value(params.q) ?? "").trim().toLowerCase();
  const status = value(params.status) ?? "all";
  const from = parseDateParam(params.from);
  const to = parseDateParam(params.to);
  const rows = data.activity.filter((row) => {
    const matchesQuery =
      !query ||
      row.code.toLowerCase().includes(query) ||
      row.title.toLowerCase().includes(query) ||
      String(row.year).includes(query);
    const matchesStatus = status === "all" || row.result === status;
    return (
      matchesQuery && matchesStatus && withinDateRange(row.checkedAt, from, to)
    );
  });

  return (
    <AppShell
      admin
      tabs={
        <ImportsNavigation
          active="activity"
          historicalCount={data.historicalOpenCount}
        />
      }
    >
      <ImportsActivity data={data} rows={rows} />
    </AppShell>
  );
}
