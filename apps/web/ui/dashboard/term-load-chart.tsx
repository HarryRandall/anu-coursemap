"use client";

import Link from "next/link";
import { Card, CardContent } from "@coursemap/ui/primitives/card";
import { cn } from "@/lib/cn";
import type { DashboardTermPoint } from "@/lib/coursemap/dashboard-series";
import { STANDARD_TERM_UNITS } from "@/lib/planner";

/** Six-unit tiles show the shape of each semester, including partial units. */
export function TermLoadChart({
  terms,
  currentTermId,
}: {
  terms: readonly DashboardTermPoint[];
  currentTermId?: string;
}) {
  const years = [...new Set(terms.map((term) => term.year))];
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Your degree at a glance</h2>
          <span className="text-xs text-muted-foreground">
            Each tile = 6 units
          </span>
        </div>
        {terms.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            Add courses to see your degree take shape.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {years.map((year) => (
              <section key={year} className="min-w-0">
                <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
                  {year}
                </h3>
                <div className="flex flex-col gap-4">
                  {terms
                    .filter((term) => term.year === year)
                    .map((term) => (
                      <Link
                        key={term.id}
                        href="/plan"
                        aria-label={`${term.label}: ${term.completed} completed, ${term.planned} planned units. Open plan.`}
                        className="group flex flex-col gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span
                            className={cn(
                              "text-muted-foreground",
                              term.id === currentTermId &&
                                "font-semibold text-sky-600 dark:text-sky-400",
                            )}
                          >
                            {term.label}
                            {term.id === currentTermId ? " · Now" : ""}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {term.units}u
                          </span>
                        </div>
                        <div
                          className="grid grid-cols-4 gap-1.5"
                          aria-hidden="true"
                        >
                          {Array.from(
                            {
                              length: Math.ceil(
                                Math.max(STANDARD_TERM_UNITS, term.units) / 6,
                              ),
                            },
                            (_, index) => {
                              const completed = Math.max(
                                0,
                                Math.min(6, term.completed - index * 6),
                              );
                              const planned = Math.max(
                                0,
                                Math.min(
                                  6 - completed,
                                  term.units - index * 6 - completed,
                                ),
                              );
                              return (
                                <span
                                  key={index}
                                  className="flex h-5 overflow-hidden rounded-sm bg-muted ring-1 ring-border/50 transition-colors ring-inset group-hover:bg-muted/70"
                                >
                                  <span
                                    className="h-full bg-emerald-500"
                                    style={{
                                      width: `${(completed / 6) * 100}%`,
                                    }}
                                  />
                                  <span
                                    className="h-full bg-violet-500"
                                    style={{ width: `${(planned / 6) * 100}%` }}
                                  />
                                </span>
                              );
                            },
                          )}
                        </div>
                      </Link>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-sm bg-emerald-500" />
            Completed
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-sm bg-violet-500" />
            Planned / enrolled
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-sm bg-muted ring-1 ring-border" />
            Open capacity
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
