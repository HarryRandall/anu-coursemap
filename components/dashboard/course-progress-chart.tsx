import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requirementGroups } from "@/lib/catalogue";
import type { RequirementProgress } from "@/lib/student-progress";

export function CourseProgressChart({
  progressByGroup,
}: {
  progressByGroup: Record<string, RequirementProgress>;
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
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
          className="text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          Rules
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {requirementGroups.map((group) => {
          const progress = progressByGroup[group.id];
          const covered = progress.completedUnits + progress.plannedUnits;
          return (
            <li key={group.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-xs font-medium text-zinc-700">
                  {group.name}
                </span>
                <span className="shrink-0 text-[11px] text-zinc-500 tabular-nums">
                  {covered} of {group.total}u
                </span>
              </div>
              <span
                aria-hidden="true"
                className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-zinc-100"
              >
                <span
                  className="bg-brand-600"
                  style={{
                    width: `${(progress.completedUnits / group.total) * 100}%`,
                  }}
                />
                <span
                  className="bg-brand-300"
                  style={{
                    width: `${(progress.plannedUnits / group.total) * 100}%`,
                  }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-center gap-4 pt-4 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full bg-brand-600"
            aria-hidden="true"
          />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full bg-brand-300"
            aria-hidden="true"
          />
          Planned
        </span>
      </div>
    </Card>
  );
}
