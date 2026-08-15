import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { requirementGroups } from "@/lib/catalogue";
import type { RequirementProgress } from "@/lib/student-progress";

export function CourseProgressChart({
  progressByGroup,
}: {
  progressByGroup: Record<string, RequirementProgress>;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Course progress"
        description="Coverage against current degree rules"
        action={
          <Link
            href="/requirements"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Rules
          </Link>
        }
      />
      <div className="border-t border-zinc-100 px-5 py-5">
        <div className="flex h-36 items-end gap-3">
          {requirementGroups.map((group) => {
            const progress = progressByGroup[group.id];
            const completedPct = (progress.completedUnits / group.total) * 100;
            const plannedPct = (progress.plannedUnits / group.total) * 100;
            const covered = progress.completedUnits + progress.plannedUnits;
            return (
              <div
                key={group.id}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div
                  className="flex h-24 w-full max-w-10 flex-col justify-end overflow-hidden rounded-md bg-zinc-100"
                  aria-label={`${group.name}: ${progress.completedUnits} completed, ${progress.plannedUnits} planned, ${progress.stillNeeded} still needed`}
                >
                  <span
                    className="w-full bg-brand-300"
                    style={{ height: `${plannedPct}%` }}
                  />
                  <span
                    className="w-full bg-brand-600"
                    style={{ height: `${completedPct}%` }}
                  />
                </div>
                <p className="w-full truncate text-center text-[10px] font-medium text-zinc-500">
                  {group.name
                    .replace(" requirement", "")
                    .replace("University ", "")}
                </p>
                <p className="text-[10px] font-semibold text-zinc-700 tabular-nums">
                  {covered}/{group.total}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-[10px] text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full bg-brand-600"
              aria-hidden="true"
            />
            Completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full bg-brand-300"
              aria-hidden="true"
            />
            Planned
          </span>
        </div>
      </div>
    </Card>
  );
}
