"use client";

import {
  Check,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Pencil,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  publishCourseVersion,
  saveCourseReviewDraft,
  type CourseReviewDraftInput,
} from "@/lib/coursemap/catalogue-publication-actions";
import type { AdminCourseReviewRecord } from "@/lib/coursemap/admin-catalogue";
import {
  parseRequisiteSummary,
  type RequisiteExpression,
} from "@/lib/coursemap/requisite-summary";
import {
  CourseReviewTabs,
  type CourseReviewTab,
} from "@/components/admin/imports/course-review-tabs";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Tabs, TabsContent } from "@/components/ui/tabs";

type DraftFields = Omit<CourseReviewDraftInput, "catalogueYear" | "code">;

function initialDraft(record: AdminCourseReviewRecord): DraftFields {
  return {
    convener: record.convener ?? "",
    deliverySummary: record.deliverySummary ?? "",
    description: record.description,
    level: record.level,
    reviewState: record.reviewState === "verified" ? "verified" : "review",
    school: record.school,
    subject: record.subject,
    title: record.title,
    units: record.units,
  };
}

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

function readableState(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function Panel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
      {children}
    </section>
  );
}

function FieldValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm leading-6 text-zinc-900">
        {value || <span className="text-zinc-400">Not provided</span>}
      </dd>
    </div>
  );
}

