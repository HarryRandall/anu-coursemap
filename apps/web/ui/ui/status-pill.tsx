import { badgeVariantForTone } from "@/lib/ui";
import { Check } from "lucide-react";
import { Badge } from "@coursemap/ui/components/badge";
import { statusTone } from "@/lib/ui";
import { statusLabel, type EffectiveStatus } from "@/lib/planner";

export function StatusPill({
  status,
  className,
}: {
  status: EffectiveStatus;
  className?: string;
}) {
  return (
    <Badge
      data-slot="status-pill"
      className={className}
      variant={badgeVariantForTone[statusTone[status]]}
    >
      {status === "completed" && <Check size={11} strokeWidth={2.5} />}
      {statusLabel(status)}
    </Badge>
  );
}
