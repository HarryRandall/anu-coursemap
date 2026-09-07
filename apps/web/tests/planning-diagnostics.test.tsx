import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AcademicStructureManualSnapshotProjection } from "@/lib/structure-import/manual-snapshot";
import type {
  PlanCatalogue,
  PlanRequirementCondition,
  PlanRequirementGroup,
  PlanStructureRequirements,
} from "@/lib/coursemap/plan-catalogue";
import { requirementTreeProgress } from "@/lib/coursemap/requirement-progress";
import { StructurePlanningDiagnostics } from "@/ui/admin/academic-structures/structure-planning-diagnostics";
import { RequirementGroupView } from "@/ui/requirements/requirement-tree";
import { StructureProgress } from "@/ui/requirements/structure-progress";
import { degreeUnitProgress } from "@/lib/planner";

const condition: PlanRequirementCondition = {
  type: "condition",
  id: 1,
  conditionKind: "tag",
  freeText: null,
  maximumLevel: null,
  maximumUnits: null,
  minimumCourses: null,
  minimumLevel: null,
  minimumUnits: 12,
  options: [],
  position: 1,
  projectionKey: "tag",
  sourceLocator: "#requirements",
  sourceText: "Complete 12 units of Transdisciplinary Problem-Solving courses.",
  structureKind: null,
  subjectCode: null,
  tag: "Transdisciplinary Problem-Solving",
};
const root: PlanRequirementGroup = {
  type: "group",
  id: 1,
  children: [condition],
  description: null,
  groupKey: "root",
  maximumUnits: null,
  minimumCount: null,
  minimumUnits: null,
  operator: "all_of",
  position: 1,
  sourceLocator: "#requirements",
  sourceText: "",
  title: "Degree requirements",
};
const requirements: PlanStructureRequirements = {
  root,
  snapshotId: 1,
  structureCode: "BCOMP",
  structureKind: "programme",
  structureName: "Computing",
  unmodelled: [
    {
      position: 1,
      sourceLocator: null,
      sourceText: "18 units of elective courses offered by ANU.",
    },
  ],
};
const catalogue: PlanCatalogue = {
  academicYear: 2026,
  courses: [],
  terms: [],
  degrees: [],
  majors: [],
  structures: [],
  programmeRequirementsImported: true,
  structureRequirements: [requirements],
};
const projection: AcademicStructureManualSnapshotProjection = {
  schemaVersion: "academic-structure-snapshot.v2",
  structureKind: "programme",
  structureCode: "BCOMP",
  academicYear: 2026,
  snapshot: {
    title: "Computing",
    acronym: null,
    shortName: null,
    introduction: null,
    description: null,
    totalUnits: 144,
    durationYears: null,
    academicCareer: null,
    college: null,
    deliveryMode: null,
    selectionRank: null,
    atar: null,
    canCombine: null,
    canCombineVertical: null,
    studyAs: null,
    contactText: null,
    overallConfidence: null,
  },
  summaryFields: [],
  sections: [],
  learningOutcomes: [],
  fees: [],
  relationships: [],
  requirementRootKey: "root",
  requirementGroups: [],
  requirementConditions: [
    {
      ...condition,
      key: "tag",
      groupKey: "root",
      conditionKind: "tag",
      structureKind: null,
    },
  ],
  requirementOptions: [],
  unmodelledRequirements: requirements.unmodelled,
  evidence: [],
};

test("student requirements retain requirements without assigning manual review or claiming completion", () => {
  const progress = requirementTreeProgress({ root, attempts: [], catalogue });
  expect(progress.get("condition-1")?.state).toBe("unmeasured");
  render(
    <RequirementGroupView
      group={root}
      context={{
        catalogue,
        progress,
        attemptStatusByCode: new Map(),
        selectedStructureCodes: new Set(),
      }}
    />,
  );
  expect(
    screen.getByText("Transdisciplinary Problem-Solving · At least 12 units"),
  ).toBeVisible();
  expect(
    screen.queryByText(/manual check|cannot check|not measured|satisfied/i),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText(requirements.unmodelled[0].sourceText),
  ).not.toBeInTheDocument();
});

test("admin review retains missing duration and unsupported and unmodelled source rules", () => {
  render(<StructurePlanningDiagnostics projection={projection} />);
  expect(screen.getByText("Planning data review")).toBeVisible();
  expect(screen.getByText(/duration is not recorded/)).toBeVisible();
  expect(screen.getByText(condition.sourceText)).toBeVisible();
  expect(screen.getByText(requirements.unmodelled[0].sourceText)).toBeVisible();
});

test("missing unit targets retain earned units without exposing catalogue repair instructions", () => {
  render(
    <StructureProgress
      name="Computing"
      code="BCOMP"
      year={2026}
      target={null}
      progress={degreeUnitProgress([], 0, catalogue)}
    />,
  );
  expect(screen.getByText("Completed")).toBeVisible();
  expect(
    screen.queryByText(
      /administrator|published programme|cannot be calculated/i,
    ),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

test("complete measurable catalogue data does not create an admin warning", () => {
  render(
    <StructurePlanningDiagnostics
      projection={{
        ...projection,
        snapshot: { ...projection.snapshot, durationYears: 3 },
        unmodelledRequirements: [],
        requirementConditions: [
          {
            ...projection.requirementConditions[0],
            conditionKind: "level",
            minimumLevel: 3000,
          },
        ],
      }}
    />,
  );
  expect(screen.queryByText("Planning data review")).not.toBeInTheDocument();
});

test("workspace diagnostics start collapsed while retaining the review details", () => {
  render(<StructurePlanningDiagnostics projection={projection} compact />);
  const summary = screen.getByText(/^Planning data review \(/);
  expect(summary).toBeVisible();
  expect(summary.closest("details")).not.toHaveAttribute("open");
  expect(
    screen.getByText(/Programme duration is not recorded/),
  ).not.toBeVisible();
});
