import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusTone, toneClasses } from "@/lib/ui";
import { statusLabel, type EffectiveStatus } from "@/lib/planner";

export function StatusPill({
  status,
  className,
}: {
  status: EffectiveStatus;
  className?: string;
}) {
  return (
    <span
      data-slot="status-pill"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        toneClasses[statusTone[status]],
        className,
      )}
    >
      {status === "completed" && <Check size={11} strokeWidth={2.5} />}
      {statusLabel(status)}
    </span>
  );
}
