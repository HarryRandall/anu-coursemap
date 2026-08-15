import { cn } from "@/lib/cn";

export function LandingMark({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center", className)}>
      <strong
        className={cn(
          "text-lg tracking-tight text-zinc-950",
          wordmarkClassName,
        )}
      >
        coursemap
      </strong>
    </span>
  );
}
