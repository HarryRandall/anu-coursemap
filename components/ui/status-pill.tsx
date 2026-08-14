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
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        toneClasses[statusTone[status]],
        className,
      )}
    >
      {status === "completed" && <Check size={11} strokeWidth={2.5} />}
      {statusLabel(status)}
    </span>
  );
}
