"use client";

import Link from "next/link";
import {
  BookOpen,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleHelp,
  ClipboardCheck,
  GitBranch,
  GraduationCap,
  Library,
  LockKeyhole,
  MapPin,
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
import type { CourseDetails } from "@/lib/coursemap/course-types";
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

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function unitValueLabel(course: CourseDetails) {
  if (course.unitValue.kind === "fixed") {
    return `${course.unitValue.units} units`;
  }
  if (course.unitValue.kind === "range") {
    return `${course.unitValue.minimumUnits}-${course.unitValue.maximumUnits} units`;
  }
  if (course.unitValue.kind === "variable") {
    return course.unitValue.options.length
      ? `${course.unitValue.options.map((option) => option.units).join(" or ")} units`
      : "Variable units";
  }
  return "Units not listed";
}

function feeValue(fee: CourseDetails["fees"][number]) {
  if (fee.amount !== null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: fee.currency ?? "AUD",
      maximumFractionDigits: fee.amount % 1 === 0 ? 0 : 2,
    }).format(fee.amount);
  }
  if (fee.studentContributionBand !== null) {
    return `Student contribution band ${fee.studentContributionBand}`;
  }
  return fee.sourceText ?? "See the ANU source";
}

function humanise(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./u, (letter) => letter.toUpperCase());
}

