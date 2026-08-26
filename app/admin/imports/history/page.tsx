import { ImportsHistory } from "@/components/admin/imports/imports-history";
import { ImportsNavigation } from "@/components/admin/imports/imports-navigation";
import { loadImportsDashboard } from "@/components/admin/imports/imports-overview-data";
import { AppShell } from "@/components/shell";
import { parseDateParam, withinDateRange } from "@/lib/coursemap/date-range";

export const dynamic = "force-dynamic";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function ImportsHistoryPage({
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
  const rows = data.historical.filter((row) => {
    const matchesQuery =
      !query ||
      row.code.toLowerCase().includes(query) ||
      row.title.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query) ||
      String(row.year).includes(query);
    const matchesStatus = status === "all" || row.status === status;
    return (
      matchesQuery && matchesStatus && withinDateRange(row.checkedAt, from, to)
    );
  });

  return (
    <AppShell
      admin
      tabs={
        <ImportsNavigation
          active="history"
          historicalCount={data.historicalOpenCount}
        />
      }
    >
      <ImportsHistory data={data} rows={rows} />
    </AppShell>
  );
}
