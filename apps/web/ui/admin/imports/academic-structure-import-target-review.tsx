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
import { AcademicStructureImportArtifactViewer } from "@/ui/admin/imports/academic-structure-import-artifact-viewer";
import {
  AcademicStructureImportDatabaseRows,
  persistedAcademicStructureDatabaseTables,
} from "@/ui/admin/imports/academic-structure-import-database-rows";
import { AcademicStructureImportPipeline } from "@/ui/admin/imports/academic-structure-import-pipeline";
import { AcademicStructureImportPreview } from "@/ui/admin/imports/academic-structure-import-preview";
import { CourseImportAutoRefresh } from "@/ui/admin/imports/course-import-auto-refresh";
import { ImportInspectionActions } from "@/ui/admin/imports/import-inspection-actions";
import {
  ImportDiagnostics,
  ImportInspectionStatus,
} from "@/ui/admin/imports/import-inspection-status";
import { AppShell } from "@/ui/shell";
import type { AcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";
import { adminAcademicStructureDetailPath } from "@/lib/coursemap/academic-structure-routes";

export function AcademicStructureImportTargetReview({
  detail,
}: {
  detail: AcademicStructureImportTargetDetail;
}) {
  const active = ["queued", "running"].includes(detail.target.processingStatus);
  const workspaceHref = detail.target.structurePublicId
    ? adminAcademicStructureDetailPath({
        kind: detail.run.structureKind,
        publicId: detail.target.structurePublicId,
        year: detail.run.academicYear,
      })
    : null;
  return (
    <AppShell
      admin
      fullBleed
      currentBreadcrumbLabel={detail.target.code}
      showThemeToggle={false}
    >
      <CourseImportAutoRefresh active={active} />
      <div className="w-full px-4 pb-4 sm:px-6">
        <div className="flex justify-end py-3">
          <ImportInspectionActions
            code={detail.target.code}
            academicYear={detail.run.academicYear}
            requestedModel={detail.run.requestedModel}
            structureKind={detail.run.structureKind}
            active={active}
            workspaceHref={workspaceHref}
          />
        </div>
        <h1 className="sr-only">{detail.target.code} import</h1>
        <Tabs defaultValue="pipeline" className="gap-5">
          <div className="-mx-4 overflow-x-auto border-b border-border px-4 sm:-mx-6 sm:px-6">
            <TabsList aria-label="Import sections" variant="line">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="source">Source and artefacts</TabsTrigger>
              <TabsTrigger value="database">Database rows</TabsTrigger>
              <TabsTrigger value="candidate">Preview</TabsTrigger>
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
                {detail.target.code}
              </span>
              <Badge variant="outline">{detail.run.academicYear}</Badge>
              <Badge variant="outline">Run #{detail.run.runNumber}</Badge>
              <ImportInspectionStatus
                processing={detail.target.processingStatus}
                review={detail.target.reviewStatus}
              />
            </header>
            <AcademicStructureImportPipeline
              extractions={detail.extractions}
              stages={detail.stages}
            />
            <ImportDiagnostics
              items={detail.reviewItems
                .filter((item) => item.field_key !== "$")
                .map((item) => ({
                  id: item.id,
                  field: item.field_key,
                  message: item.message,
                  sourceText: item.source_text,
                  isError: item.severity === "error",
                }))}
            />
          </TabsContent>
          <TabsContent value="source">
            <AcademicStructureImportArtifactViewer
              artifacts={detail.artifacts}
            />
          </TabsContent>
          <TabsContent value="database">
            <AcademicStructureImportDatabaseRows
              artifacts={detail.artifacts}
              emptyLabel="0 rows"
              tables={
                detail.candidateSnapshot
                  ? persistedAcademicStructureDatabaseTables(
                      detail.relationalData,
                    )
                  : []
              }
            />
          </TabsContent>
          <TabsContent value="candidate">
            <AcademicStructureImportPreview detail={detail} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
