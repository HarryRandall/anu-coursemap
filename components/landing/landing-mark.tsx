import { cn } from "@/lib/cn";

export function LandingMark({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className="grid size-7 -rotate-3 grid-cols-2 gap-0.5"
        aria-hidden="true"
      >
        <i className="rounded-[3px] bg-zinc-900" />
        <i className="rounded-[3px] bg-zinc-400" />
        <i className="rounded-[3px] bg-zinc-400" />
        <i className="rounded-[3px] bg-zinc-900" />
      </span>
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
