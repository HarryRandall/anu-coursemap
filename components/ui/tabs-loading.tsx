import { Skeleton } from "@reui/ui/skeleton";
import { cn } from "@/lib/cn";

/**
 * Stands in for a `TabsList variant="line"` while a page loads. The shared
 * theme gives the line variant a 48px height, so this keeps the section bar
 * the same size and the content below it does not jump when the page lands.
 */
export function TabsLoading({
  widths,
  className,
}: {
  /** One Tailwind width class per placeholder tab. */
  widths: readonly string[];
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex h-12 items-center gap-7 px-1", className)}
    >
      {widths.map((width, index) => (
        <Skeleton key={index} className={cn("h-3.5", width)} />
      ))}
    </div>
  );
}
