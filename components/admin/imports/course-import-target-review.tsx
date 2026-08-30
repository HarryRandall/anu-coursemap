"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, CircleAlert, Clock3, Pencil, X } from "lucide-react";
import { CourseImportDatabaseRows } from "@/components/admin/imports/course-import-database-rows";
import { CourseImportArtifactViewer } from "@/components/admin/imports/course-import-artifact-viewer";
import { CourseImportAutoRefresh } from "@/components/admin/imports/course-import-auto-refresh";
import { CourseImportPipeline } from "@/components/admin/imports/course-import-pipeline";
import {
  CourseDetailTabsList,
  CourseDetailView,
} from "@/components/courses/course-detail-view";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableEmpty, DataTableShell } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  acceptCourseImportTarget,
  rejectCourseImportTarget,
} from "@/lib/coursemap/course-import-review-actions";
import type { CourseImportTargetDetail } from "@/lib/coursemap/admin-course-imports";
import {
  countOpenBlockingReviewItems,
  courseImportConfidenceTone,
} from "@/lib/coursemap/course-import-review-state";
import { persistedCourseDatabaseTables } from "@/lib/coursemap/course-import-database-view";
import {
  compactCourseSnapshotChanges,
  compareCourseSnapshotProjections,
} from "@/lib/coursemap/course-snapshot-diff";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import type { Tone } from "@/lib/ui";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function statusTone(status: string): Tone {
  if (status === "failed" || status === "cancelled" || status === "rejected") {
    return "danger";
  }
  if (status === "queued" || status === "processing" || status === "running") {
    return "info";
  }
  if (status === "ready_for_review" || status === "pending") return "warning";
  if (status === "accepted" || status === "succeeded" || status === "valid") {
    return "success";
  }
  return "neutral";
}

function confidence(value: number | null) {
  return value === null
    ? "Not scored"
    : `${Math.round(value * 100)}% confidence`;
}

function comparisonValue(value: unknown) {
  if (value === undefined || value === null) return "Not recorded";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? String(value);
}

function fieldLabel(fieldPath: string) {
  const label = fieldPath
    .replaceAll(".", " · ")
    .replace(
      /\[(\d+)\]/gu,
      (_, index: string) => ` · item ${Number(index) + 1}`,
    )
    .replace(/([a-z\d])([A-Z])/gu, "$1 $2")
    .replace(/^snapshot · /u, "Course details · ");
  const sentence = `${label.charAt(0).toUpperCase()}${label.slice(1).toLowerCase()}`;
  return sentence
    .replace(/\banu\b/giu, "ANU")
    .replace(/\beftsl\b/giu, "EFTSL")
    .replace(/\bgpa\b/giu, "GPA")
    .replace(/\bwam\b/giu, "WAM")
    .replace(" · item ", " item ");
}

