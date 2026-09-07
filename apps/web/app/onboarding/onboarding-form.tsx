"use client";

import { Alert, AlertDescription } from "@coursemap/ui/components/alert";
import { Button } from "@coursemap/ui/primitives/button";
import { Card } from "@coursemap/ui/primitives/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@coursemap/ui/primitives/field";
import { Input } from "@coursemap/ui/primitives/input";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  GraduationCap,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { BrandMark } from "@/ui/brand-mark";
import { StructureMultiSelect } from "@/ui/profile/structure-multi-select";
import { SelectField } from "@/ui/common/select-field";
import { cn } from "@/lib/cn";
import { saveProfileAndPlan } from "@/lib/coursemap/actions";
import type {
  OnboardingCatalogue,
  ProgrammeOption,
} from "@/lib/coursemap/onboarding-catalogue";
import { nominalProgrammeDuration } from "@/lib/coursemap/plan-timeline";

type OnboardingFormProps = {
  catalogue: OnboardingCatalogue;
  email: string;
};

const steps = [
  { id: "about", label: "About you", icon: UserRound },
  { id: "degree", label: "Your degree", icon: GraduationCap },
  { id: "details", label: "Study details", icon: CalendarClock },
] as const;

type StepId = (typeof steps)[number]["id"];
type StudyLoad = "Full time" | "Part time";

const STUDENT_NUMBER_PATTERN = /^u\d{7}$/;
const STUDY_LOADS: { value: StudyLoad; label: string }[] = [
  { value: "Full time", label: "Full time" },
  { value: "Part time", label: "Part time" },
];

function yearsOfStudy(degree: ProgrammeOption | undefined) {
  const duration = nominalProgrammeDuration(
    degree
      ? { duration: degree.durationYears, units: degree.units }
      : undefined,
  );
  if (duration === null) return [];
  return Array.from({ length: duration }, (_, index) => index + 1);
}

/**
 * Three-step first-run flow that creates the student's primary plan. The flow
 * is optional: students can skip to the dashboard and set up a plan later from
 * the profile page.
 */
