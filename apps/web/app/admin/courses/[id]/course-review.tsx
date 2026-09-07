"use client";

import { Alert, AlertDescription } from "@coursemap/ui/components/alert";
import { Badge } from "@coursemap/ui/components/badge";
import { Button } from "@coursemap/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@coursemap/ui/primitives/dropdown-menu";

import { OptionPicker } from "@/ui/ui/option-picker";
import { Tabs, TabsContent } from "@coursemap/ui/primitives/tabs";

import {
  Archive,
  Check,
  CheckCircle2,
  CircleAlert,
  FileCode2,
  Pencil,
  Ellipsis,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { CourseImportArtifactViewer } from "@/ui/admin/imports/course-import-artifact-viewer";
import { CourseImportPipeline } from "@/ui/admin/imports/course-import-pipeline";
import {
  CourseSnapshotRuleEditor,
  CourseSnapshotRuleViewer,
  type EditableRuleKind,
} from "@/ui/admin/course-snapshot-rule-editor";
import {
  CourseReviewTabs,
  type CourseReviewTab,
} from "@/ui/admin/imports/course-review-tabs";
import {
  CourseDetailTabsList,
  CourseDetailView,
} from "@/ui/courses/course-detail-view";
import { AppShell } from "@/ui/shell";

import { ConfirmDialog } from "@/ui/ui/confirm-dialog";

import { AnuSourceDialog } from "@/ui/admin/anu-source-dialog";
import { CourseProjectionEditor } from "@/ui/admin/courses/course-projection-editor";

import type { CourseSnapshotProjectionData } from "@/lib/course-import/project-snapshot";
import { projectionChanges } from "@/lib/coursemap/course-workspace-projection";
import { PendingImportProposals } from "@/ui/admin/pending-import-proposals";
import { CourseDataSections } from "@/ui/admin/courses/course-data-sections";
import type { AdminCourseYearRecord } from "@/lib/coursemap/admin-course-year";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import {
  archiveCourseYear,
  confirmCourseSnapshot,
  publishCourseSnapshot,
  saveCourseSnapshot,
} from "@/lib/coursemap/course-snapshot-actions";

const COURSE_REVIEW_CONFIRMATION_NOTE =
  "Administrator confirmed the snapshot against the stored ANU source and resolved every blocking import review item.";

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function Panel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {children}
    </section>
  );
}

function RequisitePanel({
  canEdit,
  editing,
  kind,
  onCancelEdit,
  onEdit,
  onSave,
  projection,
  originalSourceTexts,
}: {
  canEdit: boolean;
  editing: boolean;
  kind:
    | "incompatibility"
    | "prerequisite"
    | "corequisite"
    | "permission"
    | "assumed_knowledge";
  onCancelEdit: () => void;
  onEdit: () => void;
  onSave: (projection: CourseSnapshotProjectionData) => Promise<void>;
  projection: CourseSnapshotProjectionData;
  originalSourceTexts: string[];
}) {
  const rules = projection.rules.filter((rule) => rule.ruleKind === kind);
  return (
    <Panel label={readable(kind)}>
      {editing ? (
        <CourseSnapshotRuleEditor
          canEdit={canEdit}
          kind={kind}
          onCancel={onCancelEdit}
          onSave={onSave}
          projection={projection}
          originalSourceTexts={originalSourceTexts}
        />
      ) : rules.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold">{readable(kind)}</h2>
            <Button
              disabled={!canEdit}
              onClick={onEdit}
              size="sm"
              variant="outline"
              type="button"
            >
              <Pencil aria-hidden="true" size={14} />
              Edit requisite
            </Button>
          </div>
          <div className="mx-5 mb-3 sm:mx-6">
            <AnuSourceDialog
              title={readable(kind)}
              texts={originalSourceTexts}
            />
          </div>
          <CourseSnapshotRuleViewer kind={kind} projection={projection} />
        </>
      ) : null}
    </Panel>
  );
}

