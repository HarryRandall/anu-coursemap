"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  GraduationCap,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/cn";
import { saveProfileAndPlan } from "@/lib/coursemap/actions";
import type {
  OnboardingCatalogue,
  ProgrammeOption,
} from "@/lib/coursemap/onboarding-catalogue";

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

function yearsOfStudy(degree: ProgrammeOption | undefined) {
  const duration = Math.max(1, Math.ceil(degree?.durationYears ?? 1));
  return Array.from({ length: duration }, (_, index) => index + 1);
}

export function OnboardingForm({ catalogue, email }: OnboardingFormProps) {
  const router = useRouter();
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
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [studyLoad, setStudyLoad] = useState<"Full time" | "Part time">(
    "Full time",
  );
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
          (degree?.majorCodes.length ?? 0) > 0 &&
          degree?.majorCodes.includes(item.code),
      ),
    [catalogue.majors, catalogueYear, degree?.majorCodes],
  );
  const studyYears = yearsOfStudy(degree);
  const major = majors.find((item) => item.code === majorCode);

  const stepIndex = steps.findIndex((step) => step.id === stepId);
  const unavailable = !catalogueYear || catalogue.degrees.length === 0;

  const goBack = () => {
    setMessage(null);
    if (stepIndex > 0) setStepId(steps[stepIndex - 1].id);
  };

  const goForward = () => {
    if (stepId === "about" && !name.trim()) {
      setMessage("Add your name so your plan has an owner.");
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
        <div className="flex items-center gap-2.5 text-zinc-950">
          <BrandMark className="size-10" />
          <strong className="brand-wordmark text-lg">coursemap</strong>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-zinc-200/70">
          <div className="border-b border-zinc-100 bg-gradient-to-br from-brand-50 via-white to-sky-50/60 px-6 py-7 sm:px-9">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Welcome to Coursemap
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
              Three quick steps and your degree plan is ready. You can change
              any of this later.
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
                      isCurrent && "bg-brand-600 text-white shadow-sm",
                      isComplete &&
                        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset",
                      !isCurrent &&
                        !isComplete &&
                        "bg-white text-zinc-500 ring-1 ring-zinc-200 ring-inset",
                    )}
                  >
                    {isComplete ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Icon className="size-3.5" aria-hidden="true" />
                    )}
                    {step.label}
                    {isComplete && <span className="sr-only">(completed)</span>}
                  </li>
                );
              })}
            </ol>
          </div>

          {unavailable ? (
            <div className="p-6 sm:p-9">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                A degree has not been published for the{" "}
                {catalogueYear || "current"} catalogue yet. An administrator
                needs to review and publish an imported programme before
                students can begin onboarding.
              </div>
            </div>
          ) : (
            <form className="p-6 sm:p-9" onSubmit={submit}>
              {stepId === "about" && (
                <fieldset className="space-y-5">
                  <legend className="text-base font-semibold text-zinc-900">
                    Tell us who is planning
                  </legend>
                  <Field label="Your name">
                    <Input
                      autoComplete="name"
                      autoFocus
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      required
                      value={name}
                      className="min-h-11"
                    />
                  </Field>
                  <Field
                    hint="Optional. Shown on your plan exports."
                    label="Student number"
                  >
                    <Input
                      autoComplete="off"
                      onChange={(event) => setStudentNumber(event.target.value)}
                      placeholder="u1234567"
                      value={studentNumber}
                      className="min-h-11"
                    />
                  </Field>
                </fieldset>
              )}

              {stepId === "degree" && (
                <fieldset className="space-y-5">
                  <legend className="text-base font-semibold text-zinc-900">
                    Choose your course of study
                  </legend>
                  <Field
                    hint="Your requirements follow the catalogue year you started under."
                    label="Rules year"
                  >
                    <Select
                      aria-label="Rules year"
                      className="min-h-11"
                      onChange={(value) => {
                        const nextYear = Number(value);
                        const nextDegree = catalogue.degrees.find(
                          (item) => item.catalogueYear === nextYear,
                        );
                        setCatalogueYear(nextYear);
                        setDegreeCode(nextDegree?.code ?? "");
                        setMajorCode("");
                        setYearOfStudy(1);
                      }}
                      options={catalogue.catalogueYears.map((item) => ({
                        value: item.year,
                        label: `${item.year} catalogue`,
                      }))}
                      value={catalogueYear}
                    />
                  </Field>
                  <Field label="Degree">
                    <Select
                      aria-label="Degree"
                      className="min-h-11"
                      onChange={(value) => {
                        setDegreeCode(value);
                        setMajorCode("");
                        setYearOfStudy(1);
                      }}
                      options={degrees.map((item) => ({
                        value: item.code,
                        label: `${item.name} (${item.code})`,
                      }))}
                      value={degreeCode}
                    />
                  </Field>
                  <Field
                    hint="Optional. You can pick this later."
                    label="Major"
                  >
                    <Select
                      aria-label="Major"
                      className="min-h-11"
                      onChange={setMajorCode}
                      options={[
                        { value: "", label: "Choose later" },
                        ...majors.map((item) => ({
                          value: item.code,
                          label: `${item.name} (${item.code})`,
                        })),
                      ]}
                      value={majorCode}
                    />
                  </Field>
                </fieldset>
              )}

              {stepId === "details" && (
                <fieldset className="space-y-5">
                  <legend className="text-base font-semibold text-zinc-900">
                    Nearly there
                  </legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="What year of your degree are you in?">
                      <Select
                        aria-label="Year of study"
                        className="min-h-11"
                        onChange={setYearOfStudy}
                        options={studyYears.map((year) => ({
                          value: year,
                          label: `Year ${year}`,
                        }))}
                        value={yearOfStudy}
                      />
                    </Field>
                    <Field label="Study load">
                      <Select
                        aria-label="Study load"
                        className="min-h-11"
                        onChange={(value) =>
                          setStudyLoad(value as "Full time" | "Part time")
                        }
                        options={[
                          { value: "Full time", label: "Full time" },
                          { value: "Part time", label: "Part time" },
                        ]}
                        value={studyLoad}
                      />
                    </Field>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
                    <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                      Your plan
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Planner</dt>
                        <dd className="font-medium text-zinc-900">
                          {name.trim() || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Degree</dt>
                        <dd className="text-right font-medium text-zinc-900">
                          {degree ? `${degree.name} (${degree.code})` : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Major</dt>
                        <dd className="font-medium text-zinc-900">
                          {major ? major.name : "Choose later"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Rules year</dt>
                        <dd className="font-medium text-zinc-900">
                          {catalogueYear} catalogue
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Load</dt>
                        <dd className="font-medium text-zinc-900">
                          Year {yearOfStudy} · {studyLoad}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </fieldset>
              )}

              {message && (
                <p
                  role="alert"
                  className="mt-5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-950 ring-1 ring-amber-200"
                >
                  {message}
                </p>
              )}

              <div className="mt-7 flex items-center justify-between gap-3 border-t border-zinc-100 pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn("min-h-11", stepIndex === 0 && "invisible")}
                  onClick={goBack}
                  disabled={submitting}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back
                </Button>
                {stepId === "details" ? (
                  <Button
                    type="submit"
                    variant="primary"
                    className="min-h-11 !rounded-xl px-6"
                    disabled={submitting}
                  >
                    {submitting ? "Saving your plan…" : "Create my plan"}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    className="min-h-11 !rounded-xl px-6"
                  >
                    Continue{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-zinc-500">
          Signed in as {email || "your account"}. Your plan is private to you.
        </p>
      </div>
    </main>
  );
}
