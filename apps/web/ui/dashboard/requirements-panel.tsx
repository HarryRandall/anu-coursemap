"use client";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@coursemap/ui/primitives/tooltip";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@coursemap/ui/primitives/button";
import { Card, CardContent } from "@coursemap/ui/primitives/card";

import type { RequirementBucketProgress } from "@/lib/coursemap/requirement-progress";

/**
 * A compact read of the top-level programme requirement groups. Numbers are
 * indicative; the requirements page remains the formal audit.
 */
export function RequirementsPanel({
  buckets,
}: {
  buckets: readonly RequirementBucketProgress[];
}) {
  const visible = buckets.slice(0, 4);
  if (visible.length === 0) return null;

  return (
    <Card className="h-full py-0">
      <CardContent className="flex h-full flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Degree requirements</h2>
          <Button
            variant="ghost"
            size="sm"
            className="group hover:bg-accent hover:text-foreground hover:no-underline focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-accent"
            asChild
          >
            <Link href="/requirements">
              View all
              <ArrowRight
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          </Button>
        </div>

        <ul className="flex flex-col gap-4">
          {visible.map((bucket) => {
            const target = bucket.targetUnits;
            const scale = Math.max(
              target ?? 0,
              bucket.completedUnits + bucket.plannedUnits,
              1,
            );
            return (
              <li key={bucket.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/requirements"
                      className="group flex flex-col gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-xs font-medium">
                          {bucket.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {bucket.completedUnits + bucket.plannedUnits}
                          {target ? ` / ${target}` : ""} units
                        </span>
                      </span>
                      <span
                        className="flex h-2.5 overflow-hidden rounded-sm bg-border transition-opacity group-hover:opacity-80"
                        aria-hidden="true"
                      >
                        <span
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${(bucket.completedUnits / scale) * 100}%`,
                          }}
                        />
                        <span
                          className="h-full bg-primary/60"
                          style={{
                            width: `${(bucket.plannedUnits / scale) * 100}%`,
                          }}
                        />
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{`${bucket.title}: ${bucket.completedUnits} completed, ${bucket.plannedUnits} planned${target ? ` · ${target} units` : ""}`}</TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
