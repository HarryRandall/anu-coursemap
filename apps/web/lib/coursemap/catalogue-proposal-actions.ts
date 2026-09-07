"use server";

import { canManageCourseImports } from "@/lib/auth/viewer";
import { loadCourseImportTargetDetail } from "@/lib/coursemap/admin-course-imports";
import { loadAcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";
import { loadAdminCourseYear } from "@/lib/coursemap/admin-course-year";
import { loadAdminStructureReview } from "@/lib/coursemap/admin-catalogue";
import { compareCatalogueProposal } from "@/lib/coursemap/catalogue-proposal-comparison";
import type { AcademicStructureKind } from "@/lib/structure-import/contract";

export async function inspectCatalogueProposal(
  targetId: string,
  structureKind?: AcademicStructureKind,
) {
  if (!(await canManageCourseImports()))
    throw new Error("Import permission is required.");
  if (!/^[0-9a-f-]{36}$/i.test(targetId))
    throw new Error("Choose a valid import.");
  if (structureKind) {
    const detail = await loadAcademicStructureImportTargetDetail({
      targetId,
      structureKind,
    });
    if (!detail?.target.structurePublicId || !detail.target.candidateSnapshotId)
      throw new Error("The import is unavailable.");
    const [current, candidate] = await Promise.all([
      loadAdminStructureReview(
        detail.target.structurePublicId,
        detail.run.academicYear,
      ),
      loadAdminStructureReview(
        detail.target.structurePublicId,
        detail.run.academicYear,
        detail.target.candidateSnapshotId,
      ),
    ]);
    const installed =
      current?.pendingImports.some(
        (proposal) =>
          proposal.targetId === targetId && proposal.isCurrentDraftSource,
      ) ||
      detail.target.currentDraftSnapshotId ===
        detail.target.candidateSnapshotId;
    const first =
      installed ||
      (!detail.target.currentDraftSnapshotId &&
        !detail.target.currentPublishedSnapshotId);
    return {
      first,
      fields: compareCatalogueProposal(
        first ? null : current?.projection,
        installed ? current?.projection : candidate?.projection,
      ),
      issues: detail.reviewItems
        .filter((item) => item.field_key !== "$")
        .map((item) => ({
          id: item.id,
          message: item.message,
          sourceText: item.source_text,
          values: null,
        })),
    };
  }
  const detail = await loadCourseImportTargetDetail({ targetId });
  if (!detail?.target.coursePublicId)
    throw new Error("The import is unavailable.");
  const current = await loadAdminCourseYear(
    detail.target.coursePublicId,
    detail.run.academicYear,
    false,
  );
  const first =
    detail.target.currentDraftSnapshotId ===
      detail.target.candidateSnapshotId || !current?.projection;
  return {
    first,
    fields: compareCatalogueProposal(
      first ? null : current?.projection,
      detail.candidateProjection,
    ),
    issues: detail.reviewItems
      .filter((item) => item.issueCode !== "MANUAL_REVIEW_REQUIRED")
      .map((item) => ({
        id: item.id,
        message: item.summary,
        sourceText: item.sourceExcerpt,
        values: item.newValue,
      })),
  };
}
