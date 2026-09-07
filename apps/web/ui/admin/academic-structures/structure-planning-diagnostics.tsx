import { CircleAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@coursemap/ui/components/alert";
import type { AcademicStructureManualSnapshotProjection } from "@/lib/structure-import/manual-snapshot";
import { structurePlanningDiagnostics } from "@/lib/coursemap/structure-planning-diagnostics";

export function StructurePlanningDiagnostics({
  projection,
  compact = false,
}: {
  compact?: boolean;
  projection: AcademicStructureManualSnapshotProjection;
}) {
  const { issues, rules } = structurePlanningDiagnostics(projection);
  if (issues.length === 0 && rules.length === 0) return null;
  const content = (
    <Alert variant="warning">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>Planning data review</AlertTitle>
      <AlertDescription className="space-y-3">
        {issues.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        {rules.length > 0 ? (
          <div>
            <p className="font-medium">Rules requiring admin review</p>
            <p>
              These rules cannot be checked automatically. Review their source
              wording and update the requirement model.
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-4">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
  if (!compact) return content;
  return (
    <details className="shrink-0 rounded-lg border border-warning/30 bg-warning/4">
      <summary className="px-3 py-2 text-sm font-medium">
        Planning data review ({issues.length + rules.length})
      </summary>
      <div className="max-h-[min(25dvh,16rem)] overflow-auto p-2 pr-3">
        {content}
      </div>
    </details>
  );
}
