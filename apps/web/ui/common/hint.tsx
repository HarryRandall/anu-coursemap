"use client";

import type { ComponentProps, ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@coursemap/ui/primitives/tooltip";

/**
 * Hover and focus hint on any element. Replaces native `title` attributes so
 * every hint uses the shared tooltip surface. The child must accept a ref and
 * forward props (a button, link or span).
 */
export function Hint({
  label,
  children,
  side = "top",
  align = "center",
}: {
  label: string;
  children: ReactElement;
  side?: ComponentProps<typeof TooltipContent>["side"];
  align?: ComponentProps<typeof TooltipContent>["align"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent align={align} side={side}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
