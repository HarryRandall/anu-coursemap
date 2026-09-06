"use client";
import { badgeVariantForTone } from "@/lib/ui";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@reui/ui/tabs";
import { Alert, AlertDescription } from "@reui/components/alert";
import { Badge } from "@reui/components/badge";
import { Button } from "@reui/ui/button";
import ReuiLink from "next/link";

import {
  Check,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { publishStructureSnapshot } from "@/lib/coursemap/catalogue-publication-actions";
import type {
  AdminStructureReviewCondition,
  AdminStructureReviewGroup,
  AdminStructureReviewRecord,
} from "@/lib/coursemap/admin-catalogue";
import { adminAcademicStructureDetailPath } from "@/lib/coursemap/academic-structure-routes";
import { AppShell } from "@/components/shell";

import { AcademicStructureManualSnapshotEditor } from "@/components/admin/academic-structures/manual-snapshot-editor";

function formatDate(value: string | null) {
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

function Row({ label, value }: { label: string; value: ReactNode }) {
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

function conditionText(condition: AdminStructureReviewCondition) {
  if (condition.optionCodes.length > 1) {
    return `${condition.kind === "structure_list" ? "Choose a structure from" : "Choose courses from"}: ${condition.optionCodes.join(", ")}`;
  }
  if (condition.courseCode) {
    return (
      <>
        Complete{" "}
        <Link
          className="font-mono font-semibold text-primary hover:text-primary"
          href={`/admin/courses/${condition.courseCode}`}
        >
          {condition.courseCode}
        </Link>
      </>
    );
  }
  if (condition.targetStructureCode && condition.targetStructureKind) {
    return (
      <>
        Complete{" "}
        <Link
          className="font-mono font-semibold text-primary hover:text-primary"
          href={adminAcademicStructureDetailPath({
            kind: condition.targetStructureKind,
            publicId: condition.targetStructureCode,
          })}
        >
          {condition.targetStructureCode}
        </Link>
      </>
    );
  }

  const level =
    condition.minimumLevel && condition.maximumLevel
      ? `${condition.minimumLevel} to ${condition.maximumLevel} level `
      : condition.minimumLevel
        ? `${condition.minimumLevel} level or above `
        : "";
  const units = condition.minimumUnits
    ? `${condition.minimumUnits} units `
    : "";
  const subject = condition.subjectCode ? `of ${condition.subjectCode} ` : "";
  const summary = `${units}${subject}${level}`.trim();
  return summary
    ? `Complete ${summary}`
    : (condition.sourceText ?? "Condition");
}

function GroupCard({ group }: { group: AdminStructureReviewGroup }) {
  return (
    <section className="border-b border-border/60 px-5 py-4 last:border-b-0 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
        <span className="font-mono text-xs text-muted-foreground">
          {group.code}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {group.operator === "all_of" ? "Complete all of" : "Complete any of"}
        {group.minimumUnits ? ` · at least ${group.minimumUnits} units` : ""}
        {group.minimumCount ? ` · at least ${group.minimumCount} items` : ""}
      </p>
      {group.description ? (
        <p className="mt-2 text-sm leading-6 text-foreground/80">
          {group.description}
        </p>
      ) : null}
      {group.conditions.length ? (
        <ul className="mt-3 space-y-1.5 border-l border-border pl-4 text-sm text-foreground/80">
          {group.conditions.map((condition) => (
            <li key={condition.id}>{conditionText(condition)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No conditions were imported for this group.
        </p>
      )}
    </section>
  );
}

export function ProgrammeReview({
  canEdit,
  canPublish,
  record,
}: {
  canEdit: boolean;
  canPublish: boolean;
  record: AdminStructureReviewRecord;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [tab, setTab] = useState<"details" | "requirements" | "source">(
    "details",
  );
  const isDraft = record.publicationStatus === "draft";
  const needsReview = record.reviewState !== "verified";

  if (editing) {
    return (
      <AppShell admin currentBreadcrumbLabel={record.name}>
        <div className="mx-auto w-full max-w-7xl min-w-0 pb-10">
          <AcademicStructureManualSnapshotEditor
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              setMessage({
                text: "A new manual draft was saved. It has not been published.",
                tone: "success",
              });
            }}
            record={record}
          />
        </div>
      </AppShell>
    );
  }

  async function publish() {
    setPublishing(true);
    setMessage(null);
    const result = await publishStructureSnapshot(
      record.structureYearId,
      record.id,
      record.code,
      record.kind,
      record.publicId,
    );
    setPublishing(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) router.refresh();
  }

  const tabs = (
    <TabsList variant="line">
      {[
        { label: "Details", value: "details" },
        { label: "Requirements", value: "requirements" },
        { label: "Source", value: "source" },
      ].map((item) => (
        <TabsTrigger key={item.value} value={item.value}>
          {item.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <Tabs
      className="block"
      onValueChange={(value) =>
        setTab(value as "details" | "requirements" | "source")
      }
      value={tab}
    >
      <AppShell
        actions={
          canEdit || (isDraft && canPublish) ? (
            <div className="flex items-center gap-2">
              {canEdit ? (
                <Button
                  onClick={() => setEditing(true)}
                  size="sm"
                  variant="outline"
                  type="button"
                >
                  <Pencil aria-hidden="true" size={15} />
                  Edit draft
                </Button>
              ) : null}
              {isDraft && canPublish ? (
                <Button
                  disabled={needsReview || publishing}
                  onClick={publish}
                  size="sm"
                  title={
                    needsReview
                      ? "Verify the imported requirements before publishing."
                      : undefined
                  }
                  variant="default"
                  type="button"
                >
                  <Check aria-hidden="true" size={15} />
                  {publishing ? "Publishing..." : "Publish"}
                </Button>
              ) : null}
            </div>
          ) : null
        }
        admin
        currentBreadcrumbLabel={record.name}
        tabs={tabs}
      >
        <div className="mx-auto w-full max-w-7xl min-w-0 space-y-4 pb-10">
          <h1 className="sr-only">
            Review {record.code} {record.name}
          </h1>

          {message ? (
            <Alert
              role="status"
              variant={
                (
                  {
                    neutral: "default",
                    brand: "info",
                    danger: "destructive",
                    success: "success",
                    warning: "warning",
                  } as const
                )[message.tone]
              }
            >
              {message.tone === "success" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}

          <TabsContent className="mt-0" value="details">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
                {[
                  ["Catalogue", String(record.year)],
                  ["Kind", record.kind],
                  [
                    "Version",
                    record.publicationStatus === "published"
                      ? "Published"
                      : "Draft",
                  ],
                  [
                    "Review",
                    record.reviewState === "verified"
                      ? "Verified"
                      : "Needs source review",
                  ],
                ].map(([label, value], index) => (
                  <div
                    className={`px-4 py-3.5 sm:px-5 ${index ? "border-l border-border" : ""}`}
                    key={label}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground capitalize">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-5 sm:px-6">
                <dl>
                  <Row label="Name" value={record.name} />
                  <Row label="Code" value={record.code} />
                  <Row
                    label="Units"
                    value={
                      record.units === null ? null : `${record.units} units`
                    }
                  />
                  <Row label="Description" value={record.description} />
                </dl>
              </div>
            </section>
          </TabsContent>

          <TabsContent className="mt-0" value="requirements">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-foreground">
                  Requirements
                </h2>
                <Badge
                  variant={
                    badgeVariantForTone[
                      record.groups.length ? "neutral" : "warning"
                    ]
                  }
                >
                  {record.groups.length}{" "}
                  {record.groups.length === 1 ? "group" : "groups"}
                </Badge>
              </div>
              {record.groups.length ? (
                record.groups.map((group) => (
                  <GroupCard group={group} key={group.id} />
                ))
              ) : (
                <p className="px-5 py-8 text-sm text-muted-foreground sm:px-6">
                  No requirement groups were imported for this version.
                </p>
              )}
            </section>
          </TabsContent>

          <TabsContent className="mt-0" value="source">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-foreground">
                  Source
                </h2>
                {record.source ? (
                  <Button
                    asChild

                    size="sm"

                    variant="outline"
                  >
                    <ReuiLink
                      rel="noreferrer"
                      target="_blank"
                      href={record.source.canonicalUrl}
                    >
                      <ExternalLink aria-hidden="true" size={15} />
                      Open ANU page
                    </ReuiLink>
                  </Button>
                ) : null}
              </div>
              <div className="px-5 sm:px-6">
                {record.source ? (
                  <dl>
                    <Row
                      label="Retrieved"
                      value={formatDate(record.source.fetchedAt)}
                    />
                    <Row
                      label="Last modified"
                      value={formatDate(record.source.lastModified)}
                    />
                    <Row
                      label="Content hash"
                      value={
                        <span className="font-mono text-xs break-all">
                          {record.source.contentHash ?? "Not recorded"}
                        </span>
                      }
                    />
                    <Row
                      label="Canonical URL"
                      value={
                        <span className="break-all">
                          {record.source.canonicalUrl}
                        </span>
                      }
                    />
                  </dl>
                ) : (
                  <p className="py-8 text-sm text-muted-foreground">
                    No source document is attached to this version.
                  </p>
                )}
              </div>
            </section>
          </TabsContent>
        </div>
      </AppShell>
    </Tabs>
  );
}
