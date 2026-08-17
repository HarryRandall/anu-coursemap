"use client";

import { GraduationCap, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { BrandMark } from "@/components/brand-mark";
import { saveProfileAndPlan } from "@/lib/coursemap/actions";
import type {
  OnboardingCatalogue,
  ProgrammeOption,
} from "@/lib/coursemap/onboarding-catalogue";

type OnboardingFormProps = {
  catalogue: OnboardingCatalogue;
  email: string;
};

function yearsOfStudy(degree: ProgrammeOption | undefined) {
  const duration = Math.max(1, Math.ceil(degree?.durationYears ?? 1));
  return Array.from({ length: duration }, (_, index) => index + 1);
}

export function OnboardingForm({ catalogue, email }: OnboardingFormProps) {
  const router = useRouter();
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
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
    });
    setSubmitting(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.replace("/plan");
    router.refresh();
  };

  const unavailable = !catalogueYear || degrees.length === 0;

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-2.5 text-zinc-950">
          <BrandMark className="size-10" />
          <strong className="brand-wordmark text-lg">coursemap</strong>
        </div>

        <Card className="mt-7 overflow-hidden">
          <div className="border-b border-zinc-100 bg-gradient-to-br from-brand-50 via-white to-white px-6 py-7 sm:px-8">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Set up your degree plan
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
              Start with your current study details. You can update these later
              as your plan changes.
            </p>
          </div>

          {unavailable ? (
            <div className="p-6 sm:p-8">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                A degree has not been published for the{" "}
                {catalogueYear ?? "current"} catalogue yet. An administrator
                needs to review and publish an imported programme before
                students can begin onboarding.
              </div>
            </div>
          ) : (
            <form className="space-y-6 p-6 sm:p-8" onSubmit={submit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" className="sm:col-span-2">
                  <Input
                    autoComplete="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    required
                    value={name}
                  />
                </Field>
                <Field hint="Optional" label="Student number">
                  <Input
                    autoComplete="off"
                    onChange={(event) => setStudentNumber(event.target.value)}
                    placeholder="u1234567"
                    value={studentNumber}
                  />
                </Field>
                <Field label="Study load">
                  <Select
                    aria-label="Study load"
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

              <div className="border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <GraduationCap size={17} className="text-brand-600" />
                  Your course of study
                </div>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <Field label="Degree">
                    <Select
                      aria-label="Degree"
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
                  <Field hint="Optional" label="Major">
                    <Select
                      aria-label="Major"
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
                  <Field label="What year of your degree are you in?">
                    <Select
                      aria-label="Year of study"
                      onChange={setYearOfStudy}
                      options={studyYears.map((year) => ({
                        value: year,
                        label: `Year ${year}`,
                      }))}
                      value={yearOfStudy}
                    />
                  </Field>
                  <Field label="Rules year">
                    <Select
                      aria-label="Rules year"
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
                </div>
              </div>

              {message && (
                <p
                  role="alert"
                  className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-950 ring-1 ring-amber-200"
                >
                  {message}
                </p>
              )}

              <Button
                className="w-full sm:w-auto"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Saving your plan…" : "Create my plan"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
