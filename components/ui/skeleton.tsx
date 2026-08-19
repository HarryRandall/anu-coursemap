import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** Animated placeholder block for loading states. Hidden from assistive tech. */
export function Skeleton({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-zinc-200/70 motion-reduce:animate-none",
        className,
      )}
      {...rest}
    />
  );
}
