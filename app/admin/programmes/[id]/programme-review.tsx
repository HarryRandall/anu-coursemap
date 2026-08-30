"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
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
    <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm leading-6 text-zinc-900">
        {value || <span className="text-zinc-400">Not provided</span>}
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
          className="font-mono font-semibold text-brand-700 hover:text-brand-900"
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
          className="font-mono font-semibold text-brand-700 hover:text-brand-900"
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
      ? `${condition.minimumLevel}00 to ${condition.maximumLevel}00 level `
      : condition.minimumLevel
        ? `${condition.minimumLevel}00 level or above `
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
    <section className="border-b border-zinc-100 px-5 py-4 last:border-b-0 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-950">{group.name}</h3>
        <span className="font-mono text-xs text-zinc-500">{group.code}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {group.operator === "all_of" ? "Complete all of" : "Complete any of"}
        {group.minimumUnits ? ` · at least ${group.minimumUnits} units` : ""}
        {group.minimumCount ? ` · at least ${group.minimumCount} items` : ""}
      </p>
      {group.description ? (
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          {group.description}
        </p>
      ) : null}
      {group.conditions.length ? (
        <ul className="mt-3 space-y-1.5 border-l border-zinc-200 pl-4 text-sm text-zinc-700">
          {group.conditions.map((condition) => (
            <li key={condition.id}>{conditionText(condition)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
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
    <TabsList className="h-auto min-w-max justify-start gap-0 rounded-none bg-transparent p-0">
      {[
        { label: "Details", value: "details" },
        { label: "Requirements", value: "requirements" },
        { label: "Source", value: "source" },
      ].map((item) => (
        <TabsTrigger
          className="h-12 rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-4 text-sm text-zinc-500 shadow-none hover:text-zinc-950 data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 data-[state=active]:shadow-none"
          key={item.value}
          value={item.value}
        >
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
                <Button onClick={() => setEditing(true)} size="sm">
                  <Pencil aria-hidden="true" size={15} /> Edit draft
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
                  variant="primary"
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
            <Alert role="status" tone={message.tone}>
              {message.tone === "success" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}

          <TabsContent className="mt-0" value="details">
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="grid grid-cols-2 border-b border-zinc-200 sm:grid-cols-4">
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
                    className={`px-4 py-3.5 sm:px-5 ${index ? "border-l border-zinc-200" : ""}`}
                    key={label}
                  >
                    <p className="text-xs font-medium text-zinc-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-950 capitalize">
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
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-zinc-950">
                  Requirements
                </h2>
                <Badge tone={record.groups.length ? "neutral" : "warning"}>
                  {record.groups.length}{" "}
                  {record.groups.length === 1 ? "group" : "groups"}
                </Badge>
              </div>
              {record.groups.length ? (
                record.groups.map((group) => (
                  <GroupCard group={group} key={group.id} />
                ))
              ) : (
                <p className="px-5 py-8 text-sm text-zinc-500 sm:px-6">
                  No requirement groups were imported for this version.
                </p>
              )}
            </section>
          </TabsContent>

          <TabsContent className="mt-0" value="source">
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-zinc-950">
                  Source
                </h2>
                {record.source ? (
                  <ButtonLink
                    href={record.source.canonicalUrl}
                    rel="noreferrer"
                    size="sm"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" size={15} /> Open ANU page
                  </ButtonLink>
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
                  <p className="py-8 text-sm text-zinc-500">
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
