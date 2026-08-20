"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function RadioGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

export function RadioGroupItem({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full border border-zinc-300 bg-white text-brand-600 shadow-xs transition-colors outline-none hover:border-brand-300 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-600 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-current" />
    </RadioGroupPrimitive.Item>
  );
}

export function RadioCard({
  title,
  description,
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroupPrimitive.Item>, "children"> & {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-card"
      className={cn(
        "group/radio-card relative min-h-24 w-full rounded-xl border border-zinc-200 bg-white p-4 pr-12 text-left shadow-xs transition-colors outline-none hover:border-zinc-300 hover:bg-zinc-50 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-50/60 data-[state=checked]:shadow-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <span className="block text-sm font-semibold text-zinc-950">{title}</span>
      {description ? (
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
          {description}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className="absolute top-4 right-4 grid size-5 place-items-center rounded-full border border-zinc-300 bg-white text-white transition-colors group-data-[state=checked]/radio-card:border-brand-600 group-data-[state=checked]/radio-card:bg-brand-600"
      >
        <RadioGroupPrimitive.Indicator>
          <Check size={12} strokeWidth={3} />
        </RadioGroupPrimitive.Indicator>
      </span>
    </RadioGroupPrimitive.Item>
  );
}