function CourseReferenceText({
  academicYear,
  text,
  availableCourseCodes,
}: {
  academicYear: number;
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
          href={`/courses/${part}?year=${academicYear}`}
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
  academicYear,
  course,
  availableCourseCodes,
}: {
  academicYear: number;
  course: CourseDetails;
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
              href={`/courses/${reference}?year=${academicYear}`}
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
  academicYear,
  condition,
  availableCourseCodes,
}: {
  academicYear: number;
  condition: RequisiteCondition;
  availableCourseCodes: ReadonlySet<string>;
}) {
  if (condition.kind === "course") {
    return (
      <>
        Complete{" "}
        <CourseReferenceText
          academicYear={academicYear}
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
  academicYear,
  expression,
  availableCourseCodes,
}: {
  academicYear: number;
  expression: RequisiteExpression;
  availableCourseCodes: ReadonlySet<string>;
}) {
  if (expression.kind !== "group") {
    return (
      <RequisiteConditionText
        academicYear={academicYear}
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
              academicYear={academicYear}
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
  academicYear,
  progress,
  availableCourseCodes,
}: {
  academicYear: number;
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
            academicYear={academicYear}
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
              academicYear={academicYear}
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
  course: CourseDetails;
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
            <Badge tone="neutral">{course.year}</Badge>
            <Badge tone="neutral">{unitValueLabel(course)}</Badge>
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
          <CardContent className="space-y-4 border-t border-zinc-100 pt-5">
            {course.introduction &&
            course.introduction !== course.description ? (
              <p className="max-w-4xl text-sm leading-relaxed font-medium text-zinc-800">
                {course.introduction}
              </p>
            ) : null}
            <p className="max-w-4xl text-[13px] leading-relaxed whitespace-pre-line text-zinc-600">
              {course.description}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Course essentials" />
          <CardContent className="border-t border-zinc-100 pt-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {[
                ["Academic year", String(course.year)],
                ["Course subject", course.subject],
                ["Subject name", course.subjectName ?? "Not listed"],
                ["Academic career", course.academicCareer ?? "Not listed"],
                ["School", course.school],
                ["College", course.college ?? "Not listed"],
                ["Convener", course.convener],
                ["Delivery", course.delivery],
                ["Unit value", unitValueLabel(course)],
                ["EFTSL", course.eftsl?.toString() ?? "Not listed"],
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

        {course.workloadText ||
        course.inherentRequirements ||
        course.prescribedTexts ? (
          <Card>
            <CardHeader title="Study expectations" />
            <CardContent className="grid gap-5 border-t border-zinc-100 pt-5 md:grid-cols-3">
              {course.workloadText ? (
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                    <GraduationCap size={15} aria-hidden="true" /> Workload
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-zinc-600">
                    {course.workloadText}
                    {course.workloadHours !== null
                      ? ` (${course.workloadHours} hours)`
                      : ""}
                  </p>
                </section>
              ) : null}
              {course.inherentRequirements ? (
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                    <ClipboardCheck size={15} aria-hidden="true" /> Inherent
                    requirements
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-zinc-600">
                    {course.inherentRequirements}
                  </p>
                </section>
              ) : null}
              {course.prescribedTexts ? (
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                    <Library size={15} aria-hidden="true" /> Prescribed texts
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-zinc-600">
                    {course.prescribedTexts}
                  </p>
                </section>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {course.areasOfInterest.length || course.attributes.length ? (
          <Card>
            <CardHeader title="Areas and attributes" />
            <CardContent className="space-y-4 border-t border-zinc-100 pt-5">
              {course.areasOfInterest.length ? (
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900">
                    Areas of interest
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {course.areasOfInterest.map((area) => (
                      <Badge key={area} tone="neutral">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {course.attributes.length ? (
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900">
                    Course attributes
                  </h3>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                    {course.attributes.map((attribute, index) => (
                      <div
                        key={`${attribute.kind}:${attribute.value}:${index}`}
                        className="rounded-lg border border-zinc-200 p-3"
                      >
                        <dt className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
                          {humanise(attribute.kind)}
                        </dt>
                        <dd className="mt-1 text-xs text-zinc-700">
                          {attribute.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {course.learningOutcomes.length ? (
          <Card>
            <CardHeader title="Learning outcomes" />
            <CardContent className="border-t border-zinc-100 pt-5">
              <ol className="space-y-3">
                {course.learningOutcomes.map((outcome) => (
                  <li
                    key={outcome.position}
                    className="flex gap-3 text-[13px] leading-relaxed text-zinc-700"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-zinc-100 text-[11px] font-semibold text-zinc-600">
                      {outcome.position}
                    </span>
                    <span>{outcome.body}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : null}

        {course.assessments.length ? (
          <Card>
            <CardHeader title="Assessment" />
            <CardContent className="border-t border-zinc-100 p-0">
              <div className="divide-y divide-zinc-100">
                {course.assessments.map((assessment) => (
                  <div
                    key={assessment.position}
                    className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-zinc-900">
                        {assessment.title}
                      </p>
                      {assessment.dueText ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          {assessment.dueText}
                        </p>
                      ) : null}
                      {assessment.learningOutcomePositions.length ? (
                        <p className="mt-1 text-[11px] text-zinc-400">
                          Learning outcomes{" "}
                          {assessment.learningOutcomePositions.join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-start gap-2">
                      {assessment.weight !== null ? (
                        <Badge tone="neutral">{assessment.weight}%</Badge>
                      ) : null}
                      {assessment.hurdle ? (
                        <Badge tone="warning">Hurdle</Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {course.fees.length ? (
          <Card>
            <CardHeader title="Fees" />
            <CardContent className="border-t border-zinc-100 p-0">
              <dl className="divide-y divide-zinc-100">
                {course.fees.map((fee, index) => (
                  <div
                    key={`${fee.audience}:${fee.feeType}:${index}`}
                    className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div>
                      <dt className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
                        <Banknote size={15} aria-hidden="true" />
                        {fee.sourceLabel ?? humanise(fee.feeType)}
                      </dt>
                      <dd className="mt-1 text-xs text-zinc-500">
                        {humanise(fee.audience)}
                        {fee.feeYear ? ` · ${fee.feeYear}` : ""}
                        {fee.basis !== "unknown"
                          ? ` · ${humanise(fee.basis)} basis`
                          : ""}
                      </dd>
                    </div>
                    <dd className="text-[13px] font-semibold text-zinc-800">
                      {feeValue(fee)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {course.relatedCourses.length ? (
          <Card>
            <CardHeader title="Related courses" />
            <CardContent className="grid gap-3 border-t border-zinc-100 pt-5 sm:grid-cols-2">
              {course.relatedCourses.map((related) => (
                <Link
                  key={`${related.kind}:${related.code}`}
                  href={`/courses/${related.code}?year=${course.year}`}
                  className="rounded-lg border border-zinc-200 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <p className="font-mono text-[11px] font-semibold text-brand-700">
                    {related.code}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-zinc-900">
                    {related.title ?? "Related ANU course"}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {humanise(related.kind)}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      <TabsContent value="requisites" className="flex flex-col gap-4">
        <Card>
          <CardHeader
            title="Prerequisite chain and unlocks"
            description="Detected course references stay visible even before their course records are imported."
          />
          <CardContent className="border-t border-zinc-100 px-0 pt-5 pb-0">
            <PrereqGraph
              academicYear={course.year}
              code={course.code}
              prerequisiteEdges={course.prerequisiteEdges}
              completedCodes={completedCodes}
              hasPrerequisiteWording={hasPrerequisiteWording}
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
                    academicYear={course.year}
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
                    academicYear={course.year}
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
                  academicYear={course.year}
                  text={course.prerequisiteText}
                  availableCourseCodes={availableCourseCodes}
                />
              </p>
              <CourseReferenceChips
                academicYear={course.year}
                course={course}
                availableCourseCodes={availableCourseCodes}
              />
            </div>
            {course.corequisiteText ? (
              <div className="border-t border-zinc-100 pt-5">
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Corequisites
                </h3>
                <p className="mt-2 whitespace-pre-line">
                  <CourseReferenceText
                    academicYear={course.year}
                    text={course.corequisiteText}
                    availableCourseCodes={availableCourseCodes}
                  />
                </p>
              </div>
            ) : null}
            {course.assumedKnowledgeText ? (
              <div className="border-t border-zinc-100 pt-5">
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Assumed knowledge
                </h3>
                <p className="mt-2 whitespace-pre-line">
                  {course.assumedKnowledgeText}
                </p>
              </div>
            ) : null}
            {course.permissionText ? (
              <div className="border-t border-zinc-100 pt-5">
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Permission
                </h3>
                <p className="mt-2 whitespace-pre-line">
                  {course.permissionText}
                </p>
              </div>
            ) : null}
            {course.incompatibilityText ? (
              <div className="border-t border-zinc-100 pt-5">
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Incompatibilities
                </h3>
                <p className="mt-2 whitespace-pre-line">
                  <CourseReferenceText
                    academicYear={course.year}
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
            action={
              <Badge
                tone={
                  course.offeringStatus === "offered" ? "success" : "neutral"
                }
              >
                {course.offeringStatus === "offered"
                  ? `Offered in ${course.year}`
                  : course.offeringStatus === "not_offered"
                    ? `Not offered in ${course.year}`
                    : "Offering status unknown"}
              </Badge>
            }
          />
          {course.offerings.length ? (
            <CardContent className="border-t border-zinc-100 p-0">
              <div className="divide-y divide-zinc-100">
                {course.offerings.map((offering, index) => {
                  const startsOn = formatDate(offering.startsOn);
                  const endsOn = formatDate(offering.endsOn);
                  const enrolClosesOn = formatDate(offering.enrolClosesOn);
                  const censusOn = formatDate(offering.censusOn);
                  return (
                    <section
                      key={`${offering.periodCode}:${offering.classNumber ?? index}`}
                      className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(15rem,auto)]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[13px] font-semibold text-zinc-900">
                            {offering.periodName}
                          </h3>
                          {offering.classNumber ? (
                            <Badge tone="neutral">
                              Class {offering.classNumber}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                          {offering.deliveryMode ? (
                            <span>{offering.deliveryMode}</span>
                          ) : null}
                          {offering.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} aria-hidden="true" />
                              {offering.location}
                            </span>
                          ) : null}
                          {startsOn || endsOn ? (
                            <span>
                              {startsOn ?? "Start not listed"}
                              {endsOn ? ` to ${endsOn}` : ""}
                            </span>
                          ) : null}
                        </div>
                        {offering.classSummaryUrl ? (
                          <a
                            href={offering.classSummaryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex text-xs font-semibold text-brand-700 hover:text-brand-800"
                          >
                            Open ANU class summary
                          </a>
                        ) : null}
                      </div>
                      {enrolClosesOn || censusOn ? (
                        <dl className="grid grid-cols-2 gap-3 text-xs">
                          {enrolClosesOn ? (
                            <div>
                              <dt className="text-zinc-400">Last enrolment</dt>
                              <dd className="mt-0.5 font-medium text-zinc-700">
                                {enrolClosesOn}
                              </dd>
                            </div>
                          ) : null}
                          {censusOn ? (
                            <div>
                              <dt className="text-zinc-400">Census date</dt>
                              <dd className="mt-0.5 font-medium text-zinc-700">
                                {censusOn}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}
                    </section>
                  );
                })}
              </div>
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
