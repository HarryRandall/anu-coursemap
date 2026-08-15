import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requirementGroups } from "@/lib/catalogue";
import type { RequirementProgress } from "@/lib/student-progress";

const shortNames: Record<string, string> = {
  core: "Core",
  math: "Maths",
  major: "Major",
  advanced: "Advanced",
  electives: "Electives",
};

export function CourseProgressChart({
  progressByGroup,
}: {
  progressByGroup: Record<string, RequirementProgress>;
}) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Course progress
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Coverage against degree rules
          </p>
        </div>
        <Link
          href="/requirements"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          Rules
        </Link>
      </div>
      <div className="flex h-32 items-end gap-3">
        {requirementGroups.map((group) => {
          const progress = progressByGroup[group.id];
          const completedPct = (progress.completedUnits / group.total) * 100;
          const plannedPct = (progress.plannedUnits / group.total) * 100;
          const covered = progress.completedUnits + progress.plannedUnits;
          return (
            <div
              key={group.id}
              title={`${group.name}: ${progress.completedUnits} completed, ${progress.plannedUnits} planned`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <div
                className="flex h-20 w-full max-w-9 flex-col justify-end overflow-hidden rounded-md bg-zinc-100"
                aria-label={`${group.name}: ${covered} of ${group.total} units`}
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
              <p className="text-[11px] font-medium text-zinc-600">
                {shortNames[group.id] ?? group.name}
              </p>
              <p className="text-[10px] font-semibold text-zinc-700 tabular-nums">
                {covered}/{group.total}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
