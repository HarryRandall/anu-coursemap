import { cn } from "@/lib/cn";
import { accent } from "@/lib/ui";
import type { Accent } from "@/lib/coursemap/types";

const sizes = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-[11px]",
  lg: "size-12 text-[13px]",
  xl: "size-16 text-lg",
};

const radii = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-xl",
  xl: "rounded-2xl",
};

export function CourseToken({
  code,
  accent: tone,
  size = "md",
  shape = "rounded",
  className,
}: {
  code: string;
  accent: Accent;
  size?: keyof typeof sizes;
  shape?: "rounded" | "square";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center font-mono font-bold tracking-tight",
        sizes[size],
        shape === "square" ? "rounded-[4px]" : radii[size],
        accent[tone].token,
        className,
      )}
    >
      {code.slice(0, 2)}
    </span>
  );
}
