import type { Database } from "@/types/database";
import {
  DEMO_IMPORTS_DASHBOARD_FIXTURE,
  type ImportDiagnostic,
  type ImportFlag,
  type ImportRun,
} from "@/components/admin/imports/imports-overview-data";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type DiagnosticRow =
  Database["public"]["Tables"]["catalogue_import_diagnostics"]["Row"];
type ImportItemRow =
  Database["public"]["Tables"]["catalogue_import_items"]["Row"];

export type ImportRunDetail = {
  run: ImportRun;
  /** Every diagnostic for the run, not the truncated list the overview shows. */
  diagnostics: ImportDiagnostic[];
};

function courseCode(value: string | null) {
  const normalised = (value ?? "").toUpperCase();
  return /^[A-Z]{4}[0-9]{4}[A-Z]?$/.test(normalised) ? normalised : null;
}

export async function loadImportRunDetail(
  runId: string,
): Promise<ImportRunDetail | null> {
  if (isDemoMode()) {
    const run = DEMO_IMPORTS_DASHBOARD_FIXTURE.runs.find(
      (entry) => entry.id === runId,
    );
    return run ? { diagnostics: run.diagnostics, run } : null;
  }

  // The overview already loads and shapes every recent run. Reusing it keeps
  // one definition of what a run is, rather than a second divergent query.
  const { loadImportsDashboard } =
    await import("@/components/admin/imports/imports-overview-data");
  const data = await loadImportsDashboard();
  const run = data.runs.find((entry) => entry.id === runId);
  if (!run) return null;

  try {
    const supabase = await createClient();
    const { data: items, error: itemsError } = await supabase
      .from("catalogue_import_items")
      .select("id,target_key,run_id")
      .eq("run_id", runId)
      .limit(5000);
    if (itemsError) throw itemsError;

    const rows = (items ?? []) as Pick<
      ImportItemRow,
      "id" | "target_key" | "run_id"
    >[];
    if (rows.length === 0) return { diagnostics: [], run };

    const { data: diagnostics, error } = await supabase
      .from("catalogue_import_diagnostics")
      .select("*")
      .in(
        "import_item_id",
        rows.map((item) => item.id),
      )
      .order("severity")
      .order("issue_code")
      .limit(5000);
    if (error) throw error;

    const keyByItem = new Map(rows.map((item) => [item.id, item.target_key]));
    return {
      diagnostics: ((diagnostics ?? []) as DiagnosticRow[]).map((row) => ({
        courseCode: courseCode(keyByItem.get(row.import_item_id) ?? null),
        field: row.field,
        id: row.id,
        issueCode: row.issue_code,
        severity: row.severity === "error" ? "error" : "warning",
        summary: row.summary,
      })),
      run,
    };
  } catch {
    // The run header is still worth showing even if its evidence will not load.
    return { diagnostics: [], run };
  }
}

export async function loadImportChange(id: number): Promise<ImportFlag | null> {
  if (isDemoMode()) {
    return (
      DEMO_IMPORTS_DASHBOARD_FIXTURE.flags.find((flag) => flag.id === id) ??
      null
    );
  }
  const { loadImportsDashboard } =
    await import("@/components/admin/imports/imports-overview-data");
  const data = await loadImportsDashboard();
  return data.flags.find((flag) => flag.id === id) ?? null;
}
