import type { ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-0.5 rounded-lg border px-3.5 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-zinc-200 bg-zinc-50 text-zinc-800",
        brand: "border-brand-200 bg-brand-50 text-brand-900",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900",
        warning: "border-amber-200 bg-amber-50 text-amber-950",
        danger: "border-rose-200 bg-rose-50 text-rose-900",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Alert({
  className,
  tone,
  ...rest
}: ComponentPropsWithoutRef<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="status"
      className={cn(alertVariants({ tone }), className)}
      {...rest}
    />
  );
}

export function AlertTitle({
  className,
  ...rest
}: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      data-slot="alert-title"
      className={cn("col-start-2 leading-5 font-medium", className)}
      {...rest}
    />
  );
}

export function AlertDescription({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 text-xs leading-relaxed text-current/75 [&_p]:leading-relaxed",
        className,
      )}
      {...rest}
    />
  );
}
