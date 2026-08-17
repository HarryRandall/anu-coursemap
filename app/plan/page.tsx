import { AppShell } from "@/components/shell";
import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { PlanClient } from "./plan-client";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  let catalogue;
  try {
    catalogue = await loadCurrentUserPlanCatalogue();
  } catch {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center rounded-2xl bg-white p-8 text-center ring-1 ring-zinc-200">
          <h1 className="text-lg font-semibold text-zinc-900">
            Planning catalogue temporarily unavailable
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Your plan has not been changed. Please try again shortly.
          </p>
        </div>
      </AppShell>
    );
  }
  return <PlanClient catalogue={catalogue} />;
}
