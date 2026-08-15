import { cn } from "@/lib/cn";
import { BrandMark } from "@/components/brand-mark";

export function LandingMark({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className="size-8" />
      <strong
        className={cn(
          "brand-wordmark text-lg text-zinc-950",
          wordmarkClassName,
        )}
      >
        coursemap
      </strong>
    </span>
  );
}
