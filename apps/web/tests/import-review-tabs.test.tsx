import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CourseImportTargetReview } from "@/ui/admin/imports/course-import-target-review";
import { AcademicStructureImportTargetReview } from "@/ui/admin/imports/academic-structure-import-target-review";
import type { CourseImportTargetDetail } from "@/lib/coursemap/admin-course-imports";
import type { AcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";
vi.mock("@/ui/shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/imports",
  useSearchParams: () => new URLSearchParams(),
}));
const target = {
  id: "target-1",
  processingStatus: "succeeded",
  reviewStatus: "needs_review",
  changeKind: "new",
  attemptCount: 1,
  baselineDraftSnapshotId: null,
  baselinePublishedSnapshotId: null,
  candidateSnapshotId: null,
  currentDraftSnapshotId: null,
  currentPublishedSnapshotId: null,
  errorCode: null,
  errorSummary: null,
  createdAt: "2026-09-01T00:00:00Z",
  finishedAt: "2026-09-01T00:00:01Z",
};
const common = {
  run: {
    id: "run-1",
    runNumber: 1,
    academicYear: 2026,
    status: "succeeded",
    requestedModel: "test/model",
  },
  candidateSnapshot: null,
  previousSnapshot: null,
  sourcePage: null,
  stages: [],
  artifacts: [],
  extractions: [],
  reviewItems: [],
};
const course: CourseImportTargetDetail = {
  ...common,
  target: { ...target, courseCode: "COMP1100", coursePublicId: "course-1" },
  candidateProjection: null,
  relationalData: {},
};
const structure: AcademicStructureImportTargetDetail = {
  ...common,
  run: { ...common.run, structureKind: "programme" },
  target: {
    ...target,
    code: "BSOFT",
    title: "Software Engineering",
    structureId: null,
    structurePublicId: "structure-1",
    structureYearId: null,
  },
  relationalData: {
    academic_structures: [],
    academic_structure_years: [],
    academic_structure_snapshots: [],
    academic_structure_snapshot_sections: [],
    academic_structure_summary_fields: [],
    academic_structure_learning_outcomes: [],
    academic_structure_fees: [],
    academic_structure_snapshot_relationships: [],
    academic_structure_requirement_groups: [],
    academic_structure_requirement_conditions: [],
    academic_structure_requirement_options: [],
    academic_structure_unmodelled_requirements: [],
    academic_structure_snapshot_evidence: [],
    academic_structure_review_items: [],
  },
};
for (const kind of ["course", "structure"] as const) {
  test(`${kind} import starts on pipeline and keeps review read-only`, async () => {
    const user = userEvent.setup();
    render(
      kind === "course" ? (
        <CourseImportTargetReview detail={course} previewCourse={null} />
      ) : (
        <AcademicStructureImportTargetReview detail={structure} />
      ),
    );
    expect(screen.getByRole("tab", { name: "Pipeline" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: /Accept as draft|Publish draft/ }),
    ).not.toBeInTheDocument();
    for (const tab of ["Source and artefacts", "Database rows"]) {
      await user.click(screen.getByRole("tab", { name: tab }));
      expect(screen.getByRole("tabpanel", { name: tab })).toBeVisible();
    }
  });
}
