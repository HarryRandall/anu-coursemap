"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck2 } from "lucide-react";
import { Badge } from "@reui/ui/badge";
import { Button } from "@reui/ui/button";
import { Card, CardContent } from "@reui/ui/card";
import { cn } from "@/lib/cn";
import type { DegreeUnitProgress } from "@/lib/planner";

type Segment = {
  id: string;
  label: string;
  units: number;
  className: string;
  dotClassName: string;
};

/**
 * The lead card: total progress with a segmented completed / enrolled /
 * planned / unallocated bar, the planned completion date and a path to the
 * plan board.
 */
export function DegreeProgressHero({
  degreeName,
  progress,
  unitTarget,
  enrolledUnits,
  finishLabel,
}: {
  degreeName: string;
  progress: DegreeUnitProgress;
  unitTarget: number | null;
  enrolledUnits: number;
  finishLabel: string | null;
}) {
  const plannedOnly = Math.max(0, progress.planned - enrolledUnits);
  const segments: Segment[] = [
    {
      id: "completed",
      label: "Completed",
      units: progress.completed,
      className: "bg-emerald-500",
      dotClassName: "bg-emerald-500",
    },
    {
      id: "enrolled",
      label: "Enrolled",
      units: enrolledUnits,
      className: "bg-primary",
      dotClassName: "bg-primary",
    },
    {
      id: "planned",
      label: "Planned",
      units: plannedOnly,
      className: "bg-primary/35",
      dotClassName: "bg-primary/35",
    },
    {
      id: "unallocated",
      label: "Unallocated",
      units: progress.remaining,
      className: "bg-muted-foreground/20",
      dotClassName: "bg-muted-foreground/30",
    },
  ];
  const total = unitTarget ?? progress.mapped;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-[13px] font-medium">
            Degree progress
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {degreeName}
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-4xl font-semibold tracking-tight">
            {progress.completed}
            <span className="text-muted-foreground text-base font-normal">
              {" "}
              / {total} units completed
            </span>
          </p>
          {unitTarget !== null && (
            <Badge variant="secondary" className="text-primary font-semibold">
              {progress.percent}%
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div
            className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={segments
              .map((segment) => `${segment.label}: ${segment.units} units`)
              .join(", ")}
          >
            {segments
              .filter((segment) => segment.units > 0)
              .map((segment) => (
                <span
                  key={segment.id}
                  title={`${segment.label} · ${segment.units} units`}
                  style={{ flex: segment.units }}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", segment.className)}
                />
              ))}
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-2">
            {segments.map((segment) => (
              <div key={segment.id} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", segment.dotClassName)}
                />
                <dt className="text-muted-foreground text-xs">
                  {segment.label}
                </dt>
                <dd className="text-xs font-semibold tabular-nums">
                  {segment.units} units
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-border mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <CalendarCheck2 aria-hidden="true" className="size-4" />
            {finishLabel
              ? `Planned completion ${finishLabel}`
              : "Add courses to project a completion date"}
          </p>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/plan">
              Open my plan
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
