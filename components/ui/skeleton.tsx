import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** Animated placeholder block for loading states. Hidden from assistive tech. */
export function Skeleton({
  className,
  ...rest
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-md bg-zinc-200/65 motion-reduce:animate-none",
        className,
      )}
      {...rest}
    />
  );
}
