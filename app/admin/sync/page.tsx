"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Layers3,
  ListTree,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { courses, degrees, majors } from "@/lib/catalogue";

type Step = "select" | "scope" | "review";

const years = [2026, 2027] as const;

const programmeSources: Record<string, string> = {
  BCOMP: "https://programsandcourses.anu.edu.au/2026/program/BCOMP",
  BACOMPH: "https://programsandcourses.anu.edu.au/2026/program/BACOMPH",
  BIT: "https://programsandcourses.anu.edu.au/2026/program/BIT",
};

const directCourseCodes = [
  "COMP1100",
  "MATH1005",
  "COMP1110",
  "COMP1600",
  "COMP2100",
  "COMP2300",
  "COMP2400",
];

function titleForStep(step: Step) {
  return {
    select: "Choose a programme",
    scope: "Confirm the scope",
    review: "Review the import plan",
  }[step];
}

function StepItem({
  number,
  label,
  current,
  complete,
}: {
  number: number;
  label: string;
  current: boolean;
  complete: boolean;
}) {
  return (
    <li className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1 ring-inset",
          complete
            ? "bg-emerald-500 text-white ring-emerald-500"
            : current
              ? "bg-brand-700 text-white ring-brand-700"
              : "bg-white text-zinc-400 ring-zinc-200",
        )}
      >
        {complete ? <Check size={14} strokeWidth={3} /> : number}
      </span>
      <span
        className={cn(
          "truncate text-xs font-medium",
          current || complete ? "text-zinc-800" : "text-zinc-400",
        )}
      >
        {label}
      </span>
    </li>
  );
}

