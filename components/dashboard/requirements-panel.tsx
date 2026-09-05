"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@reui/ui/button";
import { Card, CardContent } from "@reui/ui/card";
import { Progress } from "@reui/ui/progress";
import type { RequirementBucketProgress } from "@/lib/coursemap/requirement-progress";

/**
 * A compact read of the top-level programme requirement groups. Numbers are
 * indicative — the requirements page remains the formal audit.
 */
export function RequirementsPanel({
  buckets,
  requirementsImported,
}: {
  buckets: readonly RequirementBucketProgress[];
  requirementsImported: boolean;
}) {
  const visible = buckets.slice(0, 4);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-[13px] font-medium">
            Degree requirements
          </p>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/requirements">
              View all
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {visible.length === 0 ? (
          <p className="text-muted-foreground my-auto text-sm">
            {requirementsImported
              ? "The published rules for this programme have no unit groups to summarise yet."
              : "Requirement groups appear once the official programme rules have been imported and reviewed."}
          </p>
        ) : (
          <ul className="flex flex-1 flex-col justify-center gap-1">
            {visible.map((bucket) => {
              const target = bucket.targetUnits;
              const percent = target
                ? Math.min(100, (bucket.completedUnits / target) * 100)
                : 0;
              return (
                <li key={bucket.key}>
                  <Link
                    href="/requirements"
                    className="hover:bg-muted/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {bucket.title}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {target
                          ? `${bucket.completedUnits} of ${target} units complete`
                          : `${bucket.completedUnits} units complete`}
                      </span>
                    </span>
                    <Progress
                      value={percent}
                      className="w-20 shrink-0"
                      aria-hidden="true"
                    />
                    <ChevronRight
                      aria-hidden="true"
                      className="text-muted-foreground size-4 shrink-0"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
