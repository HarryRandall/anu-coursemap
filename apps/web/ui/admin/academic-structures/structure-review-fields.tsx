"use client";
import { type ReactNode } from "react";
import type { AdminStructureReviewRecord } from "@/lib/coursemap/admin-catalogue";
import { structureSectionSourceTexts } from "@/lib/coursemap/structure-source-text";
import { AnuSourceDialog } from "@/ui/admin/common/anu-source-dialog";
import { type StructureEditorSection } from "@/ui/admin/academic-structures/manual-snapshot-editor";

export function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(date);
}
export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-6 text-foreground">
        {value || (
          <span className="text-muted-foreground/80">Not provided</span>
        )}
      </dd>
    </div>
  );
}
export function SourceText({
  record,
  section,
}: {
  record: AdminStructureReviewRecord;
  section: StructureEditorSection;
}) {
  const texts = structureSectionSourceTexts(
    record.sourceOriginalProjection,
    section,
  );
  return (
    <AnuSourceDialog
      title={section === "requirements" ? "Requirements" : "ANU source text"}
      texts={texts}
      sourceUrl={record.source?.canonicalUrl}
    />
  );
}