export default function AdminSyncPage() {
  const { notify } = useCoursemap();
  const [step, setStep] = useState<Step>("select");
  const [year, setYear] = useState<(typeof years)[number]>(2026);
  const [programmeCode, setProgrammeCode] = useState("BCOMP");
  const [includeOptions, setIncludeOptions] = useState(true);
  const [includePrerequisites, setIncludePrerequisites] = useState(true);

  const programme =
    degrees.find((item) => item.code === programmeCode) ?? degrees[0];
  const selectedMajors = includeOptions ? majors : [];
  const directCourses = courses.filter((course) =>
    directCourseCodes.includes(course.code),
  );
  const selectedCourseCodes = useMemo(() => {
    const selected = new Set(directCourseCodes);
    for (const major of selectedMajors) {
      major.courseCodes.forEach((code) => selected.add(code));
    }
    if (includePrerequisites) {
      for (const course of courses) {
        if (selected.has(course.code)) {
          course.prerequisiteCodes.forEach((code) => selected.add(code));
        }
      }
    }
    return selected;
  }, [includePrerequisites, selectedMajors]);
  const sourceUrl = programmeSources[programme.code] ?? programmeSources.BCOMP;

  const goToScope = () => setStep("scope");
  const goToReview = () => setStep("review");

  return (
    <AppShell
      admin
      actions={
        <ButtonLink href="/admin/programmes" size="sm" variant="secondary">
          Browse programmes <ArrowRight size={14} />
        </ButtonLink>
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-brand-700">
              Catalogue imports
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Bring in a programme
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Start with one ANU programme, inspect exactly what it brings with
              it, then send only the reviewed scope to the importer.
            </p>
          </div>
          <Badge tone="neutral">Importer connection in progress</Badge>
        </div>

        <Card className="mt-7 overflow-hidden">
          <ol className="grid gap-3 border-b border-zinc-100 px-5 py-4 sm:grid-cols-3 sm:gap-6 sm:px-6">
            <StepItem
              number={1}
              label="Choose programme"
              current={step === "select"}
              complete={step !== "select"}
            />
            <StepItem
              number={2}
              label="Confirm scope"
              current={step === "scope"}
              complete={step === "review"}
            />
            <StepItem
              number={3}
              label="Review and run"
              current={step === "review"}
              complete={false}
            />
          </ol>

          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                {step === "select" ? (
                  <GraduationCap size={20} />
                ) : step === "scope" ? (
                  <Layers3 size={20} />
                ) : (
                  <FileCheck2 size={20} />
                )}
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                  Step {step === "select" ? 1 : step === "scope" ? 2 : 3} of 3
                </p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-zinc-950">
                  {titleForStep(step)}
                </h2>
              </div>
            </div>

            {step === "select" && (
              <div className="mt-7 grid max-w-3xl gap-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <Field
                  label="Programme"
                  hint="A programme is the top-level degree record from ANU Programs and Courses."
                >
                  <Select
                    aria-label="Programme to import"
                    value={programmeCode}
                    onChange={setProgrammeCode}
                    options={degrees.map((degree) => ({
                      value: degree.code,
                      label: `${degree.code} · ${degree.name}`,
                    }))}
                  />
                </Field>
                <Field label="Catalogue year">
                  <Select
                    aria-label="Catalogue year"
                    value={year}
                    onChange={setYear}
                    options={years.map((item) => ({
                      value: item,
                      label: String(item),
                    }))}
                  />
                </Field>
              </div>
            )}

            {step === "scope" && (
              <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div>
                  <p className="text-sm font-medium text-zinc-800">
                    What should be included?
                  </p>
                  <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
                    <label className="flex cursor-pointer items-start gap-3 border-b border-zinc-100 p-4 hover:bg-zinc-50/70">
                      <input
                        type="checkbox"
                        checked
                        readOnly
                        className="mt-0.5 size-4 rounded border-zinc-300 text-brand-700 focus:ring-brand-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-zinc-900">
                          Programme and compulsory courses
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                          The degree page, its requirement tree and explicitly
                          listed courses.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 border-b border-zinc-100 p-4 hover:bg-zinc-50/70">
                      <input
                        type="checkbox"
                        checked={includeOptions}
                        onChange={(event) =>
                          setIncludeOptions(event.target.checked)
                        }
                        className="mt-0.5 size-4 rounded border-zinc-300 text-brand-700 focus:ring-brand-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-zinc-900">
                          Listed majors, minors and specialisations
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                          Keep the programme&apos;s study options connected to
                          this year.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 p-4 hover:bg-zinc-50/70">
                      <input
                        type="checkbox"
                        checked={includePrerequisites}
                        onChange={(event) =>
                          setIncludePrerequisites(event.target.checked)
                        }
                        className="mt-0.5 size-4 rounded border-zinc-300 text-brand-700 focus:ring-brand-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-zinc-900">
                          Prerequisite course pages
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                          Include the available prerequisite closure so the
                          rules can be explained.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
                <aside className="rounded-xl bg-brand-50/70 p-4 ring-1 ring-brand-100">
                  <p className="text-xs font-semibold text-brand-800">
                    Why this is explicit
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-brand-800/75">
                    Subject, level and elective requirements are rules, not a
                    fixed list of courses. They remain attached to the programme
                    for review instead of inflating the import.
                  </p>
                </aside>
              </div>
            )}

            {step === "review" && (
              <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4">
                    <div>
                      <p className="font-mono text-xs font-semibold text-zinc-900">
                        {programme.code} · {year}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {programme.name}
                      </p>
                    </div>
                    <Badge tone="neutral">Draft scope</Badge>
                  </div>
                  <dl className="divide-y divide-zinc-100 text-sm">
                    {[
                      ["Programme source", "1 official page"],
                      ["Study options", `${selectedMajors.length} structures`],
                      [
                        "Course pages",
                        `${selectedCourseCodes.size} in this local preview`,
                      ],
                      ["Rule-only requirements", "3 preserved for review"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <dt className="text-zinc-500">{label}</dt>
                        <dd className="font-medium text-zinc-800">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <aside className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <CircleAlert size={16} />
                    <p className="text-xs font-semibold">Not live yet</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-amber-900/75">
                    This confirms the new import contract. The server-side
                    programme parser and executor are the next implementation
                    slice, so no source or database write can occur from this
                    screen yet.
                  </p>
                </aside>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                onClick={() => {
                  if (step === "review") setStep("scope");
                  else if (step === "scope") setStep("select");
                  else {
                    setProgrammeCode("BCOMP");
                    setYear(2026);
                    setIncludeOptions(true);
                    setIncludePrerequisites(true);
                  }
                }}
              >
                <RotateCcw size={15} /> {step === "select" ? "Reset" : "Back"}
              </Button>
              {step === "select" ? (
                <Button variant="primary" onClick={goToScope}>
                  Continue <ChevronRight size={16} />
                </Button>
              ) : step === "scope" ? (
                <Button variant="primary" onClick={goToReview}>
                  Review import plan <ChevronRight size={16} />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() =>
                    notify(
                      "The import plan is ready. The executor will be connected in the next slice.",
                    )
                  }
                >
                  <Sparkles size={16} /> Mark plan ready
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader
              title="Preview from the selected programme"
              description="The course set is deliberately small and inspectable before a run."
              icon={
                <span className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-700">
                  <BookOpen size={16} />
                </span>
              }
              action={
                <Badge tone="neutral">
                  {directCourses.length} direct courses
                </Badge>
              }
            />
            <div className="border-t border-zinc-100 px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {directCourses.map((course) => (
                  <Link
                    key={course.code}
                    href={`/admin/courses/${course.code}`}
                    className="group rounded-lg bg-zinc-50 px-2.5 py-2 text-left ring-1 ring-zinc-200 transition hover:bg-white hover:ring-brand-200"
                  >
                    <span className="block font-mono text-[11px] font-semibold text-zinc-800 group-hover:text-brand-700">
                      {course.code}
                    </span>
                    <span className="mt-0.5 block max-w-40 truncate text-[10px] text-zinc-500">
                      {course.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Source and rules"
              description="Every import remains tied to its catalogue-year page."
              icon={
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <ListTree size={16} />
                </span>
              }
            />
            <div className="border-t border-zinc-100 p-5">
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 p-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-brand-200"
              >
                Open the ANU source
                <ExternalLink size={15} className="shrink-0 text-zinc-400" />
              </a>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Content hashes, raw source text and unsupported rules are
                recorded for review, rather than silently treated as verified
                data.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
