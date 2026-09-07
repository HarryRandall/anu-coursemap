"use client";
import { useMemo } from "react";
import Link from "next/link";
import { BookOpenCheck, CircleAlert, ListChecks } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@coursemap/ui/components/alert";
import { Button } from "@coursemap/ui/primitives/button";
import { Card } from "@coursemap/ui/primitives/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coursemap/ui/primitives/empty";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/ui/shell";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { requirementTreeProgress } from "@/lib/coursemap/requirement-progress";
import type { Attempt } from "@/lib/coursemap/types";
import { degreeUnitProgress, planningCourseForAttempt } from "@/lib/planner";
import { OverallProgressCard } from "@/ui/requirements/overall-progress-card";
import { PlanCoursesCard } from "@/ui/requirements/plan-courses-card";
import {
  hasRequirementContent,
  structureKindOrder,
} from "@/ui/requirements/requirement-presentation";
import { RuleSummaryCard } from "@/ui/requirements/rule-summary-card";
import { StructureRequirementsCard } from "@/ui/requirements/structure-requirements-card";

export function Requirements({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const degree = catalogue.degrees.find(
    (item) => item.code === state.profile.degreeCode,
  );
  const unitTarget = degree?.units ?? null;
  const progress = degreeUnitProgress(
    state.attempts,
    unitTarget ?? 0,
    catalogue,
  );

  const courses = useMemo(
    () =>
      state.attempts
        .map((attempt) => ({
          attempt,
          course: planningCourseForAttempt(attempt, catalogue),
        }))
        .filter(
          (
            entry,
          ): entry is {
            attempt: Attempt;
            course: NonNullable<ReturnType<typeof planningCourseForAttempt>>;
          } => Boolean(entry.course),
        ),
    [catalogue, state.attempts],
  );
  const attemptStatusByCode = useMemo(
    () =>
      new Map(
        state.attempts.map((attempt) => [attempt.courseCode, attempt.status]),
      ),
    [state.attempts],
  );
  const selectedStructureCodes = useMemo(
    () =>
      new Set(
        [
          state.profile.degreeCode,
          state.profile.majorCode,
          ...state.profile.minorCodes,
          ...state.profile.specialisationCodes,
        ].filter(Boolean),
      ),
    [
      state.profile.degreeCode,
      state.profile.majorCode,
      state.profile.minorCodes,
      state.profile.specialisationCodes,
    ],
  );
  const selectedRequirements = useMemo(
    () =>
      catalogue.structureRequirements
        .filter((requirement) =>
          selectedStructureCodes.has(requirement.structureCode),
        )
        .toSorted(
          (left, right) =>
            structureKindOrder[left.structureKind] -
              structureKindOrder[right.structureKind] ||
            left.structureCode.localeCompare(right.structureCode),
        ),
    [catalogue.structureRequirements, selectedStructureCodes],
  );
  const progressByStructure = useMemo(
    () =>
      new Map(
        selectedRequirements.map((requirements) => [
          requirements.snapshotId,
          requirementTreeProgress({
            root: requirements.root,
            attempts: state.attempts,
            catalogue,
          }),
        ]),
      ),
    [catalogue, selectedRequirements, state.attempts],
  );

  const programmeRequirements = selectedRequirements.find(
    (requirement) => requirement.structureKind === "programme",
  );
  const structuresMissingRequirements = catalogue.structures.filter(
    (structure) =>
      structure.kind !== "programme" &&
      selectedStructureCodes.has(structure.code) &&
      !selectedRequirements.some(
        (requirements) =>
          requirements.structureCode === structure.code &&
          hasRequirementContent(requirements),
      ),
  );
  const hasPublishedProgrammeRequirements = programmeRequirements
    ? hasRequirementContent(programmeRequirements)
    : catalogue.structureRequirements.length === 0 &&
      catalogue.programmeRequirementsImported;
  const structuresWithContent = selectedRequirements.filter(
    hasRequirementContent,
  );

  if (!degree) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="sr-only">Requirements</h1>
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListChecks aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Choose a published degree</EmptyTitle>
                <EmptyDescription>
                  Select a published degree in onboarding to see its rules.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/onboarding">Start onboarding</Link>
                </Button>
              </EmptyContent>
            </Empty>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="sr-only">Requirements</h1>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-5">
            {!hasPublishedProgrammeRequirements ? (
              <Alert variant="warning">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>
                  Published programme requirements are not available yet
                </AlertTitle>
                <AlertDescription>
                  Coursemap will not substitute sample core, elective or major
                  buckets for this programme&apos;s official rules.
                </AlertDescription>
              </Alert>
            ) : null}

            {structuresMissingRequirements.map((structure) => (
              <Alert
                key={`${structure.kind}-${structure.code}`}
                variant="warning"
              >
                <CircleAlert aria-hidden="true" />
                <AlertTitle>
                  Published {structure.kind} requirements are not available yet
                </AlertTitle>
                <AlertDescription>
                  Coursemap will show {structure.name}&apos;s reviewed source
                  rules once its published snapshot includes them.
                </AlertDescription>
              </Alert>
            ))}

            {structuresWithContent.map((requirements) => (
              <StructureRequirementsCard
                context={{
                  catalogue,
                  attemptStatusByCode,
                  selectedStructureCodes,
                  progress:
                    progressByStructure.get(requirements.snapshotId) ??
                    new Map(),
                }}
                key={`${requirements.structureKind}-${requirements.snapshotId}`}
                requirements={requirements}
              />
            ))}

            <p className="flex items-center gap-2 text-xs text-muted-foreground/80">
              <BookOpenCheck aria-hidden="true" size={14} />
              Progress here is indicative. Always confirm enrolment and
              graduation requirements with ANU.
            </p>
          </div>

          <aside
            aria-label="Progress summary"
            className="space-y-4 lg:sticky lg:top-20"
          >
            <OverallProgressCard progress={progress} unitTarget={unitTarget} />
            <RuleSummaryCard
              progressByStructure={progressByStructure}
              structures={structuresWithContent}
            />
            <PlanCoursesCard courses={courses} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
