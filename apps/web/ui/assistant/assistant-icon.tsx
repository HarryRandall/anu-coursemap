import { Orbit } from "lucide-react";
import { cn } from "@/lib/cn";

export function AssistantIcon({ className }: { className?: string }) {
  return (
    <Orbit
      aria-hidden="true"
      className={cn(
        "text-primary transition-transform duration-300 group-hover:rotate-12 hover:scale-110 hover:rotate-12 motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
    />
  );
}
