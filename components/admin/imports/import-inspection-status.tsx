import { Badge } from "@reui/components/badge";
import { ExtractionIssue } from "@/components/admin/extraction-issue";

export function importStatusLabel(processing: string, review: string) {
  if (
    ["failed", "cancelled", "queued", "processing", "running"].includes(
      processing,
    )
  ) {
    return processing.charAt(0).toUpperCase() + processing.slice(1);
  }
  if (review === "accepted") return "Accepted as draft";
  if (review === "rejected") return "Rejected";
  if (processing === "unchanged" || review === "unchanged") return "No changes";
  return "Imported";
}

export function ImportInspectionStatus({
  processing,
  review,
}: {
  processing: string;
  review: string;
}) {
  const label = importStatusLabel(processing, review);
  return (
    <Badge
      variant={
        label === "Failed" || label === "Rejected"
          ? "destructive-light"
          : label === "Imported" || label === "Accepted as draft"
            ? "success-light"
            : "outline"
      }
    >
      {label}
    </Badge>
  );
}

export type ImportDiagnostic = {
  id: number | string;
  message: string;
  field: string;
  sourceText: string | null;
  isError: boolean;
  values?: unknown;
};

export function ImportDiagnostics({ items }: { items: ImportDiagnostic[] }) {
  if (!items.length) return null;
  return (
    <details className="rounded-xl border border-border">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
        Extraction issues ({items.length})
      </summary>
      <div className="space-y-4 px-4 pb-4">
        {items.map((item) => (
          <div key={item.id} className="space-y-3">
            {item.isError ? (
              <Badge variant="destructive-light">Error</Badge>
            ) : null}
            <ExtractionIssue
              message={item.message}
              sourceText={item.sourceText}
              values={item.values}
            />
          </div>
        ))}
      </div>
    </details>
  );
}
