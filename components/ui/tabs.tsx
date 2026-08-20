"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export function Tabs({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-zinc-100/80 p-1 text-zinc-500",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-7 flex-1 items-center justify-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}
