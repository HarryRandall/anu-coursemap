"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Pencil,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  publishCourseVersion,
  saveCourseReviewDraft,
  type CourseReviewDraftInput,
} from "@/lib/coursemap/catalogue-publication-actions";
import type { AdminCourseReviewRecord } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type DraftFields = Omit<CourseReviewDraftInput, "catalogueYear" | "code">;

function reviewTone(reviewState: string) {
  return reviewState === "verified"
    ? "success"
    : reviewState === "review"
      ? "warning"
      : "neutral";
}

function reviewLabel(reviewState: string) {
  return reviewState === "verified"
    ? "Verified"
    : reviewState === "review"
      ? "Source review"
      : "Automatically imported";
}

function publicationTone(status: string) {
  return status === "published" ? "success" : "warning";
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

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

function DetailList({
  values,
}: {
  values: Array<{ label: string; value: string | number | null }>;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {values.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium text-zinc-500">{item.label}</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {item.value || "Not listed"}
          </dd>
        </div>
      ))}
    </dl>
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => initialDraft(record));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isDraft = record.publicationStatus === "draft";
  const needsReview =
    record.reviewState !== "verified" ||
    record.rules.some((rule) => rule.reviewState !== "verified");

  function cancelEditing() {
    setDraft(initialDraft(record));
    setEditing(false);
    setMessage(null);
  }

  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const result = await saveCourseReviewDraft({
      ...draft,
      catalogueYear: record.year,
      code: record.code,
    });
    setSaving(false);
    setMessage(result.message);
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
    setMessage(result.message);
    if (result.ok) router.refresh();
  }

  return (
    <AppShell admin>
      <main className="mx-auto w-full max-w-6xl min-w-0 space-y-5 pb-10">
        <ButtonLink href="/admin/courses" size="sm" variant="ghost">
          <ArrowLeft size={15} /> All course versions
        </ButtonLink>

        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-zinc-900">
                {record.code}
              </span>
              <Badge tone={publicationTone(record.publicationStatus)}>
                {record.publicationStatus === "published"
                  ? "Published"
                  : "Draft"}
              </Badge>
              <Badge tone={reviewTone(record.reviewState)}>
                {reviewLabel(record.reviewState)}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Review {record.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {record.year} catalogue · {record.units} units · level{" "}
              {record.level}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDraft && canEdit && !editing && (
              <Button onClick={() => setEditing(true)} variant="secondary">
                <Pencil size={15} /> Edit draft fields
              </Button>
            )}
            {record.publicationStatus === "published" && (
              <ButtonLink href={`/courses/${record.code}`} variant="secondary">
                <ExternalLink size={15} /> View student page
              </ButtonLink>
            )}
            {isDraft && (
              <Button
                disabled={needsReview || publishing}
                onClick={publish}
                title={
                  needsReview
                    ? "Mark the imported fields as verified before publishing."
                    : undefined
                }
              >
                <CheckCircle2 size={15} />
                {publishing ? "Publishing…" : "Publish for students"}
              </Button>
            )}
          </div>
        </header>

        {message && (
          <p
            role="status"
            className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900 ring-1 ring-brand-100"
          >
            {message}
          </p>
        )}

        {needsReview && (
          <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
            <div className="flex items-start gap-3">
              <ClipboardCheck
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-amber-700"
                size={19}
              />
              <div>
                <h2 className="text-sm font-semibold text-amber-950">
                  {isDraft
                    ? "What to review before publishing"
                    : "Source review remains open"}
                </h2>
                {isDraft ? (
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-amber-900">
                    <li>
                      Open the ANU source and compare the title, units, school,
                      delivery and description below.
                    </li>
                    <li>
                      Check each offering and requisite wording against that
                      source, especially any item marked Source review.
                    </li>
                    <li>
                      Correct draft fields if needed, then save with the review
                      decision set to Verified.
                    </li>
                  </ol>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    This version is already visible to students. Its original
                    imported wording and source record remain available below
                    for an administrator to assess and follow up.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <Card>
              <CardHeader
                title="Course fields"
                description={
                  isDraft
                    ? "These are the values that will appear in Coursemap when this draft is published."
                    : "These are the values currently available to students in Coursemap."
                }
                icon={
                  <FileText
                    aria-hidden="true"
                    size={18}
                    className="text-brand-700"
                  />
                }
              />
              <div className="border-t border-zinc-100 px-5 py-5">
                {editing ? (
                  <form className="space-y-5" onSubmit={saveDraft}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Course title">
                        <Input
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          required
                          value={draft.title}
                        />
                      </Field>
                      <Field label="Subject">
                        <Input
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              subject: event.target.value,
                            }))
                          }
                          required
                          value={draft.subject}
                        />
                      </Field>
                      <Field label="Units">
                        <Input
                          min="0.5"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              units: Number(event.target.value),
                            }))
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
                            setDraft((current) => ({
                              ...current,
                              level: Number(event.target.value),
                            }))
                          }
                          required
                          step="1"
                          type="number"
                          value={draft.level}
                        />
                      </Field>
                      <Field label="School" className="sm:col-span-2">
                        <Input
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              school: event.target.value,
                            }))
                          }
                          required
                          value={draft.school}
                        />
                      </Field>
                      <Field label="Convenor">
                        <Input
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              convener: event.target.value,
                            }))
                          }
                          value={draft.convener}
                        />
                      </Field>
                      <Field label="Delivery summary">
                        <Input
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              deliverySummary: event.target.value,
                            }))
                          }
                          value={draft.deliverySummary}
                        />
                      </Field>
                      <Field
                        label="Review decision"
                        hint="Verified confirms that you compared the course fields and source wording against the linked ANU page."
                        className="sm:col-span-2"
                      >
                        <Select
                          aria-label="Review decision"
                          onChange={(reviewState) =>
                            setDraft((current) => ({
                              ...current,
                              reviewState,
                            }))
                          }
                          options={[
                            { value: "review", label: "Keep in source review" },
                            {
                              value: "verified",
                              label: "Verified against source",
                            },
                          ]}
                          value={draft.reviewState}
                        />
                      </Field>
                    </div>
                    <Field label="Description">
                      <Textarea
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        required
                        value={draft.description}
                      />
                    </Field>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
                      <Button onClick={cancelEditing} variant="secondary">
                        Cancel
                      </Button>
                      <Button disabled={saving} type="submit">
                        <Save size={15} />
                        {saving ? "Saving…" : "Save review"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <DetailList
                      values={[
                        { label: "Course code", value: record.code },
                        { label: "Subject", value: record.subject },
                        { label: "Units", value: record.units },
                        { label: "Course level", value: record.level },
                        { label: "School", value: record.school },
                        { label: "Convenor", value: record.convener },
                        {
                          label: "Delivery summary",
                          value: record.deliverySummary,
                        },
                        {
                          label: "Source updated",
                          value: formatDate(record.sourceUpdatedAt),
                        },
                      ]}
                    />
                    <div className="mt-5 border-t border-zinc-100 pt-5">
                      <h3 className="text-xs font-medium text-zinc-500">
                        Description
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 whitespace-pre-wrap text-zinc-800">
                        {record.description}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Offerings"
                description="Delivery and teaching periods imported for this course version."
              />
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {record.offerings.map((offering, index) => (
                  <section key={offering.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Offering {index + 1}
                      </h3>
                      <Badge tone={publicationTone(offering.status)}>
                        {offering.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">
                      {[offering.deliveryMode, offering.location]
                        .filter(Boolean)
                        .join(" · ") || "No delivery details listed"}
                    </p>
                    {offering.sessions.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {offering.sessions.map((session, sessionIndex) => (
                          <li
                            key={`${offering.id}-${sessionIndex}`}
                            className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                          >
                            <span className="font-medium text-zinc-900">
                              {session.period}
                            </span>
                            {(session.deliveryMode || session.location) && (
                              <span className="text-zinc-500">
                                {" "}
                                ·{" "}
                                {[session.deliveryMode, session.location]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500">
                        No teaching periods were imported for this offering.
                      </p>
                    )}
                  </section>
                ))}
                {record.offerings.length === 0 && (
                  <p className="px-5 py-10 text-center text-sm text-zinc-500">
                    No offerings were imported for this course version.
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Requisites and compatibility"
                description="The original rule wording stays visible as evidence for the review."
              />
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {record.rules.map((rule) => (
                  <section key={rule.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 capitalize">
                          {rule.kind.replaceAll("_", " ")}
                        </h3>
                        <Badge tone={reviewTone(rule.reviewState)}>
                          {reviewLabel(rule.reviewState)}
                        </Badge>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {rule.hardness} · {Math.round(rule.confidence * 100)}%
                        confidence
                      </span>
                    </div>
                    <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-3 text-sm leading-6 whitespace-pre-wrap text-zinc-800 ring-1 ring-zinc-100">
                      {rule.sourceText}
                    </p>
                  </section>
                ))}
                {record.rules.length === 0 && (
                  <p className="px-5 py-10 text-center text-sm text-zinc-500">
                    No requisite or compatibility rules were imported.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card>
              <CardHeader
                title="Imported source"
                description={`The immutable source record used for this ${isDraft ? "draft" : "course version"}.`}
              />
              <div className="space-y-4 border-t border-zinc-100 px-5 py-5">
                {record.source ? (
                  <>
                    <ButtonLink
                      href={record.source.canonicalUrl}
                      size="sm"
                      target="_blank"
                      rel="noreferrer"
                      variant="secondary"
                    >
                      <ExternalLink size={15} /> Open ANU source
                    </ButtonLink>
                    <DetailList
                      values={[
                        {
                          label: "Retrieved",
                          value: formatDate(record.source.fetchedAt),
                        },
                        {
                          label: "Last modified",
                          value: formatDate(record.source.lastModified),
                        },
                      ]}
                    />
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        Content fingerprint
                      </p>
                      <p className="mt-1 font-mono text-[11px] leading-5 break-all text-zinc-700">
                        {record.source.contentHash ?? "Not recorded"}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-zinc-600">
                    This demo record has no persisted source snapshot.
                    Production imports always retain a canonical source URL and
                    fingerprint.
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Review safeguards"
                description={
                  isDraft
                    ? "Draft editing does not overwrite the imported source record."
                    : "Published versions are read-only so their student-facing record stays stable."
                }
              />
              <ul className="space-y-2 border-t border-zinc-100 px-5 py-5 text-sm leading-6 text-zinc-600">
                {isDraft ? (
                  <>
                    <li>Only draft course versions can be edited here.</li>
                    <li>
                      Save Verified only after comparing the visible fields and
                      rule wording with ANU.
                    </li>
                    <li>
                      A newer ANU source should be imported rather than
                      replacing the evidence text by hand.
                    </li>
                  </>
                ) : (
                  <>
                    <li>Published course values cannot be changed in place.</li>
                    <li>
                      Compare the visible values and source wording before
                      recording any correction for the next review cycle.
                    </li>
                    <li>
                      Keep the imported source record intact rather than
                      replacing its evidence text by hand.
                    </li>
                  </>
                )}
              </ul>
            </Card>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