function RequisiteTree({ expression }: { expression: RequisiteExpression }) {
  if (expression.kind === "course") {
    return (
      <span>
        Complete{" "}
        <span className="font-mono font-semibold">{expression.code}</span>
      </span>
    );
  }
  if (expression.kind === "subject_units") {
    return (
      <span>
        Complete {expression.units} units of {expression.subject}-coded courses
      </span>
    );
  }
  if (expression.kind === "level_units") {
    return (
      <span>
        Complete {expression.units} units at {expression.level}-level
        {expression.subject ? ` in ${expression.subject}` : ""}
      </span>
    );
  }
  if (expression.kind === "units_total") {
    return <span>Complete {expression.units} units of tertiary study</span>;
  }
  return (
    <div>
      <p className="text-sm font-semibold text-zinc-950">
        {expression.operator === "all_of" ? "All of" : "Any of"}
      </p>
      <ul className="mt-2 space-y-2 border-l border-zinc-200 pl-4 text-sm leading-6 text-zinc-700">
        {expression.conditions.map((condition, index) => (
          <li key={index} className="relative">
            <span className="absolute top-3 -left-4 w-2 border-t border-zinc-200" />
            <RequisiteTree expression={condition} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FieldsForm({
  draft,
  onCancel,
  onChange,
  onSubmit,
  saving,
}: {
  draft: DraftFields;
  onCancel: () => void;
  onChange: (next: DraftFields) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <form className="space-y-5 p-5 sm:p-6" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course title">
          <Input
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
            required
            value={draft.title}
          />
        </Field>
        <Field label="Subject">
          <Input
            onChange={(event) =>
              onChange({ ...draft, subject: event.target.value })
            }
            required
            value={draft.subject}
          />
        </Field>
        <Field label="Units">
          <Input
            min="0.5"
            onChange={(event) =>
              onChange({ ...draft, units: Number(event.target.value) })
            }
            required
            step="0.5"
            type="number"
            value={draft.units}
          />
        </Field>
        <Field label="Course level">
          <Input
            min="0"
            onChange={(event) =>
              onChange({ ...draft, level: Number(event.target.value) })
            }
            required
            step="1"
            type="number"
            value={draft.level}
          />
        </Field>
        <Field className="sm:col-span-2" label="School">
          <Input
            onChange={(event) =>
              onChange({ ...draft, school: event.target.value })
            }
            required
            value={draft.school}
          />
        </Field>
        <Field label="Convenor">
          <Input
            onChange={(event) =>
              onChange({ ...draft, convener: event.target.value })
            }
            value={draft.convener}
          />
        </Field>
        <Field label="Delivery summary">
          <Input
            onChange={(event) =>
              onChange({ ...draft, deliverySummary: event.target.value })
            }
            value={draft.deliverySummary}
          />
        </Field>
        <Field
          className="sm:col-span-2"
          hint="Verified means the visible values and requisite wording have been checked against ANU."
          label="Review decision"
        >
          <Select
            aria-label="Review decision"
            onChange={(reviewState) => onChange({ ...draft, reviewState })}
            options={[
              { value: "review", label: "Needs source review" },
              { value: "verified", label: "Verified against source" },
            ]}
            value={draft.reviewState}
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          className="min-h-32"
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
          required
          value={draft.description}
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Button onClick={onCancel}>Cancel</Button>
        <Button disabled={saving} type="submit" variant="primary">
          <Save aria-hidden="true" size={15} />
          {saving ? "Saving..." : "Save review"}
        </Button>
      </div>
    </form>
  );
}

export function CourseReview({
  canEdit,
  record,
}: {
  canEdit: boolean;
  record: AdminCourseReviewRecord;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CourseReviewTab>("changes");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => initialDraft(record));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const isDraft = record.publicationStatus === "draft";
  const unverifiedRules = record.rules.filter(
    (rule) => rule.reviewState !== "verified",
  );
  const needsReview =
    record.reviewState !== "verified" || unverifiedRules.length > 0;
  const requisiteRules = record.rules.filter((rule) =>
    [
      "prerequisite",
      "corequisite",
      "incompatibility",
      "permission",
      "assumed_knowledge",
    ].includes(rule.kind),
  );
  const parsedOutput = {
    course: {
      code: record.code,
      title: record.title,
      catalogueYear: record.year,
      units: record.units,
      level: record.level,
      subject: record.subject,
      school: record.school,
      convener: record.convener,
      description: record.description,
      deliverySummary: record.deliverySummary,
      publicationStatus: record.publicationStatus,
      reviewState: record.reviewState,
    },
    offerings: record.offerings,
    rules: record.rules.map((rule) => ({
      kind: rule.kind,
      hardness: rule.hardness,
      reviewState: rule.reviewState,
      sourceText: rule.sourceText,
    })),
    source: record.source,
  };

  function startEditing() {
    setActiveTab("fields");
    setEditing(true);
    setMessage(null);
  }

  function cancelEditing() {
    setDraft(initialDraft(record));
    setEditing(false);
    setMessage(null);
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const result = await saveCourseReviewDraft({
      ...draft,
      catalogueYear: record.year,
      code: record.code,
    });
    setSaving(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  async function publish() {
    setPublishing(true);
    setMessage(null);
    const result = await publishCourseVersion(record.code, record.year);
    setPublishing(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) router.refresh();
  }

  return (
    <Tabs
      className="block"
      onValueChange={(value) => setActiveTab(value as CourseReviewTab)}
      value={activeTab}
    >
      <AppShell
        actions={
          <>
            {isDraft && canEdit && !editing ? (
              <Button onClick={startEditing} size="sm">
                <Pencil aria-hidden="true" size={15} /> Edit fields
              </Button>
            ) : null}
            {record.publicationStatus === "published" ? (
              <ButtonLink
                href={`/courses/${record.code}`}
                size="sm"
                variant="secondary"
              >
                <ExternalLink aria-hidden="true" size={15} /> Student page
              </ButtonLink>
            ) : null}
            {isDraft ? (
              <Button
                disabled={needsReview || publishing}
                onClick={publish}
                size="sm"
                title={
                  needsReview
                    ? "Verify the course and its requisite rules before publishing."
                    : undefined
                }
                variant="primary"
              >
                <Check aria-hidden="true" size={15} />
                {publishing ? "Publishing..." : "Publish"}
              </Button>
            ) : null}
          </>
        }
        admin
        currentBreadcrumbLabel={`${record.code} ${record.title}`}
        tabs={<CourseReviewTabs />}
      >
        <div className="mx-auto w-full max-w-6xl min-w-0 pb-10">
          <h1 className="sr-only">
            Review {record.code} {record.title}
          </h1>
          {message ? (
            <Alert className="mb-4" role="status" tone={message.tone}>
              {message.tone === "success" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}

          <TabsContent className="mt-0" value="changes">
            <Panel label="Review summary">
              <div className="grid grid-cols-3 border-b border-zinc-200">
                {[
                  ["Catalogue", String(record.year)],
                  ["Version", readableState(record.publicationStatus)],
                  [
                    "Review",
                    record.reviewState === "verified"
                      ? "Verified"
                      : "Needs source review",
                  ],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className={`px-3 py-4 sm:px-6 ${index ? "border-l border-zinc-200" : ""}`}
                  >
                    <p className="text-xs font-medium text-zinc-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-5 sm:px-6">
                {[
                  ["Title", record.title],
                  ["Units", `${record.units} units`],
                  ["School", record.school],
                  ["Delivery", record.deliverySummary ?? "Not provided"],
                  ["Description", record.description],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid gap-2 border-b border-zinc-100 py-4 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-5"
                  >
                    <p className="text-sm font-semibold text-zinc-950">
                      {label}
                    </p>
                    <p className="text-sm leading-6 text-zinc-700">{value}</p>
                  </div>
                ))}
              </div>
              {unverifiedRules.length ? (
                <div className="flex flex-col gap-1 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-sm font-medium text-zinc-700">
                    {unverifiedRules.length} requisite rule
                    {unverifiedRules.length === 1 ? "" : "s"} still need review
                  </p>
                  <button
                    className="text-left text-sm font-medium text-brand-700 hover:text-brand-900 sm:text-right"
                    onClick={() => setActiveTab("prerequisites")}
                    type="button"
                  >
                    Review requisites
                  </button>
                </div>
              ) : null}
            </Panel>
          </TabsContent>

          <TabsContent className="mt-0" value="fields">
            <Panel label="All fields">
              {editing ? (
                <FieldsForm
                  draft={draft}
                  onCancel={cancelEditing}
                  onChange={setDraft}
                  onSubmit={saveDraft}
                  saving={saving}
                />
              ) : (
                <div className="px-5 sm:px-6">
                  <dl>
                    <FieldValue label="Course code" value={record.code} />
                    <FieldValue label="Title" value={record.title} />
                    <FieldValue label="Catalogue year" value={record.year} />
                    <FieldValue label="Subject" value={record.subject} />
                    <FieldValue label="Units" value={record.units} />
                    <FieldValue label="Level" value={record.level} />
                    <FieldValue label="School" value={record.school} />
                    <FieldValue label="Convenor" value={record.convener} />
                    <FieldValue
                      label="Delivery summary"
                      value={record.deliverySummary}
                    />
                    <FieldValue
                      label="Description"
                      value={record.description}
                    />
                    <FieldValue
                      label="Source updated"
                      value={formatDate(record.sourceUpdatedAt)}
                    />
                  </dl>
                </div>
              )}
            </Panel>
            <section className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <h2 className="border-b border-zinc-200 px-5 py-4 text-base font-semibold text-zinc-950 sm:px-6">
                Offerings
              </h2>
              {record.offerings.length ? (
                <div className="divide-y divide-zinc-100">
                  {record.offerings.map((offering, index) => (
                    <div key={offering.id} className="px-5 py-4 sm:px-6">
                      <p className="text-sm font-semibold text-zinc-950">
                        Offering {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {[offering.deliveryMode, offering.location]
                          .filter(Boolean)
                          .join(" · ") || "Delivery details not provided"}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                        {offering.sessions.map((session, sessionIndex) => (
                          <li key={`${offering.id}-${sessionIndex}`}>
                            {[
                              session.period,
                              session.deliveryMode,
                              session.location,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-zinc-500 sm:px-6">
                  No offerings are stored for this version.
                </p>
              )}
            </section>
          </TabsContent>

          <TabsContent className="mt-0" value="source">
            <Panel label="Source HTML">
              <div className="p-5 sm:p-6">
                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-zinc-900">
                    HTML snapshot unavailable
                  </p>
                  <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-zinc-500">
                    No stored HTML body or accessible storage path is attached
                    to this record. The source metadata below is still
                    preserved.
                  </p>
                </div>
                {record.source ? (
                  <div className="mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-zinc-950">
                        Source metadata
                      </h3>
                      <ButtonLink
                        href={record.source.canonicalUrl}
                        rel="noreferrer"
                        size="sm"
                        target="_blank"
                      >
                        <ExternalLink aria-hidden="true" size={15} /> Open ANU
                        page
                      </ButtonLink>
                    </div>
                    <dl className="mt-3 border-t border-zinc-100">
                      <FieldValue
                        label="Retrieved"
                        value={formatDate(record.source.fetchedAt)}
                      />
                      <FieldValue
                        label="Last modified"
                        value={formatDate(record.source.lastModified)}
                      />
                      <FieldValue
                        label="Content hash"
                        value={
                          <span className="font-mono text-xs break-all">
                            {record.source.contentHash ?? "Not recorded"}
                          </span>
                        }
                      />
                      <FieldValue
                        label="Canonical URL"
                        value={
                          <span className="break-all">
                            {record.source.canonicalUrl}
                          </span>
                        }
                      />
                    </dl>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-zinc-500">
                    No source document is attached to this record.
                  </p>
                )}
              </div>
            </Panel>
          </TabsContent>

          <TabsContent className="mt-0" value="parsed">
            <Panel label="Parsed output">
              <div className="px-5 sm:px-6">
                <dl>
                  <FieldValue
                    label="Course"
                    value={`${record.code} ${record.title}`}
                  />
                  <FieldValue
                    label="Offerings"
                    value={record.offerings.length}
                  />
                  <FieldValue
                    label="Requisite rules"
                    value={record.rules.length}
                  />
                  <FieldValue
                    label="Review state"
                    value={readableState(record.reviewState)}
                  />
                </dl>
              </div>
              <details className="border-t border-zinc-200">
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:px-6">
                  JSON representation
                </summary>
                <pre className="max-h-[65vh] overflow-auto border-t border-zinc-200 bg-zinc-950 p-5 font-mono text-xs leading-6 text-zinc-100 sm:p-6">
                  {JSON.stringify(parsedOutput, null, 2)}
                </pre>
              </details>
            </Panel>
          </TabsContent>

          <TabsContent className="mt-0" value="prerequisites">
            <Panel label="Prerequisites">
              {requisiteRules.length ? (
                <div className="divide-y divide-zinc-200">
                  {requisiteRules.map((rule) => {
                    const expression =
                      rule.kind === "prerequisite"
                        ? parseRequisiteSummary(rule.sourceText)
                        : null;
                    return (
                      <section key={rule.id} className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-base font-semibold text-zinc-950 capitalize">
                            {rule.kind.replaceAll("_", " ")}
                          </h3>
                          <p className="text-sm text-zinc-500">
                            {rule.reviewState === "verified"
                              ? "Verified"
                              : "Needs review"}
                          </p>
                        </div>
                        <p className="mt-3 border-l-2 border-zinc-300 pl-4 text-sm leading-7 whitespace-pre-wrap text-zinc-800">
                          {rule.sourceText}
                        </p>
                        {expression ? (
                          <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                            <h4 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              Structured interpretation
                            </h4>
                            <RequisiteTree expression={expression} />
                          </div>
                        ) : rule.kind === "prerequisite" ? (
                          <p className="mt-4 text-sm text-amber-800">
                            This wording has not been converted to a structured
                            tree. The source text above remains authoritative.
                          </p>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-zinc-500 sm:px-6">
                  No requisite rules are stored for this version.
                </p>
              )}
            </Panel>
          </TabsContent>

          <TabsContent className="mt-0" value="student">
            <Panel label="Student preview">
              <article className="p-5 sm:p-8">
                <p className="font-mono text-sm font-semibold text-zinc-500">
                  {record.code}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                  {record.title}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  {record.year} · {record.units} units · {record.school}
                </p>
                <p className="mt-7 max-w-3xl text-base leading-7 text-zinc-800">
                  {record.description}
                </p>
                <div className="mt-8 grid gap-6 border-t border-zinc-200 pt-6 md:grid-cols-2">
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Delivery
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {record.deliverySummary ?? "Not provided"}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-zinc-700">
                      {record.offerings.flatMap((offering) =>
                        offering.sessions.map((session, index) => (
                          <li key={`${offering.id}-${index}`}>
                            {[session.period, session.deliveryMode]
                              .filter(Boolean)
                              .join(" · ")}
                          </li>
                        )),
                      )}
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Requisites
                    </h3>
                    {requisiteRules.length ? (
                      <ul className="mt-2 space-y-3 text-sm leading-6 text-zinc-700">
                        {requisiteRules.map((rule) => (
                          <li key={rule.id}>{rule.sourceText}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">
                        No requisites are listed.
                      </p>
                    )}
                  </section>
                </div>
              </article>
            </Panel>
          </TabsContent>
        </div>
      </AppShell>
    </Tabs>
  );
}
