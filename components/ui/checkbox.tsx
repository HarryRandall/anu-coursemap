"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer grid size-5 shrink-0 place-items-center rounded-[5px] border border-zinc-300 bg-white text-white shadow-xs transition-colors outline-none hover:border-brand-300 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 data-[state=checked]:hover:border-brand-700 data-[state=checked]:hover:bg-brand-700 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
