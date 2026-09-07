"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@coursemap/ui/primitives/tabs";
import { Alert, AlertDescription } from "@coursemap/ui/components/alert";
import { Badge } from "@coursemap/ui/components/badge";
import { Button } from "@coursemap/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@coursemap/ui/primitives/dropdown-menu";
import { ConfirmDialog } from "@/ui/common/confirm-dialog";
import ReuiLink from "next/link";

import {
  Check,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Pencil,
  Ellipsis,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { publishStructureSnapshot } from "@/lib/coursemap/catalogue-publication-actions";
import type {
  AdminStructureReviewCondition,
  AdminStructureReviewGroup,
  AdminStructureReviewRecord,
} from "@/lib/coursemap/admin-catalogue";
import { adminAcademicStructureDetailPath } from "@/lib/coursemap/academic-structure-routes";
import { AppShell } from "@/ui/shell";

import { StructureRequirementDiagram } from "@/ui/admin/academic-structures/requirement-diagram";
import { structureSectionSourceTexts } from "@/lib/coursemap/structure-source-text";
import { AnuSourceDialog } from "@/ui/admin/anu-source-dialog";
import { PendingImportProposals } from "@/ui/admin/pending-import-proposals";
import { JsonCode } from "@/ui/common/json-code";
import {
  AcademicStructureManualSnapshotEditor,
  type StructureEditorSection,
} from "@/ui/admin/academic-structures/manual-snapshot-editor";

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

const detailSections: { key: StructureEditorSection; label: string }[] = [
  { key: "details", label: "Overview" },
  { key: "summary", label: "Course information" },
  { key: "sections", label: "Content" },
  { key: "outcomes", label: "Learning outcomes" },
  { key: "fees", label: "Fees" },
  { key: "relationships", label: "Related programmes and plans" },
];

function StructureSectionContent({
  record,
  section,
}: {
  record: AdminStructureReviewRecord;
  section: StructureEditorSection;
}) {
  const projection = record.projection;
  switch (section) {
    case "details":
      return (
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <Row label="Name" value={record.name} />
          <Row label="Code" value={record.code} />
          <Row label="Units" value={record.units} />
          <Row label="College" value={projection.snapshot.college} />
          <div className="sm:col-span-2">
            <Row
              label="Introduction"
              value={projection.snapshot.introduction}
            />
            <Row label="Description" value={record.description} />
          </div>
        </dl>
      );
    case "summary":
      return (
        <dl>
          {projection.summaryFields.map((field) => (
            <Row
              key={`${field.fieldKey}:${field.valuePosition}`}
              label={field.label}
              value={field.fieldValue}
            />
          ))}
        </dl>
      );
    case "sections":
      return (
        <div className="space-y-5">
          {projection.sections.map((item) => (
            <section key={item.sectionKey}>
              <h3 className="mb-2 text-sm font-semibold">{item.heading}</h3>
              <p className="text-sm leading-7 whitespace-pre-wrap">
                {item.markdown}
              </p>
            </section>
          ))}
        </div>
      );
    case "outcomes":
      return (
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-7">
          {projection.learningOutcomes.map((item) => (
            <li key={item.position}>{item.outcomeText}</li>
          ))}
        </ol>
      );
    case "fees":
      return (
        <dl>
          {projection.fees.map((item) => (
            <Row
              key={item.position}
              label={item.sourceLabel ?? item.audience.replaceAll("_", " ")}
              value={
                item.amount === null
                  ? item.sourceText
                  : `${item.currency ?? "AUD"} ${item.amount.toLocaleString("en-AU")} (${item.basis})`
              }
            />
          ))}
        </dl>
      );
    case "relationships":
      return (
        <ul className="space-y-3 text-sm">
          {projection.relationships.map((item) => (
            <li key={item.position}>
              <span className="font-medium">{item.targetCode}</span>
              {item.targetTitle ? ` · ${item.targetTitle}` : ""}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

function SourceText({
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

export function ProgrammeReview({
  canEdit: canWrite,
  canPublish,
  canReviewImports,
  record,
}: {
  canEdit: boolean;
  canPublish: boolean;
  canReviewImports: boolean;
  record: AdminStructureReviewRecord;
}) {
  const router = useRouter();
  const actionTriggerRef = useRef<HTMLButtonElement>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editing, setEditing] = useState<StructureEditorSection | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [tab, setTab] = useState("details");
  const isDraft = record.draftSnapshotId === record.id;
  const isPublished = record.publishedSnapshotId === record.id;
  const canEdit = canWrite && (isDraft || isPublished);
  const needsReview = record.reviewState !== "verified";

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
  function editor(section: StructureEditorSection) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <SourceText record={record} section={section} />
        </div>
        <AcademicStructureManualSnapshotEditor
          key={`${record.id}:${section}`}
          section={section}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMessage({ text: "Draft saved.", tone: "success" });
          }}
          record={record}
        />
      </div>
    );
  }

  return (
    <Tabs className="block" value={tab} onValueChange={setTab}>
      <AppShell
        showThemeToggle={false}
        admin
        currentBreadcrumbLabel={record.name}
        tabs={
          <TabsList variant="line">
            {[
              { label: "Details", value: "details" },
              { label: "Requirements", value: "requirements" },
              { label: "Preview", value: "preview" },
              { label: "Source", value: "source" },
            ].map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                disabled={editing !== null && item.value !== tab}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        }
      >
        <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 pb-10">
          <h1 className="sr-only">
            Review {record.code} {record.name}
          </h1>
          {isDraft && canPublish ? (
            <div className="mb-5 flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    ref={actionTriggerRef}
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Structure actions"
                  >
                    <Ellipsis aria-hidden="true" size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52"
                  onCloseAutoFocus={(event) => {
                    if (publishDialogOpen) event.preventDefault();
                  }}
                >
                  <DropdownMenuItem
                    disabled={needsReview || publishing || editing !== null}
                    onSelect={() => setPublishDialogOpen(true)}
                  >
                    <Check aria-hidden="true" size={15} />
                    Publish draft
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ConfirmDialog
                open={publishDialogOpen}
                onOpenChange={setPublishDialogOpen}
                returnFocusRef={actionTriggerRef}
                title={`Publish ${record.code} ${record.year}?`}
                description={`Publish the current draft of ${record.name}. It will become the student-facing version for ${record.year}.`}
                confirmLabel="Publish draft"
                onConfirm={publish}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">
              {record.code}
            </span>
            <Badge variant="outline">{record.year}</Badge>
            <Badge variant={isDraft ? "primary-light" : "success-light"}>
              {isDraft
                ? "Draft"
                : isPublished
                  ? "Published"
                  : "Awaiting review"}
            </Badge>
            {needsReview ? (
              <Badge variant="warning-light">Needs review</Badge>
            ) : null}
          </div>
          {message ? (
            <Alert
              role="status"
              variant={message.tone === "success" ? "success" : "destructive"}
            >
              {message.tone === "success" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}
          {canReviewImports ? (
            <PendingImportProposals
              pendingImports={record.pendingImports}
              currentDraftSnapshotId={record.draftSnapshotId}
              structureKind={record.kind}
            />
          ) : null}
          <TabsContent className="mt-0 space-y-5" value="details">
            {detailSections.map(({ key, label }) =>
              editing === key ? (
                <div key={key}>{editor(key)}</div>
              ) : (
                <section
                  className="rounded-xl border border-border bg-card"
                  key={key}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                    <h2 className="text-base font-semibold">{label}</h2>
                    <div className="flex gap-2">
                      <SourceText record={record} section={key} />
                      {canEdit ? (
                        <Button
                          disabled={editing !== null}
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(key)}
                        >
                          <Pencil aria-hidden="true" size={14} />
                          Edit
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="border-t border-border/60 px-5 py-4 sm:px-6">
                    <StructureSectionContent record={record} section={key} />
                  </div>
                </section>
              ),
            )}
          </TabsContent>
          <TabsContent className="mt-0" value="requirements">
            {editing === "requirements" ? (
              editor("requirements")
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <SourceText record={record} section="requirements" />
                  {canEdit ? (
                    <Button
                      onClick={() => setEditing("requirements")}
                      size="sm"
                      variant="outline"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Edit requirements
                    </Button>
                  ) : null}
                </div>

                <Tabs defaultValue="builder">
                  <TabsList aria-label="Requirement view">
                    <TabsTrigger value="builder">Rule builder</TabsTrigger>
                    <TabsTrigger value="diagram">Diagram</TabsTrigger>
                  </TabsList>
                  <TabsContent value="builder">
                    <section className="overflow-hidden rounded-xl border border-border bg-card">
                      {record.groups.length ? (
                        record.groups.map((group) => (
                          <GroupCard key={group.id} group={group} />
                        ))
                      ) : (
                        <p className="p-6 text-sm text-muted-foreground">
                          No requirements recorded.
                        </p>
                      )}
                    </section>
                  </TabsContent>
                  <TabsContent value="diagram">
                    <StructureRequirementDiagram
                      projection={record.projection}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </TabsContent>
          <TabsContent className="mt-0 space-y-6" value="preview">
            <header>
              <p className="text-sm font-medium text-muted-foreground">
                {record.code} · {record.kind} · {record.year}
              </p>
              <h2 className="mt-2 text-3xl font-semibold">{record.name}</h2>
              {record.units !== null ? (
                <Badge className="mt-3" variant="outline">
                  {record.units} units
                </Badge>
              ) : null}
            </header>
            <p className="max-w-4xl text-sm leading-7 whitespace-pre-wrap">
              {record.description}
            </p>
            {record.projection.sections.map((section) => (
              <section
                className="rounded-xl border border-border bg-card p-5 sm:p-6"
                key={section.sectionKey}
              >
                <h3 className="mb-3 text-base font-semibold">
                  {section.heading}
                </h3>
                <p className="text-sm leading-7 whitespace-pre-wrap">
                  {section.markdown}
                </p>
              </section>
            ))}
            {record.projection.learningOutcomes.length ? (
              <section>
                <h3 className="mb-3 text-base font-semibold">
                  Learning outcomes
                </h3>
                <StructureSectionContent record={record} section="outcomes" />
              </section>
            ) : null}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <h3 className="px-5 pt-5 text-base font-semibold">
                Requirements
              </h3>
              {record.groups.map((group) => (
                <GroupCard group={group} key={group.id} />
              ))}
            </section>
          </TabsContent>
          <TabsContent className="mt-0 space-y-5" value="source">
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Source</h2>
                {record.source ? (
                  <Button asChild size="sm" variant="outline">
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
                        {record.source.contentHash}
                      </span>
                    }
                  />
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No source document recorded.
                </p>
              )}
            </section>
            <details className="rounded-xl border border-border">
              <summary className="cursor-pointer px-5 py-4 text-sm font-medium">
                Field evidence
              </summary>
              <JsonCode
                label="Field evidence"
                value={record.projection.evidence}
              />
            </details>
          </TabsContent>
        </div>
      </AppShell>
    </Tabs>
  );
}
