import { Badge } from "@coursemap/ui/components/badge";
import { CatalogueValue } from "@/ui/admin/imports/catalogue-value";
import { extractionConflict } from "@/lib/coursemap/extraction-conflict";

export function ExtractionIssue({
  message,
  sourceText,
  values,
}: {
  message: string;
  sourceText: string | null;
  values?: unknown;
}) {
  const conflict = extractionConflict(values);
  return (
    <div className="min-w-0 space-y-3">
      <p className="text-sm font-medium">{message}</p>
      {sourceText ? (
        <blockquote className="border-l-2 border-border pl-3 text-sm whitespace-pre-wrap text-muted-foreground">
          {sourceText}
        </blockquote>
      ) : null}
      {conflict ? (
        <details className="rounded-lg border border-border">
          <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
            Compare extraction results
          </summary>
          <div className="grid gap-4 px-3 pb-3 text-sm md:grid-cols-2">
            <section
              className="min-w-0 rounded-lg bg-muted/40 p-3"
              aria-label="Parser result"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium">Parser result</h3>
                <Badge variant="outline">Retained</Badge>
              </div>
              <CatalogueValue value={conflict.deterministicValue} />
            </section>
            <section
              className="min-w-0 rounded-lg bg-muted/40 p-3"
              aria-label="AI result"
            >
              <h3 className="mb-3 text-sm font-medium">AI result</h3>
              <CatalogueValue value={conflict.modelValue} />
            </section>
          </div>
        </details>
      ) : null}
    </div>
  );
}
