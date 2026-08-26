import { ImportsHistory } from "@/components/admin/imports/imports-history";
import { ImportsNavigation } from "@/components/admin/imports/imports-navigation";
import { loadImportsDashboard } from "@/components/admin/imports/imports-overview-data";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function ImportsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
  }>;
}) {
  const [data, params] = await Promise.all([
    loadImportsDashboard(),
    searchParams,
  ]);
  const query = (value(params.q) ?? "").trim().toLowerCase();
  const status = value(params.status) ?? "all";
  const rows = data.historical.filter((row) => {
    const matchesQuery =
      !query ||
      row.code.toLowerCase().includes(query) ||
      row.title.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query) ||
      String(row.year).includes(query);
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesStatus;
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