export function CourseReview({
  canWrite,
  canReviewImports,
  previewCourse,
  record,
}: {
  canWrite: boolean;
  canReviewImports: boolean;
  previewCourse: CourseDetails | null;
  record: AdminCourseYearRecord;
}) {
  const router = useRouter();
  const actionTriggerRef = useRef<HTMLButtonElement>(null);
  const [actionDialog, setActionDialog] = useState<
    "review" | "publish" | "archive" | null
  >(null);
  const [activeTab, setActiveTab] = useState<CourseReviewTab>("course");
  const [editingRuleKind, setEditingRuleKind] =
    useState<EditableRuleKind | null>(null);
  const [newRuleKind, setNewRuleKind] =
    useState<EditableRuleKind>("prerequisite");
  const [editingCourse, setEditingCourse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const projection = record.projection;
  const availableRuleKinds = (
    [
      "prerequisite",
      "corequisite",
      "permission",
      "assumed_knowledge",
      "incompatibility",
    ] as const
  ).filter((kind) => !projection?.rules.some((rule) => rule.ruleKind === kind));
  const selectedNewRuleKind = availableRuleKinds.includes(newRuleKind)
    ? newRuleKind
    : availableRuleKinds[0];
  const isActive = record.lifecycleStatus === "active";
  const viewingHistorical =
    record.currentSnapshotId !== null &&
    record.currentSnapshotId !== record.activeSnapshotId;
  const isDraft =
    record.draftSnapshotId !== null &&
    record.currentSnapshotId === record.draftSnapshotId;
  const canEdit =
    canWrite &&
    isActive &&
    !viewingHistorical &&
    projection !== null &&
    record.currentSnapshotId !== null;
  const canPublish =
    canWrite &&
    isActive &&
    isDraft &&
    record.snapshot?.sealed_at !== null &&
    !record.snapshot?.has_critical_uncertainty &&
    record.blockingReviewItems.length === 0;
  const needsExplicitConfirmation = Boolean(
    record.snapshot?.has_critical_uncertainty ||
    record.blockingReviewItems.length > 0,
  );
  const changes = projection
    ? projectionChanges(projection, record.publishedProjection)
    : [];

  function chooseSnapshot(snapshotId: number) {
    const suffix =
      snapshotId === record.activeSnapshotId ? "" : `&snapshot=${snapshotId}`;
    router.push(
      `/admin/courses/${record.publicId}?year=${record.year}${suffix}`,
    );
  }

  function startRuleEditing(kind: EditableRuleKind) {
    if (!canEdit || !projection) return;
    setEditingRuleKind(kind);
    setMessage(null);
  }

  async function saveRuleProjection(next: CourseSnapshotProjectionData) {
    if (record.currentSnapshotId === null) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveCourseSnapshot({
        coursePublicId: record.publicId,
        courseYearId: record.courseYearId,
        expectedBaseSnapshotId: record.currentSnapshotId,
        projection: next,
      });
      setMessage({
        text: result.message,
        tone: result.ok ? "success" : "danger",
      });
      if (!result.ok) throw new Error(result.message);
      setEditingRuleKind(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (record.draftSnapshotId === null) return;
    setPublishing(true);
    setMessage(null);
    const result = await publishCourseSnapshot({
      code: record.code,
      coursePublicId: record.publicId,
      courseYearId: record.courseYearId,
      expectedPublishedSnapshotId: record.publishedSnapshotId,
      snapshotId: record.draftSnapshotId,
      year: record.year,
    });
    setPublishing(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) router.refresh();
  }

  async function confirmReviewedSnapshot() {
    if (!projection || record.currentSnapshotId === null) return;
    setConfirming(true);
    setMessage(null);
    const result = await confirmCourseSnapshot({
      blockingReviewItemIds: record.blockingReviewItems.map((item) => item.id),
      confirmationNote: COURSE_REVIEW_CONFIRMATION_NOTE,
      coursePublicId: record.publicId,
      courseYearId: record.courseYearId,
      expectedBaseSnapshotId: record.currentSnapshotId,
      projection,
    });
    setConfirming(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) {
      router.refresh();
    }
  }

  async function archive() {
    setArchiving(true);
    setMessage(null);
    const result = await archiveCourseYear({
      code: record.code,
      coursePublicId: record.publicId,
      courseYearId: record.courseYearId,
      expectedDraftSnapshotId: record.draftSnapshotId,
      expectedPublishedSnapshotId: record.publishedSnapshotId,
      year: record.year,
    });
    setArchiving(false);
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
        showThemeToggle={false}
        admin
        currentBreadcrumbLabel={projection?.snapshot.title ?? record.code}
        tabs={
          <CourseReviewTabs
            hasImport={record.importTarget !== null}
            editing={editingCourse || editingRuleKind !== null}
            activeTab={activeTab}
          />
        }
      >
        <div className="mx-auto w-full max-w-7xl min-w-0 pb-10">
          <h1 className="sr-only">
            Review {record.code} {projection?.snapshot.title}
          </h1>
          <div className="mb-5 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  ref={actionTriggerRef}
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Course actions"
                >
                  <Ellipsis aria-hidden="true" size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52"
                onCloseAutoFocus={(event) => {
                  if (actionDialog) event.preventDefault();
                }}
              >
                {needsExplicitConfirmation && canEdit ? (
                  <DropdownMenuItem
                    disabled={
                      confirming || editingCourse || editingRuleKind !== null
                    }
                    onSelect={() => setActionDialog("review")}
                  >
                    <CheckCircle2 aria-hidden="true" size={15} />
                    Confirm review
                  </DropdownMenuItem>
                ) : null}
                {isDraft ? (
                  <DropdownMenuItem
                    disabled={
                      !canPublish ||
                      publishing ||
                      editingCourse ||
                      editingRuleKind !== null
                    }
                    onSelect={() => setActionDialog("publish")}
                  >
                    <Check aria-hidden="true" size={15} />
                    Publish draft
                  </DropdownMenuItem>
                ) : null}
                {(needsExplicitConfirmation && canEdit) || isDraft ? (
                  <DropdownMenuSeparator />
                ) : null}
                <DropdownMenuItem
                  variant="destructive"
                  disabled={
                    !canWrite ||
                    !isActive ||
                    archiving ||
                    editingCourse ||
                    editingRuleKind !== null
                  }
                  onSelect={() => setActionDialog("archive")}
                >
                  <Archive aria-hidden="true" size={15} />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
              open={actionDialog === "review"}
              onOpenChange={(open) => {
                if (!open) setActionDialog(null);
              }}
              returnFocusRef={actionTriggerRef}
              confirmLabel="Confirm review"
              title={`Confirm review of ${record.code}?`}
              description={`Confirm that ${record.code} ${record.year} has been checked against the stored ANU source. This creates a confirmed manual draft and resolves blocking checks.`}
              onConfirm={confirmReviewedSnapshot}
            />
            <ConfirmDialog
              open={actionDialog === "publish"}
              onOpenChange={(open) => {
                if (!open) setActionDialog(null);
              }}
              returnFocusRef={actionTriggerRef}
              confirmLabel="Publish draft"
              title={`Publish ${record.code} ${record.year}?`}
              description={`Publish the current draft for ${record.year}. It will replace the student-facing version for this year.`}
              onConfirm={publish}
            />
            <ConfirmDialog
              open={actionDialog === "archive"}
              onOpenChange={(open) => {
                if (!open) setActionDialog(null);
              }}
              returnFocusRef={actionTriggerRef}
              confirmLabel="Archive course year"
              title={`Archive ${record.code} ${record.year}?`}
              description={`Archive ${record.code} for ${record.year}. Students will no longer see it for this year. Saved versions and source artefacts will be kept.`}
              destructive
              onConfirm={archive}
            />
          </div>

          {message ? (
            <Alert
              className="mb-4"
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
          {!isActive ? (
            <Alert className="mb-4" variant={"warning"}>
              <Archive aria-hidden="true" />
              <AlertDescription>
                This course year is archived. Its snapshots remain available for
                audit, but it cannot be edited or published.
              </AlertDescription>
            </Alert>
          ) : null}
          {viewingHistorical ? (
            <Alert className="mb-4" variant={"default"}>
              <AlertDescription>
                You are inspecting an immutable historical snapshot. Select the
                active snapshot above to edit or publish.
              </AlertDescription>
            </Alert>
          ) : null}
          {record.snapshot?.has_critical_uncertainty &&
          (activeTab === "pipeline" || activeTab === "source") ? (
            <Alert className="mb-4" variant={"warning"}>
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                This imported draft has critical uncertainty. Review every field
                against the source, then use the explicit confirmation action
                before publication.
              </AlertDescription>
            </Alert>
          ) : null}

          {record.importTarget ? (
            <TabsContent className="mt-0" value="pipeline">
              <CourseImportPipeline
                extractions={record.importTarget.extractions}
                reviewHref={`/admin/courses/imports/${record.importTarget.targetId}`}
                stages={record.importTarget.stages}
              />
            </TabsContent>
          ) : null}

          {canReviewImports && !viewingHistorical ? (
            <PendingImportProposals
              pendingImports={record.pendingImports.filter(
                (proposal) =>
                  proposal.candidateSnapshotId !== record.draftSnapshotId &&
                  !proposal.isCurrentDraftSource,
              )}
              currentDraftSnapshotId={record.draftSnapshotId}
            />
          ) : null}
          <TabsContent className="mt-0" value="course">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {record.snapshotHistory.length > 1 &&
              record.currentSnapshotId !== null ? (
                <div className="w-56">
                  <OptionPicker
                    value={"coursemap:" + String(record.currentSnapshotId)}
                    onValueChange={(nextValue) => {
                      const option = record.snapshotHistory
                        .map((snapshot) => ({
                          label: `Snapshot ${snapshot.snapshotNumber} · ${readable(snapshot.origin)}`,
                          value: snapshot.id,
                        }))
                        .find(
                          (option) =>
                            "coursemap:" + String(option.value) === nextValue,
                        );
                      if (option) chooseSnapshot(option.value);
                    }}
                    aria-label={"Saved snapshot"}
                    onPointerDown={(event) => event.stopPropagation()}
                    placeholder={"Select..."}
                    items={record.snapshotHistory
                      .map((snapshot) => ({
                        label: `Snapshot ${snapshot.snapshotNumber} · ${readable(snapshot.origin)}`,
                        value: snapshot.id,
                      }))
                      .map((option) => ({
                        value: "coursemap:" + String(option.value),
                        label: option.label,
                      }))}
                  />
                </div>
              ) : null}
              <span className="font-mono text-sm font-semibold">
                {record.code}
              </span>
              <Badge variant="outline">{record.year}</Badge>
              <Badge variant={isDraft ? "primary-light" : "success-light"}>
                {isDraft ? "Draft" : "Published"}
              </Badge>
              {viewingHistorical ? (
                <Badge variant="outline">Historical snapshot</Badge>
              ) : null}
              {!isActive ? <Badge variant="outline">Archived</Badge> : null}
            </div>

            <div className="space-y-4">
              {record.publishedProjection && changes.length > 0 ? (
                <details className="rounded-xl border border-border bg-card">
                  <summary className="cursor-pointer px-5 py-4 text-sm font-medium">
                    {changes.length} changes from the published version
                  </summary>
                  <ul className="space-y-2 px-5 pb-4 text-sm text-muted-foreground">
                    {changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <CourseDataSections
                canEdit={canEdit && !saving}
                onSave={saveRuleProjection}
                onEditingChange={setEditingCourse}
                record={record}
              />
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="source">
            <div className="space-y-4">
              <CourseImportArtifactViewer artifacts={record.artifacts} />
              <Panel label="Relational projection">
                <details>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-semibold text-foreground marker:content-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-6">
                    <FileCode2
                      aria-hidden="true"
                      className="text-muted-foreground/80"
                      size={17}
                    />
                    Relational projection
                  </summary>

                  <CourseProjectionEditor
                    canEdit={canEdit}
                    onEditingChange={setEditingCourse}
                    onSave={saveRuleProjection}
                    record={record}
                  />
                </details>
              </Panel>
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="requisites">
            {projection ? (
              <div className="space-y-4">
                {(
                  [
                    "prerequisite",
                    "corequisite",
                    "permission",
                    "assumed_knowledge",
                    "incompatibility",
                  ] as const
                )
                  .filter(
                    (kind) =>
                      projection.rules.some((rule) => rule.ruleKind === kind) ||
                      editingRuleKind === kind,
                  )
                  .map((kind) => (
                    <RequisitePanel
                      key={kind}
                      canEdit={canEdit}
                      editing={editingRuleKind === kind}
                      kind={kind}
                      onCancelEdit={() => setEditingRuleKind(null)}
                      onEdit={() => startRuleEditing(kind)}
                      onSave={saveRuleProjection}
                      projection={projection}
                      originalSourceTexts={
                        record.sourceOriginalProjection?.rules
                          .filter((rule) => rule.ruleKind === kind)
                          .map((rule) => rule.sourceText) ?? []
                      }
                    />
                  ))}
                {!projection.rules.length && !editingRuleKind ? (
                  <p className="py-8 text-sm text-muted-foreground">
                    No requisites recorded.
                  </p>
                ) : null}
                {canEdit &&
                !editingRuleKind &&
                availableRuleKinds.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-56">
                      <OptionPicker
                        aria-label="Requisite type"
                        value={selectedNewRuleKind ?? ""}
                        onValueChange={(value) =>
                          setNewRuleKind(value as EditableRuleKind)
                        }
                        items={availableRuleKinds.map((kind) => ({
                          value: kind,
                          label: readable(kind),
                        }))}
                      />
                    </div>
                    <Button
                      disabled={!selectedNewRuleKind}
                      onClick={() =>
                        selectedNewRuleKind &&
                        startRuleEditing(selectedNewRuleKind)
                      }
                      variant="outline"
                      type="button"
                    >
                      <Plus aria-hidden="true" size={15} />
                      Add requisite
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent className="mt-0" value="student">
            {previewCourse ? (
              <Tabs className="gap-0" defaultValue="overview">
                <div className="border-b border-border">
                  <CourseDetailTabsList />
                </div>
                <div className="pt-6">
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
            ) : (
              <Panel label="Course preview">
                <p className="px-5 py-8 text-sm text-muted-foreground sm:px-6">
                  A snapshot is required before the course preview is available.
                </p>
              </Panel>
            )}
          </TabsContent>
        </div>
      </AppShell>
    </Tabs>
  );
}