export function OnboardingForm({ catalogue, email }: OnboardingFormProps) {
  const router = useRouter();
  const nameId = useId();
  const studentNumberId = useId();
  const [stepId, setStepId] = useState<StepId>("about");
  const [name, setName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [catalogueYear, setCatalogueYear] = useState(
    catalogue.catalogueYears[0]?.year ?? 0,
  );
  const degrees = useMemo(
    () =>
      catalogue.degrees.filter((item) => item.catalogueYear === catalogueYear),
    [catalogue.degrees, catalogueYear],
  );
  const [degreeCode, setDegreeCode] = useState(degrees[0]?.code ?? "");
  const [majorCode, setMajorCode] = useState("");
  const [minorCodes, setMinorCodes] = useState<string[]>([]);
  const [specialisationCodes, setSpecialisationCodes] = useState<string[]>([]);
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [studyLoad, setStudyLoad] = useState<StudyLoad>("Full time");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const degree = useMemo(
    () => degrees.find((item) => item.code === degreeCode),
    [degreeCode, degrees],
  );
  const majors = useMemo(
    () =>
      catalogue.majors.filter(
        (item) =>
          item.catalogueYear === catalogueYear &&
          (degree?.majorCodes.includes(item.code) ?? false),
      ),
    [catalogue.majors, catalogueYear, degree?.majorCodes],
  );
  const minors = useMemo(
    () =>
      catalogue.minors.filter(
        (item) =>
          item.catalogueYear === catalogueYear &&
          (degree?.minorCodes.includes(item.code) ?? false),
      ),
    [catalogue.minors, catalogueYear, degree?.minorCodes],
  );
  const specialisations = useMemo(
    () =>
      catalogue.specialisations.filter(
        (item) =>
          item.catalogueYear === catalogueYear &&
          (degree?.specialisationCodes.includes(item.code) ?? false),
      ),
    [catalogue.specialisations, catalogueYear, degree?.specialisationCodes],
  );
  const studyYears = yearsOfStudy(degree);
  const planningDurationAvailable = studyYears.length > 0;
  const major = majors.find((item) => item.code === majorCode);

  const stepIndex = steps.findIndex((step) => step.id === stepId);
  const unavailable = !catalogueYear || catalogue.degrees.length === 0;

  /** Changing the degree invalidates every structure chosen beneath it. */
  const resetStructures = () => {
    setMajorCode("");
    setMinorCodes([]);
    setSpecialisationCodes([]);
    setYearOfStudy(1);
  };

  const selectCatalogueYear = (nextYear: number) => {
    const nextDegree = catalogue.degrees.find(
      (item) => item.catalogueYear === nextYear,
    );
    setCatalogueYear(nextYear);
    setDegreeCode(nextDegree?.code ?? "");
    resetStructures();
  };

  const selectDegree = (code: string) => {
    setDegreeCode(code);
    resetStructures();
  };

  const goBack = () => {
    setMessage(null);
    if (stepIndex > 0) setStepId(steps[stepIndex - 1].id);
  };

  const goForward = () => {
    if (stepId === "about" && !name.trim()) {
      setMessage("Add your name so your plan has an owner.");
      return;
    }
    if (
      stepId === "about" &&
      studentNumber.trim() &&
      !STUDENT_NUMBER_PATTERN.test(studentNumber.trim().toLowerCase())
    ) {
      setMessage(
        "Enter a student number in the format u1234567, or leave it blank.",
      );
      return;
    }
    if (stepId === "degree" && !degree) {
      setMessage("Choose a published degree to continue.");
      return;
    }
    setMessage(null);
    if (stepIndex < steps.length - 1) setStepId(steps[stepIndex + 1].id);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (stepId !== "details") {
      goForward();
      return;
    }
    if (!catalogueYear || !degree || !name.trim()) {
      setMessage("Choose a published degree and add your name to continue.");
      return;
    }
    if (!planningDurationAvailable) {
      setMessage(
        "This programme does not have duration or unit information recorded yet, so Coursemap cannot create its timeline.",
      );
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const result = await saveProfileAndPlan({
      name,
      studentId: studentNumber,
      email,
      catalogueYear,
      commencementYear: catalogueYear - (yearOfStudy - 1),
      degreeCode,
      majorCode,
      minorCodes,
      specialisationCodes,
      studyLoad,
      extensionYears: 0,
    });
    setSubmitting(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.replace("/plan");
    router.refresh();
  };

  return (
    <main className="landing-mesh min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-10" />
            <strong className="brand-wordmark text-lg">coursemap</strong>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Skip for now</Link>
          </Button>
        </div>

        <Card className="mt-8 overflow-hidden rounded-3xl p-0">
          <div className="border-b bg-gradient-to-br from-primary/10 via-card to-card px-6 py-7 sm:px-9">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome to Coursemap
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Three quick steps and your degree plan is ready. You can change
              any of this later, or skip and set it up from your profile.
            </p>

            <ol
              className="mt-6 flex flex-wrap items-center gap-2"
              aria-label="Onboarding steps"
            >
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCurrent = step.id === stepId;
                const isComplete = index < stepIndex;
                return (
                  <li
                    key={step.id}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex min-h-9 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                      isCurrent &&
                        "bg-primary text-primary-foreground shadow-sm",
                      isComplete &&
                        "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 ring-inset dark:text-emerald-300",
                      !isCurrent &&
                        !isComplete &&
                        "bg-card text-muted-foreground ring-1 ring-border ring-inset",
                    )}
                  >
                    {isComplete ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Icon className="size-3.5" aria-hidden="true" />
                    )}
                    {step.label}
                    {isComplete ? (
                      <span className="sr-only">(completed)</span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>

          {unavailable ? (
            <div className="p-6 sm:p-9">
              <Alert variant="warning">
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>
                  A degree has not been published for the{" "}
                  {catalogueYear || "current"} catalogue yet. An administrator
                  needs to review and publish an imported programme before
                  students can begin onboarding.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <form className="p-6 sm:p-9" onSubmit={submit}>
              {stepId === "about" ? (
                <fieldset className="space-y-5">
                  <legend className="text-base font-semibold">
                    Tell us who is planning
                  </legend>
                  <Field>
                    <FieldLabel htmlFor={nameId}>Your name</FieldLabel>
                    <Input
                      autoComplete="name"
                      autoFocus
                      id={nameId}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      required
                      value={name}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={studentNumberId}>
                      Student number
                    </FieldLabel>
                    <Input
                      autoComplete="off"
                      id={studentNumberId}
                      onChange={(event) => setStudentNumber(event.target.value)}
                      placeholder="u1234567"
                      value={studentNumber}
                    />
                    <FieldDescription>
                      Optional. Use the format u1234567.
                    </FieldDescription>
                  </Field>
                </fieldset>
              ) : null}

              {stepId === "degree" ? (
                <fieldset className="space-y-5">
                  <legend className="text-base font-semibold">
                    Choose your course of study
                  </legend>
                  <SelectField
                    description="Your requirements follow the catalogue year you started under."
                    items={catalogue.catalogueYears.map((item) => ({
                      value: item.year,
                      label: `${item.year} catalogue`,
                    }))}
                    label="Rules year"
                    onValueChange={selectCatalogueYear}
                    searchable={false}
                    value={catalogueYear}
                  />
                  <SelectField
                    items={degrees.map((item) => ({
                      value: item.code,
                      label: `${item.name} (${item.code})`,
                    }))}
                    label="Degree"
                    onValueChange={selectDegree}
                    value={degreeCode}
                  />
                  <SelectField
                    description="Optional. You can pick this later."
                    disabled={majors.length === 0}
                    items={[
                      { value: "", label: "Choose later" },
                      ...majors.map((item) => ({
                        value: item.code,
                        label: `${item.name} (${item.code})`,
                      })),
                    ]}
                    label="Major"
                    onValueChange={setMajorCode}
                    value={majorCode}
                  />
                  {minors.length > 0 ? (
                    <StructureMultiSelect
                      hint="Optional. Select every minor you want included in this plan."
                      label="Minors"
                      onChange={setMinorCodes}
                      options={minors}
                      value={minorCodes}
                    />
                  ) : null}
                  {specialisations.length > 0 ? (
                    <StructureMultiSelect
                      hint="Optional. Select every specialisation you want included in this plan."
                      label="Specialisations"
                      onChange={setSpecialisationCodes}
                      options={specialisations}
                      value={specialisationCodes}
                    />
                  ) : null}
                </fieldset>
              ) : null}

              {stepId === "details" ? (
                <fieldset className="space-y-5">
                  <legend className="text-base font-semibold">
                    Nearly there
                  </legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField
                      disabled={!planningDurationAvailable}
                      items={studyYears.map((year) => ({
                        value: year,
                        label: `Year ${year}`,
                      }))}
                      label="What year of your degree are you in?"
                      onValueChange={setYearOfStudy}
                      searchable={false}
                      value={yearOfStudy}
                    />
                    <SelectField
                      items={STUDY_LOADS}
                      label="Study load"
                      onValueChange={setStudyLoad}
                      searchable={false}
                      value={studyLoad}
                    />
                  </div>

                  {degree?.durationYears === null || degree?.units === null ? (
                    <Alert variant="warning">
                      <TriangleAlert aria-hidden="true" />
                      <AlertDescription>
                        {!planningDurationAvailable
                          ? "Programme duration and unit total are not recorded. An administrator must publish at least one before a year-by-year plan can be created."
                          : degree.durationYears === null
                            ? `Programme duration is not recorded. Coursemap is using the published ${degree.units} unit total to size the planning timeline.`
                            : "Programme unit total is not recorded. Coursemap can build the timeline from its published duration, but unit progress will remain unavailable."}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border">
                    <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      Your plan
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <SummaryRow label="Planner">
                        {name.trim() || "Not set"}
                      </SummaryRow>
                      <SummaryRow label="Degree">
                        {degree ? `${degree.name} (${degree.code})` : "Not set"}
                      </SummaryRow>
                      <SummaryRow label="Major">
                        {major ? major.name : "Choose later"}
                      </SummaryRow>
                      {minors.length > 0 ? (
                        <SummaryRow label="Minors">
                          {structureNames(minors, minorCodes)}
                        </SummaryRow>
                      ) : null}
                      {specialisations.length > 0 ? (
                        <SummaryRow label="Specialisations">
                          {structureNames(specialisations, specialisationCodes)}
                        </SummaryRow>
                      ) : null}
                      <SummaryRow label="Rules year">
                        {catalogueYear} catalogue
                      </SummaryRow>
                      <SummaryRow label="Load">
                        {planningDurationAvailable
                          ? `Year ${yearOfStudy} · ${studyLoad}`
                          : `Study year not available · ${studyLoad}`}
                      </SummaryRow>
                    </dl>
                  </div>
                </fieldset>
              ) : null}

              {message ? (
                <Alert className="mt-5" role="alert" variant="warning">
                  <TriangleAlert aria-hidden="true" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}

              <div className="mt-7 flex items-center justify-between gap-3 border-t pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(stepIndex === 0 && "invisible")}
                  onClick={goBack}
                  disabled={submitting}
                >
                  <ArrowLeft aria-hidden="true" />
                  Back
                </Button>
                {stepId === "details" ? (
                  <Button
                    type="submit"
                    disabled={submitting || !planningDurationAvailable}
                  >
                    {submitting ? "Saving your plan…" : "Create my plan"}
                  </Button>
                ) : (
                  <Button type="submit">
                    Continue
                    <ArrowRight aria-hidden="true" />
                  </Button>
                )}
              </div>
            </form>
          )}
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Signed in as {email || "your account"}. Your plan is private to you.
        </p>
      </div>
    </main>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function structureNames(
  options: { code: string; name: string }[],
  selected: string[],
) {
  if (selected.length === 0) return "Choose later";
  return options
    .filter((item) => selected.includes(item.code))
    .map((item) => item.name)
    .join(", ");
}
