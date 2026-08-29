"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleHelp,
  ClipboardCheck,
  GitBranch,
  LockKeyhole,
  MessageSquareText,
  Plus,
} from "lucide-react";
import { PrereqGraph } from "@/components/prereq-graph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";
import {
  evaluateRequisiteExpression,
  type CompletedRequisiteCourse,
  type RequisiteCondition,
  type RequisiteExpression,
  type RequisiteProgress,
  parseRequisiteSummary,
} from "@/lib/coursemap/requisite-summary";

export const courseDetailTabs = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "requisites", label: "Requisites", icon: GitBranch },
  { id: "offerings", label: "Offerings", icon: CalendarClock },
  { id: "student-review", label: "Student review", icon: MessageSquareText },
] as const;

export type CourseTab = (typeof courseDetailTabs)[number]["id"];

export function courseTabFromSearch(value: string | null): CourseTab {
  return courseDetailTabs.some((tab) => tab.id === value)
    ? (value as CourseTab)
    : "overview";
}

/**
 * The tab strip is shared so the admin preview shows exactly the tabs a
 * student sees, in the same order and with the same labels.
 */
export function CourseDetailTabsList() {
  return (
    <TabsList className="h-11 w-full justify-start gap-1 rounded-none bg-transparent p-0">
      {courseDetailTabs.map(({ id, label, icon: Icon }) => (
        <TabsTrigger
          key={id}
          value={id}
          className="relative h-11 flex-none gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-2.5 text-[13px] text-zinc-500 shadow-none hover:text-zinc-900 data-[state=active]:border-brand-500 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 data-[state=active]:shadow-none"
        >
          <Icon size={15} aria-hidden="true" className="hidden sm:block" />
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Not listed";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function CourseReferenceText({
  text,
  availableCourseCodes,
}: {
  text: string;
  availableCourseCodes: ReadonlySet<string>;
}) {
  return text.split(/([A-Z]{4}\d{4}[A-Z]?)/gu).map((part, index) => {
    if (!/^[A-Z]{4}\d{4}[A-Z]?$/u.test(part)) {
      return <span key={index}>{part}</span>;
    }
    if (availableCourseCodes.has(part)) {
      return (
        <Link
          key={index}
          href={`/courses/${part}`}
          prefetch={false}
          className="rounded font-mono font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
        >
          {part}
        </Link>
      );
    }
    return (
      <span
        key={index}
        title={`${part} is referenced by ANU but has not been imported yet`}
        className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1 font-mono font-semibold text-zinc-600"
      >
        <LockKeyhole size={10} aria-hidden="true" />
        {part}
        <span className="sr-only">Not imported yet</span>
      </span>
    );
  });
}

function CourseReferenceChips({
  course,
  availableCourseCodes,
}: {
  course: CatalogueCourse;
  availableCourseCodes: ReadonlySet<string>;
}) {
  if (course.prerequisiteCodes.length === 0) return null;
  return (
    <div className="mt-5 border-t border-zinc-100 pt-4">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Detected course references
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {course.prerequisiteCodes.map((reference) =>
          availableCourseCodes.has(reference) ? (
            <Link
              key={reference}
              href={`/courses/${reference}`}
              prefetch={false}
              className="rounded-md bg-brand-50 px-2 py-1 font-mono text-xs font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100"
            >
              {reference}
            </Link>
          ) : (
            <span
              key={reference}
              title={`${reference} has not been imported yet`}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200"
            >
              <LockKeyhole size={11} aria-hidden="true" />
              {reference}
              <span className="sr-only">Not imported yet</span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function RequisiteConditionText({
  condition,
  availableCourseCodes,
}: {
  condition: RequisiteCondition;
  availableCourseCodes: ReadonlySet<string>;
}) {
  if (condition.kind === "course") {
    return (
      <>
        Complete{" "}
        <CourseReferenceText
          text={condition.code}
          availableCourseCodes={availableCourseCodes}
        />
      </>
    );
  }
  if (condition.kind === "level_units") {
    return (
      <>
        Complete at least {condition.units} units of {condition.level}-level
        {condition.subject ? ` ${condition.subject}` : ""} courses
      </>
    );
  }
  if (condition.kind === "units_total") {
    return <>Complete at least {condition.units} units of study</>;
  }
  if (condition.kind === "programme_enrolment") {
    return (
      <>
        Be enrolled in {condition.name}{" "}
        <span className="font-mono font-semibold">({condition.code})</span>
      </>
    );
  }
  return (
    <>
      Complete at least {condition.units} units of {condition.subject}-coded
      courses
    </>
  );
}

function RequisiteExpressionSummary({
  expression,
  availableCourseCodes,
}: {
  expression: RequisiteExpression;
  availableCourseCodes: ReadonlySet<string>;
}) {
  if (expression.kind !== "group") {
    return (
      <RequisiteConditionText
        condition={expression}
        availableCourseCodes={availableCourseCodes}
      />
    );
  }

  const title =
    expression.operator === "all_of"
      ? "Complete all of the following"
      : "Complete one of the following";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <p className="text-xs font-semibold text-zinc-800">{title}</p>
      <ul className="mt-2 space-y-2 border-l border-zinc-200 pl-3 text-xs text-zinc-700">
        {expression.conditions.map((condition, index) => (
          <li key={index}>
            <RequisiteExpressionSummary
              expression={condition}
              availableCourseCodes={availableCourseCodes}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequisiteProgressSummary({
  progress,
  availableCourseCodes,
}: {
  progress: RequisiteProgress;
  availableCourseCodes: ReadonlySet<string>;
}) {
  if (progress.kind === "course") {
    return (
      <div className="flex items-start gap-2">
        {progress.satisfied ? (
          <CheckCircle2
            aria-label="Completed"
            className="mt-0.5 shrink-0 text-emerald-600"
            size={16}
          />
        ) : (
          <Circle
            aria-label="Not completed"
            className="mt-0.5 shrink-0 text-amber-700"
            size={16}
          />
        )}
        <span>
          Complete{" "}
          <CourseReferenceText
            text={progress.code}
            availableCourseCodes={availableCourseCodes}
          />
        </span>
      </div>
    );
  }

  if (
    progress.kind === "subject_units" ||
    progress.kind === "level_units" ||
    progress.kind === "units_total"
  ) {
    const description =
      progress.kind === "subject_units"
        ? `${progress.subject}-coded units completed`
        : progress.kind === "level_units"
          ? `${progress.level}-level${progress.subject ? ` ${progress.subject}` : ""} units completed`
          : "units of study completed";
    return (
      <div className="flex items-start gap-2">
        {progress.satisfied ? (
          <CheckCircle2
            aria-label="Completed"
            className="mt-0.5 shrink-0 text-emerald-600"
            size={16}
          />
        ) : (
          <Circle
            aria-label="Not completed"
            className="mt-0.5 shrink-0 text-amber-700"
            size={16}
          />
        )}
        <span>
          {progress.completedUnits} of {progress.requiredUnits} {description}
        </span>
      </div>
    );
  }

  if (progress.kind === "programme_enrolment") {
    return (
      <div className="flex items-start gap-2">
        {progress.satisfied ? (
          <CheckCircle2
            aria-label="Enrolled"
            className="mt-0.5 shrink-0 text-emerald-600"
            size={16}
          />
        ) : (
          <Circle
            aria-label="Not enrolled"
            className="mt-0.5 shrink-0 text-amber-700"
            size={16}
          />
        )}
        <span>
          Be enrolled in {progress.name}{" "}
          <span className="font-mono font-semibold">({progress.code})</span>
        </span>
      </div>
    );
  }

  const title =
    progress.operator === "all_of"
      ? "Complete all of the following"
      : "Complete one of the following";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-800">{title}</p>
        <Badge tone={progress.satisfied ? "success" : "warning"}>
          {progress.satisfied ? "Met" : "Not met"}
        </Badge>
      </div>
      <ul className="mt-3 space-y-2 border-l border-zinc-200 pl-3 text-xs text-zinc-700">
        {progress.conditions.map((condition, index) => (
          <li key={index}>
            <RequisiteProgressSummary
              progress={condition}
              availableCourseCodes={availableCourseCodes}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

const EMPTY_CODES: ReadonlySet<string> = new Set();

/**
 * The student-facing body of a course page. The student route and the admin
 * import review both render this component, so a draft preview cannot drift
 * away from what a student will actually see.
 */
export function CourseDetailView({
  completedCodes = EMPTY_CODES,
  course,
  fullWidth = false,
  onAddToPlan,
  plannedCodes = EMPTY_CODES,
  requisiteCompletion,
}: {
  completedCodes?: ReadonlySet<string>;
  course: CatalogueCourse;
  /** Fills the available width instead of centring, for embedded previews. */
  fullWidth?: boolean;
  onAddToPlan?: () => void;
  plannedCodes?: ReadonlySet<string>;
  requisiteCompletion: {
    completedCourses: CompletedRequisiteCourse[];
    enrolledProgrammeCodes?: string[];
    isAuthenticated: boolean;
  };
}) {
  const availableCourseCodes = new Set(course.availableCourseCodes);
  const structuredRule = course.prerequisiteRule?.expression ?? null;
  const requisiteSummary =
    structuredRule ?? parseRequisiteSummary(course.prerequisiteText);
  const requisiteProgress = structuredRule
    ? evaluateRequisiteExpression(
        structuredRule,
        requisiteCompletion.completedCourses,
        requisiteCompletion.enrolledProgrammeCodes ?? [],
      )
    : null;
  const hasPrerequisiteWording =
    course.prerequisiteText.trim().length > 0 &&
    !/^No prerequisites listed\.?$/iu.test(course.prerequisiteText.trim());

  const ruleStatus = !hasPrerequisiteWording
    ? "No prerequisite course codes were detected in the imported source."
    : requisiteProgress && requisiteCompletion.isAuthenticated
      ? requisiteProgress.satisfied
        ? "Your recorded study and programme meet this imported prerequisite matrix. Confirm final enrolment eligibility with ANU."
        : "Your recorded study and programme do not yet meet this imported prerequisite matrix. Planned and enrolled courses are not counted."
      : structuredRule
        ? "Sign in and record your completed courses and programme to see whether you meet this prerequisite matrix."
        : requisiteSummary
          ? "Coursemap identified the unit and course conditions shown below. Confirm eligibility with the official ANU source."
          : course.reviewState === "verified"
            ? "The source record is verified. Read the ANU wording below for the exact requirement."
            : "The source wording is shown exactly as imported. Its AND, OR, mark and permission logic is not verified yet.";

  return (
    <div className={fullWidth ? "w-full" : "mx-auto max-w-6xl"}>
      <header className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            {course.code} · {course.subject} · Level {course.level / 1000}
          </p>
          <h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {course.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{course.units} units</Badge>
            <Badge tone="neutral">
              {course.sessions.length
                ? course.sessions.join(" · ")
                : "Offering not listed"}
            </Badge>
            <Badge tone="neutral">{course.delivery}</Badge>
          </div>
        </div>
        <Button
          className="w-full shrink-0 sm:w-auto"
          disabled={!onAddToPlan}
          onClick={onAddToPlan}
          title={
            onAddToPlan
              ? undefined
              : "Planning is only available on the live student page."
          }
          variant="primary"
        >
          <Plus size={16} aria-hidden="true" /> Add to plan
        </Button>
      </header>

      <TabsContent value="overview" className="flex flex-col gap-4">
        <Card>
          <CardHeader title="About this course" />
          <CardContent className="border-t border-zinc-100 pt-5">
            <p className="max-w-4xl text-[13px] leading-relaxed text-zinc-600">
              {course.description}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Course essentials" />
          <CardContent className="border-t border-zinc-100 pt-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {[
                ["Course subject", course.subject],
                ["School", course.school],
                ["Convener", course.convener],
                ["Delivery", course.delivery],
                ["Last source update", formatUpdatedAt(course.sourceUpdatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-[12px] leading-relaxed font-medium break-words text-zinc-700">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
          <CardFooter>
            <a
              href={course.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] font-semibold text-brand-700 hover:text-brand-800"
            >
              View the ANU course source
            </a>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="requisites" className="flex flex-col gap-4">
        <Card>
          <CardHeader
            title="Prerequisite chain and unlocks"
            description="Detected course references stay visible even before their course records are imported."
          />
          <CardContent className="border-t border-zinc-100 px-0 pt-5 pb-0">
            <PrereqGraph
              code={course.code}
              prerequisiteEdges={course.prerequisiteEdges}
              completedCodes={completedCodes}
              plannedCodes={plannedCodes}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Requisites and compatibility"
            description={
              <>
                An exact Coursemap summary is shown when the wording can be read
                safely. The official wording remains alongside it.
              </>
            }
            action={
              <Badge
                tone={
                  structuredRule ||
                  requisiteSummary ||
                  course.reviewState === "verified"
                    ? "success"
                    : "warning"
                }
              >
                {structuredRule
                  ? requisiteCompletion.isAuthenticated
                    ? "Eligibility checked"
                    : "Structured rule"
                  : requisiteSummary
                    ? "Structured summary"
                    : course.reviewState === "verified"
                      ? "Source reviewed"
                      : "Rule logic unknown"}
              </Badge>
            }
            className="flex-col gap-3 sm:flex-row"
          />
          <CardContent className="space-y-5 border-t border-zinc-100 pt-5 text-[13px] leading-relaxed text-zinc-700">
            <Alert tone="warning" className="rounded-xl p-4">
              <CircleHelp aria-hidden="true" />
              <AlertDescription className="text-amber-900">
                {ruleStatus}
              </AlertDescription>
            </Alert>
            {requisiteProgress && requisiteCompletion.isAuthenticated ? (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Your completed-course progress
                </h3>
                <div className="mt-2">
                  <RequisiteProgressSummary
                    progress={requisiteProgress}
                    availableCourseCodes={availableCourseCodes}
                  />
                </div>
              </div>
            ) : null}
            {requisiteSummary ? (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  {structuredRule
                    ? "Imported requirement matrix"
                    : "Coursemap summary"}
                </h3>
                <div className="mt-2">
                  <RequisiteExpressionSummary
                    expression={requisiteSummary}
                    availableCourseCodes={availableCourseCodes}
                  />
                </div>
              </div>
            ) : null}
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Prerequisites
              </h3>
              <p className="mt-2 whitespace-pre-line">
                <CourseReferenceText
                  text={course.prerequisiteText}
                  availableCourseCodes={availableCourseCodes}
                />
              </p>
              <CourseReferenceChips
                course={course}
                availableCourseCodes={availableCourseCodes}
              />
            </div>
            {course.incompatibilityText ? (
              <div className="border-t border-zinc-100 pt-5">
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Incompatibilities
                </h3>
                <p className="mt-2 whitespace-pre-line">
                  <CourseReferenceText
                    text={course.incompatibilityText}
                    availableCourseCodes={availableCourseCodes}
                  />
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="offerings" className="flex flex-col gap-4">
        <Card>
          <CardHeader
            title="Available study periods"
            description="Imported from ANU class information. Confirm enrolment dates in the official source."
          />
          {course.sessions.length ? (
            <CardContent className="flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
              {course.sessions.map((session) => (
                <Badge key={session} tone="neutral">
                  {session}
                </Badge>
              ))}
            </CardContent>
          ) : (
            <CardContent className="border-t border-zinc-100 p-0">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarClock aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    No course offering is listed in the imported catalogue yet.
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            </CardContent>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="student-review" className="flex flex-col gap-4">
        <Card>
          <CardHeader
            title="Student experience and self-review"
            description="Shared placeholder while course-specific SELT and student feedback are imported."
          />
          <CardContent className="space-y-5 border-t border-zinc-100 pt-5">
            <Alert tone="neutral" className="rounded-xl p-4">
              <MessageSquareText aria-hidden="true" />
              <AlertTitle className="text-[13px]">
                No course-specific ratings are shown yet
              </AlertTitle>
              <AlertDescription className="text-[13px] text-zinc-600">
                This is deliberately not a made-up score. Once authorised source
                data is imported, it will appear here with its year and
                provenance.
              </AlertDescription>
            </Alert>
            <div>
              <h3 className="text-[13px] font-semibold text-zinc-900">
                A useful self-review after taking the course
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  [
                    "Workload",
                    "Were the weekly study hours manageable for the unit value?",
                  ],
                  [
                    "Assessment",
                    "Did the assessment types build the skills the course promised?",
                  ],
                  [
                    "Teaching",
                    "Were lectures, tutorials and feedback helpful when you needed them?",
                  ],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <ClipboardCheck
                      size={17}
                      className="text-brand-600"
                      aria-hidden="true"
                    />
                    <h4 className="mt-2 text-[13px] font-semibold text-zinc-800">
                      {title}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
}
