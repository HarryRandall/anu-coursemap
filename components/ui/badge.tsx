import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { toneClasses, type Tone } from "@/lib/ui";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap transition-colors [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "px-1.5 text-[10px]",
        md: "px-2 text-[11px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export function Badge({
  tone = "neutral",
  size = "md",
  className,
  children,
}: {
  tone?: Tone;
  size?: NonNullable<VariantProps<typeof badgeVariants>["size"]>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ size }), toneClasses[tone], className)}
    >
      {children}
    </span>
  );
}

/** Small square dot used in legends. */
export function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 rounded-full", className)}
    />
  );
}
