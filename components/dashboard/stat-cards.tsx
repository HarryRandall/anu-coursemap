import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/lib/ui";

export type Stat = {
  id: string;
  label: string;
  value: string;
  sub: string;
  badge?: { label: string; tone: Tone };
  /** Thin part-to-whole bar: percentages of the degree total. */
  bar?: { completedPct: number; plannedPct: number };
};

export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.id} className="flex h-32 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
              {stat.label}
            </p>
            {stat.badge && (
              <Badge tone={stat.badge.tone} className="-mt-0.5">
                {stat.badge.label}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-[1.75rem] leading-none font-bold tracking-tight text-zinc-900 tabular-nums">
            {stat.value}
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-500">{stat.sub}</p>
          {stat.bar && (
            <span
              aria-hidden="true"
              className="mt-auto flex h-1.5 overflow-hidden rounded-full bg-zinc-100"
            >
              <span
                className="bg-brand-600"
                style={{ width: `${stat.bar.completedPct}%` }}
              />
              <span
                className="bg-brand-300"
                style={{ width: `${stat.bar.plannedPct}%` }}
              />
            </span>
          )}
        </Card>
      ))}
    </div>
  );
}
