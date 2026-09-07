"use client";
import { Button } from "@coursemap/ui/primitives/button";

import { Sparkles, TriangleAlert } from "lucide-react";
import { expressionSummary } from "@/lib/coursemap/requisite-conditions";
import type { RequisiteExpression } from "@/lib/coursemap/requisite-summary";

/**
 * What the importer made of the official wording, kept to a single line so the
 * conditions being reviewed stay the tallest thing on the page.
 */
export function AutomaticMapping({
  canApply,
  codes,
  expression,
  onApply,
}: {
  canApply: boolean;
  codes: string[];
  expression: RequisiteExpression | null;
  onApply: () => void;
}) {
  if (!expression) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
        <TriangleAlert
          aria-hidden="true"
          className="size-4 shrink-0 text-amber-600 dark:text-amber-300"
        />
        This wording could not be read. Add the conditions by hand.
        {codes.length ? (
          <span className="text-xs text-amber-800 dark:text-amber-300">
            Codes found:{" "}
            <span className="font-mono font-semibold">{codes.join(", ")}</span>
          </span>
        ) : null}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-emerald-200 bg-emerald-50/70 py-1.5 pr-1.5 pl-2.5 text-sm text-emerald-950 dark:border-emerald-900 dark:text-emerald-300">
      <Sparkles
        aria-hidden="true"
        className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300"
      />
      <span className="min-w-0 flex-1">
        Read as {expressionSummary(expression)}
      </span>
      {canApply ? (
        <Button onClick={onApply} size="sm" variant="outline" type="button">
          Use this reading
        </Button>
      ) : null}
    </div>
  );
}
