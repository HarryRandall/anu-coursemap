import type { ReactNode } from "react";
import { Badge } from "@reui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@reui/ui/card";
import type { AcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";

export function readableImportValue(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function displayValue(value: unknown): ReactNode {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function formatFee(amount: number | null, currency: string | null) {
  if (amount === null) return "Amount not stated";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency ?? "AUD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency ?? "AUD"}`;
  }
}

function MetadataItem({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground/90">{displayValue(value)}</dd>
    </div>
  );
}

export function AcademicStructureImportSummary({
  detail,
}: {
  detail: AcademicStructureImportTargetDetail;
}) {
  const snapshot = detail.candidateSnapshot;
  if (!snapshot) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{snapshot.name}</h2>
        </CardTitle>
        <CardDescription>{`${readableImportValue(detail.run.structureKind)} · ${detail.run.academicYear}`}</CardDescription>
        {snapshot.critical_uncertainty && (
          <CardAction>
            <Badge variant="warning-light">Critical uncertainty</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <MetadataItem label="Code" value={detail.target.code} />
          <MetadataItem
            label="Extraction confidence"
            value={
              snapshot.overall_confidence === null
                ? null
                : `${Math.round(snapshot.overall_confidence * 100)}%`
            }
          />
          <MetadataItem label="Acronym" value={snapshot.acronym} />
          <MetadataItem label="Units" value={snapshot.units} />
          <MetadataItem label="Duration" value={snapshot.duration_years} />
          <MetadataItem
            label="Academic career"
            value={snapshot.academic_career}
          />
          <MetadataItem label="College" value={snapshot.college} />
          <MetadataItem label="Delivery" value={snapshot.mode_of_delivery} />
          <MetadataItem
            label="Selection rank"
            value={snapshot.selection_rank}
          />
          <MetadataItem label="ATAR" value={snapshot.atar} />
          <MetadataItem label="Study as" value={snapshot.study_as} />
          <MetadataItem label="Can combine" value={snapshot.can_combine} />
          <MetadataItem
            label="Vertical combination"
            value={snapshot.can_combine_vertical}
          />
        </dl>
        {snapshot.introduction ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Introduction
            </p>
            <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-foreground/80">
              {snapshot.introduction}
            </p>
          </div>
        ) : null}
        {snapshot.description ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Description
            </p>
            <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-foreground/80">
              {snapshot.description}
            </p>
          </div>
        ) : null}
        {snapshot.contact_text ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Contact</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/80">
              {snapshot.contact_text}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
