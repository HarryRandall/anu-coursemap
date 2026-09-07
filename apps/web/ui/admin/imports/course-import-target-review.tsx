"use client";

import { Alert, AlertDescription } from "@coursemap/ui/components/alert";
import { Badge } from "@coursemap/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@coursemap/ui/primitives/tabs";
import { CircleAlert } from "lucide-react";
import { CourseImportDatabaseRows } from "@/ui/admin/imports/course-import-database-rows";
import { CourseImportArtifactViewer } from "@/ui/admin/imports/course-import-artifact-viewer";
import { CourseImportAutoRefresh } from "@/ui/admin/imports/course-import-auto-refresh";
import { CourseImportPipeline } from "@/ui/admin/imports/course-import-pipeline";
import { ImportInspectionActions } from "@/ui/admin/imports/import-inspection-actions";
import {
  ImportDiagnostics,
  ImportInspectionStatus,
} from "@/ui/admin/imports/import-inspection-status";
import {
  CourseDetailTabsList,
  CourseDetailView,
} from "@/ui/courses/course-detail-view";
import { AppShell } from "@/ui/shell";
import { DataTableEmpty, DataTableShell } from "@/ui/common/data-table";
import type { CourseImportTargetDetail } from "@/lib/coursemap/admin-course-imports";
import { persistedCourseDatabaseTables } from "@/lib/coursemap/course-import-database-view";
import type { CourseDetails } from "@/lib/coursemap/course-types";

export function CourseImportTargetReview({
  detail,
  previewCourse,
}: {
  detail: CourseImportTargetDetail;
  previewCourse: CourseDetails | null;
}) {
  const active = ["queued", "processing"].includes(
    detail.target.processingStatus,
  );
  const workspaceHref = detail.target.coursePublicId
    ? `/admin/courses/${detail.target.coursePublicId}?year=${detail.run.academicYear}`
    : null;
  return (
    <AppShell
      admin
      fullBleed
      currentBreadcrumbLabel={detail.target.courseCode}
      showThemeToggle={false}
    >
      <CourseImportAutoRefresh active={active} />
      <div className="w-full px-4 pb-4 sm:px-6">
        <div className="flex justify-end py-3">
          <ImportInspectionActions
            code={detail.target.courseCode}
            academicYear={detail.run.academicYear}
            requestedModel={detail.run.requestedModel}
            active={active}
            workspaceHref={workspaceHref}
          />
        </div>
        <h1 className="sr-only">{detail.target.courseCode} import</h1>
        <Tabs defaultValue="pipeline" className="gap-5">
          <div className="-mx-4 overflow-x-auto border-b border-border px-4 sm:-mx-6 sm:px-6">
            <TabsList aria-label="Import sections" variant="line">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="source">Source and artefacts</TabsTrigger>
              <TabsTrigger value="database">Database rows</TabsTrigger>
              <TabsTrigger value="preview">Course preview</TabsTrigger>
            </TabsList>
          </div>
          {detail.target.errorSummary ? (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>{detail.target.errorSummary}</AlertDescription>
            </Alert>
          ) : null}
          <TabsContent value="pipeline" className="space-y-5">
            <header className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-semibold">
                {detail.target.courseCode}
              </span>
              <Badge variant="outline">Run #{detail.run.runNumber}</Badge>
              <Badge variant="outline">{detail.run.academicYear}</Badge>
              <ImportInspectionStatus
                processing={detail.target.processingStatus}
                review={detail.target.reviewStatus}
              />
            </header>
            <CourseImportPipeline
              extractions={detail.extractions}
              stages={detail.stages}
            />
            <ImportDiagnostics
              items={detail.reviewItems
                .filter((item) => item.issueCode !== "MANUAL_REVIEW_REQUIRED")
                .map((item) => ({
                  id: item.id,
                  field: item.fieldPath,
                  message: item.summary,
                  sourceText: item.sourceExcerpt,
                  values: item.newValue,
                  isError: item.isBlocking,
                }))}
            />
          </TabsContent>
          <TabsContent value="source">
            <CourseImportArtifactViewer artifacts={detail.artifacts} />
          </TabsContent>
          <TabsContent value="database">
            <CourseImportDatabaseRows
              artifacts={detail.artifacts}
              emptyLabel="0 rows"
              tables={
                detail.candidateSnapshot
                  ? persistedCourseDatabaseTables({
                      snapshot: detail.candidateSnapshot,
                      relationalData: detail.relationalData,
                    })
                  : []
              }
            />
          </TabsContent>
          <TabsContent value="preview">
            {previewCourse ? (
              <Tabs className="gap-0" defaultValue="overview">
                <div className="overflow-x-auto border-b border-border">
                  <CourseDetailTabsList />
                </div>
                <div className="py-5">
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
              <DataTableShell>
                <DataTableEmpty
                  title="No course preview"
                  description="The import has not saved a course snapshot."
                />
              </DataTableShell>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