function changeSection(fieldPath: string) {
  const root = fieldPath.replace(/^snapshot\./u, "").split(/[.[]/u)[0];
  const sections: Record<string, string> = {
    courseCode: "Course details",
    academicYear: "Course details",
    title: "Course details",
    unitValueKind: "Course details",
    units: "Course details",
    minimumUnits: "Course details",
    maximumUnits: "Course details",
    eftsl: "Course details",
    level: "Course details",
    subjectCode: "Course details",
    subjectName: "Course details",
    school: "Course details",
    college: "Course details",
    academicCareer: "Course details",
    convenerText: "Course details",
    deliverySummary: "Course details",
    offeringStatus: "Course details",
    sourceUpdatedAt: "Course details",
    introduction: "Course content",
    description: "Course content",
    workloadText: "Course content",
    workloadHours: "Course content",
    inherentRequirements: "Course content",
    prescribedTexts: "Course content",
    unitOptions: "Unit options",
    fees: "Fees",
    areasOfInterest: "Areas and attributes",
    attributes: "Areas and attributes",
    relatedCourses: "Related courses",
    courseOffering: "Offerings",
    offeringSessions: "Offerings",
    learningOutcomes: "Learning outcomes",
    assessmentItems: "Assessment",
    assessmentOutcomes: "Assessment",
    rules: "Requisites",
    ruleGroups: "Requisites",
    ruleConditions: "Requisites",
    ruleConditionCourses: "Requisites",
    ruleCourseReferences: "Requisites",
  };
  return sections[root ?? ""] ?? "Other fields";
}

function ReviewItems({ detail }: { detail: CourseImportTargetDetail }) {
  if (detail.reviewItems.length === 0) {
    return (
      <DataTableShell>
        <DataTableEmpty
          description="The import did not record any ambiguity, conflict or validation warning."
          title="No additional checks"
        />
      </DataTableShell>
    );
  }

  return (
    <div className="space-y-3">
      {detail.reviewItems.map((item) => (
        <Card key={item.id}>
          <CardHeader
            action={
              <div className="flex flex-wrap gap-1.5">
                {item.isBlocking ? <Badge tone="danger">Blocking</Badge> : null}
                <Badge
                  tone={
                    item.importance === "critical" || item.importance === "high"
                      ? "warning"
                      : "neutral"
                  }
                >
                  {readable(item.importance)}
                </Badge>
                <Badge tone={statusTone(item.status)}>
                  {readable(item.status)}
                </Badge>
              </div>
            }
            description={`${fieldLabel(item.fieldPath)} · ${confidence(item.confidence)}`}
            title={item.summary}
          />
          <CardContent className="space-y-3">
            {item.sourceExcerpt ? (
              <div>
                <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
                  Source evidence
                </p>
                <blockquote className="mt-1 border-l-2 border-zinc-300 pl-3 text-xs leading-5 whitespace-pre-wrap text-zinc-600">
                  {item.sourceExcerpt}
                </blockquote>
              </div>
            ) : null}
            {item.oldValue !== null || item.newValue !== null ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
                    Saved value
                  </p>
                  <pre className="mt-1 font-mono text-xs break-words whitespace-pre-wrap text-zinc-700">
                    {comparisonValue(item.oldValue)}
                  </pre>
                </div>
                <div className="min-w-0 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
                  <p className="text-[10px] font-medium tracking-wide text-brand-600 uppercase">
                    Imported value
                  </p>
                  <pre className="mt-1 font-mono text-xs break-words whitespace-pre-wrap text-zinc-800">
                    {comparisonValue(item.newValue)}
                  </pre>
                </div>
              </div>
            ) : null}
            {item.resolutionNote ? (
              <p className="text-xs leading-5 text-zinc-600">
                <span className="font-medium text-zinc-800">Resolution:</span>{" "}
                {item.resolutionNote}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReviewChanges({ detail }: { detail: CourseImportTargetDetail }) {
  const changes = useMemo(() => {
    const leafChanges = compareCourseSnapshotProjections(
      detail.previousSnapshot?.projection ?? null,
      detail.candidateProjection,
    );
    return compactCourseSnapshotChanges(
      leafChanges,
      detail.previousSnapshot?.projection ?? null,
      detail.candidateProjection,
    );
  }, [detail.candidateProjection, detail.previousSnapshot]);
  const previousLabel = detail.previousSnapshot?.label ?? "No saved snapshot";
  const groupedChanges = useMemo(() => {
    const groups = new Map<string, typeof changes>();
    for (const change of changes) {
      const section = changeSection(change.fieldPath);
      groups.set(section, [...(groups.get(section) ?? []), change]);
    }
    return [...groups.entries()];
  }, [changes]);

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="review-checks-title">
        <div>
          <h2
            className="text-sm font-semibold text-zinc-950"
            id="review-checks-title"
          >
            Checks requiring confirmation
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            These are extraction warnings or safety checks, not additional
            course fields. Blocking checks must be considered before accepting
            the candidate as a draft.
          </p>
        </div>
        <ReviewItems detail={detail} />
      </section>

      <section className="space-y-3" aria-labelledby="snapshot-changes-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2
              className="text-sm font-semibold text-zinc-950"
              id="snapshot-changes-title"
            >
              Course differences
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Imported values compared with {previousLabel.toLowerCase()}.
            </p>
          </div>
          <Badge tone={changes.length === 0 ? "neutral" : "brand"}>
            {changes.length} review{" "}
            {changes.length === 1 ? "change" : "changes"}
          </Badge>
        </div>

        {!detail.candidateProjection ? (
          <DataTableShell>
            <DataTableEmpty
              description="The comparison becomes available after relational candidate rows have been saved."
              title="No candidate projection"
            />
          </DataTableShell>
        ) : changes.length === 0 ? (
          <DataTableShell>
            <DataTableEmpty
              description={`The relational candidate matches ${previousLabel.toLowerCase()}.`}
              title="No saved field changes"
            />
          </DataTableShell>
        ) : (
          <div className="space-y-3">
            {groupedChanges.map(([section, sectionChanges], sectionIndex) => (
              <details
                className="group overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs"
                key={section}
                open={sectionIndex === 0}
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-zinc-950 marker:content-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none">
                  <span>{section}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone="neutral">
                      {sectionChanges.length}{" "}
                      {sectionChanges.length === 1 ? "change" : "changes"}
                    </Badge>
                    <span
                      aria-hidden="true"
                      className="text-zinc-400 transition-transform group-open:rotate-90"
                    >
                      ›
                    </span>
                  </span>
                </summary>
                <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                  {sectionChanges.map((change) => (
                    <div
                      className="space-y-3 p-4 sm:p-5"
                      key={change.fieldPath}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-zinc-900">
                          {fieldLabel(change.fieldPath)}
                        </p>
                        <Badge
                          tone={
                            change.kind === "added"
                              ? "success"
                              : change.kind === "removed"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {readable(change.kind)}
                        </Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
                            {previousLabel}
                          </p>
                          <pre className="mt-1 max-h-64 overflow-auto font-mono text-xs break-words whitespace-pre-wrap text-zinc-700">
                            {comparisonValue(change.before)}
                          </pre>
                        </div>
                        <div className="min-w-0 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
                          <p className="text-[10px] font-medium tracking-wide text-brand-600 uppercase">
                            Imported candidate
                          </p>
                          <pre className="mt-1 max-h-64 overflow-auto font-mono text-xs break-words whitespace-pre-wrap text-zinc-800">
                            {comparisonValue(change.after)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function CourseImportTargetReview({
  detail,
  previewCourse,
}: {
  detail: CourseImportTargetDetail;
  previewCourse: CourseDetails | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const active = ["queued", "processing"].includes(
    detail.target.processingStatus,
  );
  const canDecide =
    detail.target.processingStatus === "ready_for_review" &&
    detail.target.reviewStatus === "pending";
  const accepted = detail.target.reviewStatus === "accepted";
  const openBlockingReviewCount = countOpenBlockingReviewItems(
    detail.reviewItems,
  );
  const courseWorkspaceHref = detail.target.coursePublicId
    ? `/admin/courses/${detail.target.coursePublicId}?year=${detail.run.academicYear}`
    : null;

  async function decide(decision: "accept" | "reject") {
    const action =
      decision === "accept"
        ? acceptCourseImportTarget
        : rejectCourseImportTarget;
    const result = await action({
      runId: detail.run.id,
      targetId: detail.target.id,
      expectedBaselineDraftSnapshotId: detail.target.baselineDraftSnapshotId,
      expectedCurrentDraftSnapshotId: detail.target.currentDraftSnapshotId,
      resolutionNote: "",
    });
    setMessage({
      tone: result.ok ? "success" : "danger",
      text: result.message,
    });
    if (result.ok) router.refresh();
  }

  return (
    <AppShell
      actions={
        canDecide || accepted ? (
          <div className="flex items-center gap-2">
            {canDecide ? (
              <>
                <ConfirmDialog
                  confirmLabel="Reject candidate"
                  description="The imported snapshot stays in the audit history. The current draft and published course do not change."
                  destructive
                  onConfirm={() => decide("reject")}
                  title={`Reject ${detail.target.courseCode}?`}
                  trigger={
                    <Button size="sm" variant="danger">
                      <X aria-hidden="true" size={15} />
                      Reject
                    </Button>
                  }
                />
                <ConfirmDialog
                  confirmLabel="Accept as draft"
                  description="This makes the candidate the current draft. Students will not see it until you publish it separately."
                  onConfirm={() => decide("accept")}
                  title={`Accept ${detail.target.courseCode} as draft?`}
                  trigger={
                    <Button size="sm" variant="primary">
                      <Check aria-hidden="true" size={15} />
                      Accept as draft
                    </Button>
                  }
                />
              </>
            ) : null}
            {accepted && courseWorkspaceHref ? (
              <ButtonLink
                href={courseWorkspaceHref}
                size="sm"
                variant="primary"
              >
                <Pencil aria-hidden="true" size={15} />
                Open course workspace
              </ButtonLink>
            ) : accepted ? (
              <Button
                disabled
                size="sm"
                title="The permanent course identity is unavailable"
              >
                <Pencil aria-hidden="true" size={15} /> Course workspace
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
      admin
      breadcrumbSegmentLabels={{
        [detail.run.id]: `Run #${detail.run.runNumber}`,
        targets: null,
      }}
      currentBreadcrumbLabel={detail.target.courseCode}
    >
      <CourseImportAutoRefresh active={active} />
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
        <h1 className="sr-only">Review {detail.target.courseCode} import</h1>

        <header className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-lg font-semibold text-zinc-950">
            {detail.target.courseCode}
          </span>
          <Badge tone="neutral">Run #{detail.run.runNumber}</Badge>
          <Badge tone="neutral">{detail.run.academicYear}</Badge>
          <Badge tone={statusTone(detail.target.processingStatus)}>
            {readable(detail.target.processingStatus)}
          </Badge>
          <Badge tone={statusTone(detail.target.reviewStatus)}>
            {readable(detail.target.reviewStatus)}
          </Badge>
          {detail.candidateSnapshot?.overall_confidence !== null &&
          detail.candidateSnapshot?.overall_confidence !== undefined ? (
            <Badge
              tone={courseImportConfidenceTone(
                detail.candidateSnapshot.overall_confidence,
                openBlockingReviewCount,
              )}
            >
              {Math.round(detail.candidateSnapshot.overall_confidence * 100)}%
              confidence
            </Badge>
          ) : null}
        </header>

        {message ? (
          <Alert tone={message.tone}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        {detail.target.errorSummary ? (
          <Alert tone="danger">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              {detail.target.errorCode ? `${detail.target.errorCode}: ` : ""}
              {detail.target.errorSummary}
            </AlertDescription>
          </Alert>
        ) : null}
        {active ? (
          <Alert tone="brand">
            <Clock3 aria-hidden="true" />
            <AlertDescription>
              This course is still running. Saved stages and artefacts update
              automatically.
            </AlertDescription>
          </Alert>
        ) : null}
        {openBlockingReviewCount > 0 ? (
          <Alert tone="warning">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              {openBlockingReviewCount} open blocking review{" "}
              {openBlockingReviewCount === 1 ? "item needs" : "items need"}{" "}
              administrator confirmation. Review the source and candidate before
              accepting this as the draft. Publication remains a separate
              action.
            </AlertDescription>
          </Alert>
        ) : null}
        <Tabs defaultValue="pipeline">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-max">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="changes">Review</TabsTrigger>
              <TabsTrigger value="source">Source and artefacts</TabsTrigger>
              <TabsTrigger value="database">Database rows</TabsTrigger>
              <TabsTrigger value="preview">Course preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pipeline">
            <CourseImportPipeline
              extractions={detail.extractions}
              stages={detail.stages}
            />
          </TabsContent>
          <TabsContent value="changes">
            <ReviewChanges detail={detail} />
          </TabsContent>
          <TabsContent value="source">
            <div className="space-y-4">
              {detail.sourcePage ? (
                <dl className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-zinc-500">ANU page</dt>
                    <dd className="mt-1 break-all">
                      <a
                        className="text-brand-700 underline underline-offset-2"
                        href={detail.sourcePage.canonical_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {detail.sourcePage.canonical_url}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Fetched</dt>
                    <dd className="mt-1 tabular-nums">
                      {dateFormatter.format(
                        new Date(detail.sourcePage.fetched_at),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">HTTP status</dt>
                    <dd className="mt-1 tabular-nums">
                      {detail.sourcePage.http_status ?? "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Source hash</dt>
                    <dd
                      className="mt-1 truncate font-mono"
                      title={detail.sourcePage.content_sha256}
                    >
                      {detail.sourcePage.content_sha256}
                    </dd>
                  </div>
                </dl>
              ) : null}
              <CourseImportArtifactViewer artifacts={detail.artifacts} />
            </div>
          </TabsContent>
          <TabsContent value="database">
            {detail.candidateSnapshot ? (
              <div className="space-y-3">
                <p className="text-xs leading-5 text-zinc-600">
                  These are the exact candidate rows saved in Postgres. Empty
                  tables are shown so missing relationships are easy to spot.
                </p>
                <CourseImportDatabaseRows
                  emptyLabel="0 rows"
                  tables={persistedCourseDatabaseTables({
                    snapshot: detail.candidateSnapshot,
                    relationalData: detail.relationalData,
                  })}
                />
              </div>
            ) : (
              <DataTableShell>
                <DataTableEmpty
                  description="Database rows appear after the candidate snapshot is saved."
                  title="No candidate rows"
                />
              </DataTableShell>
            )}
          </TabsContent>
          <TabsContent value="preview">
            {previewCourse ? (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
                <Alert className="m-4" tone="neutral">
                  <AlertDescription>
                    This is the full student-facing course view using the
                    candidate data. Planning actions are disabled and nothing is
                    published from this tab.
                  </AlertDescription>
                </Alert>
                <Tabs className="gap-0" defaultValue="overview">
                  <div className="border-y border-zinc-200 px-4 sm:px-5">
                    <CourseDetailTabsList />
                  </div>
                  <div className="p-4 sm:p-6">
                    <CourseDetailView
                      course={previewCourse}
                      fullWidth
                      requisiteCompletion={{
                        completedCourses: [],
                        isAuthenticated: false,
                      }}
                    />
                  </div>
                </Tabs>
              </div>
            ) : (
              <DataTableShell>
                <DataTableEmpty
                  description="A preview becomes available after the candidate snapshot is saved."
                  title="No candidate preview"
                />
              </DataTableShell>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
