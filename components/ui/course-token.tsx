import { cn } from "@/lib/cn";
import { accent } from "@/lib/ui";
import type { Accent } from "@/lib/catalogue";

const sizes = {
  sm: "size-8 rounded-lg text-[10px]",
  md: "size-10 rounded-xl text-[11px]",
  lg: "size-12 rounded-xl text-[13px]",
  xl: "size-16 rounded-2xl text-lg",
};

export function CourseToken({
  code,
  accent: tone,
  size = "md",
  className,
}: {
  code: string;
  accent: Accent;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center font-mono font-bold tracking-tight",
        sizes[size],
        accent[tone].token,
        className,
      )}
    >
      {code.slice(0, 2)}
    </span>
  );
}
