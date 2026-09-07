import { Badge } from "@coursemap/ui/components/badge";
import { JsonCode } from "@/ui/ui/json-code";
import { badgeVariantForTone } from "@/lib/ui";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function yesNo(value: unknown) {
  return value === true ? "Yes" : value === false ? "No" : "Not recorded";
}

export function PersistenceDecision({ value }: { value: unknown }) {
  if (!isRecord(value)) {
    return <JsonCode label="Persistence decision" value={value} />;
  }
  const changeKind =
    typeof value.changeKind === "string" ? value.changeKind : "unknown";
  const decision =
    changeKind === "new"
      ? "Create a new candidate snapshot"
      : changeKind === "changed"
        ? "Create a changed candidate snapshot"
        : changeKind === "unchanged"
          ? "Reuse the existing saved data"
          : "Persistence decision not recorded";

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Database action
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {decision}
          </p>
        </div>
        <Badge
          variant={
            badgeVariantForTone[
              changeKind === "unchanged" ? "neutral" : "warning"
            ]
          }
        >
          {changeKind.replaceAll("_", " ")}
        </Badge>
      </div>
      <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Compared snapshot</dt>
          <dd className="mt-1 font-mono text-foreground/90">
            {String(value.comparedSnapshotId ?? "None")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Candidate snapshot</dt>
          <dd className="mt-1 font-mono text-foreground/90">
            {String(value.candidateSnapshotId ?? "None")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Manual review required</dt>
          <dd className="mt-1 text-foreground/90">
            {yesNo(value.requiresManualReview)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            Record changed during import
          </dt>
          <dd className="mt-1 text-foreground/90">
            {yesNo(value.baselineChangedDuringImport)}
          </dd>
        </div>
      </dl>
      <details className="group rounded-lg border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          View complete persistence record
        </summary>
        <JsonCode label="Complete persistence decision" value={value} />
      </details>
    </div>
  );
}
