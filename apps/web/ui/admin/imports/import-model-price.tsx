"use client";

import { Badge } from "@coursemap/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@coursemap/ui/primitives/tooltip";
import {
  estimatedImportCost,
  formatImportPrice,
} from "@/lib/admin/import-model";
import type { ImportModel } from "@/lib/admin/import-model";

export function ImportModelPrice({ model }: { model: ImportModel }) {
  const cost = estimatedImportCost(model);
  const explanation =
    cost === null ? "Estimate unavailable" : "Estimated cost per import";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="shrink-0 bg-emerald-500/10 font-mono text-emerald-700 tabular-nums dark:text-emerald-300"
          aria-label={explanation}
        >
          {formatImportPrice(cost)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  );
}
