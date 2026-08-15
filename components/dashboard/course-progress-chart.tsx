import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requirementGroups } from "@/lib/catalogue";
import type { RequirementProgress } from "@/lib/student-progress";
import type { Tone } from "@/lib/ui";

function groupTag(progress: RequirementProgress, total: number) {
  const covered = progress.completedUnits + progress.plannedUnits;
  if (progress.completedUnits >= total)
    return { label: "Done", tone: "success" as Tone };
  if (covered >= total) return { label: "Planned", tone: "brand" as Tone };
  return { label: `${total - covered}u to plan`, tone: "warning" as Tone };
}

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
      <ul className="mt-4 space-y-3.5">
        {requirementGroups.map((group) => {
          const progress = progressByGroup[group.id];
          const covered = progress.completedUnits + progress.plannedUnits;
          const tag = groupTag(progress, group.total);
          return (
            <li key={group.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs font-medium text-zinc-700">
                  {group.name}
                  <span className="ml-1.5 text-[11px] font-normal text-zinc-400 tabular-nums">
                    {covered}/{group.total}u
                  </span>
                </span>
                <Badge tone={tag.tone} className="shrink-0 px-2 py-0.5">
                  {tag.label}
                </Badge>
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
