"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import { Progress } from "@coursemap/ui/primitives/progress";
import { cn } from "@/lib/cn";
import { degreeUnitProgress } from "@/lib/planner";

export function OverallProgressCard({
  unitTarget,
  progress,
}: {
  unitTarget: number | null;
  progress: ReturnType<typeof degreeUnitProgress>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall unit progress</CardTitle>
        <CardDescription>
          {unitTarget === null
            ? "The published programme has no unit total."
            : `${progress.completed} of ${unitTarget} units completed`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unitTarget === null ? (
          <p className="text-sm text-muted-foreground">
            {progress.completed} completed and {progress.planned} planned units
            are mapped. Remaining units cannot be calculated until an
            administrator publishes the programme total.
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <strong className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                {progress.percent}%
              </strong>
              <span className="text-xs text-muted-foreground tabular-nums">
                {progress.remaining} still to plan
              </span>
            </div>
            <Progress
              aria-label="Completed units"
              className="mt-3 h-2"
              value={Math.min(100, progress.percent)}
            />
            <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
              {[
                ["Completed", progress.completed, "bg-primary"],
                ["Planned", progress.planned, "bg-primary/35"],
                ["Remaining", progress.remaining, "bg-muted-foreground/30"],
              ].map(([label, value, swatch]) => (
                <div key={label as string} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className={cn("size-2 rounded-full", swatch as string)}
                    />
                    {label}
                  </dt>
                  <dd className="mt-0.5 font-semibold text-foreground tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
