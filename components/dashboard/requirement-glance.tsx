import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { requirementGroups, type Attempt } from "@/lib/catalogue";
import { requirementProgress } from "@/lib/student-progress";

export function RequirementGlance({
  attempts,
  majorCodes,
}: {
  attempts: Attempt[];
  majorCodes: string[];
}) {
  const progressByGroup = requirementProgress(attempts, majorCodes);
  const empty = !attempts.some((attempt) => attempt.status !== "failed");

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="How you are going"
        description={
          empty
            ? "Requirement groups stay visible so the empty state still reads as a dashboard."
            : "Coverage against the current degree rules"
        }
        icon={
          <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <ListChecks size={17} aria-hidden="true" />
          </span>
        }
        action={
          <Link
            href="/requirements"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Full rules
          </Link>
        }
      />
      <ul className="space-y-3.5 border-t border-zinc-100 px-5 py-4">
        {requirementGroups.map((group) => {
          const progress = progressByGroup[group.id];
          const completedPct = (progress.completedUnits / group.total) * 100;
          const plannedPct = (progress.plannedUnits / group.total) * 100;
          const covered = progress.completedUnits + progress.plannedUnits;
          return (
            <li key={group.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] font-semibold text-zinc-800">
                  {group.name}
                </p>
                <p className="text-[11px] text-zinc-400 tabular-nums">
                  {covered} / {group.total}
                </p>
              </div>
              <div
                className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-zinc-200/80"
                aria-label={`${group.name}: ${progress.completedUnits} completed, ${progress.plannedUnits} planned, ${progress.stillNeeded} still needed`}
              >
                <span
                  className="bg-brand-600"
                  style={{ width: `${completedPct}%` }}
                />
                <span
                  className="bg-brand-300"
                  style={{ width: `${plannedPct}%` }}
                />
              </div>
              <p
                className={cn(
                  "mt-1 text-[10px] text-zinc-400",
                  progress.stillNeeded === 0 && "text-emerald-600",
                )}
              >
                {progress.stillNeeded === 0
                  ? "Covered in your plan"
                  : `${progress.stillNeeded} units still needed`}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
