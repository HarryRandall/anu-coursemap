"use client";

import {
  CalendarDays,
  Check,
  GraduationCap,
  Info,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { yearOptions } from "@/lib/ui";
import { degrees, majors } from "@/lib/catalogue";

function SectionHead({
  icon,
  tone,
  title,
  description,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  description: string;
}) {
  return (
    <header className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tone)}>{icon}</span>
      <div>
        <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
    </header>
  );
}

/** Small (i) icon that reveals a description tooltip on hover/focus. */
function InfoTip({ text }: { text: string }) {
  return (
    <button
      type="button"
      aria-label={text}
      className="group relative inline-flex cursor-help"
    >
      <Info size={13} className="text-zinc-300 transition group-hover:text-zinc-500 group-focus:text-zinc-500" />
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 w-56 rounded-lg bg-zinc-900 p-2.5 text-left text-[11px] font-normal leading-snug text-zinc-100 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus:opacity-100">
        {text}
      </span>
    </button>
  );
}

export default function ProfilePage() {
  const { state, ready, updateProfile, resetDemo, notify } = useCoursemap();
  const [draft, setDraft] = useState(state.profile);

  useEffect(() => {
    if (!ready) return;
    const profile = state.profile;
    window.queueMicrotask(() => setDraft(profile));
  }, [ready, state.profile]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.studentId.trim()) {
      notify("Add your name and student ID before saving");
      return;
    }
    updateProfile(draft);
    notify("Profile and academic plan saved");
  };

  const reset = () => {
    if (!window.confirm("Reset your local Coursemap demo data?")) return;
    resetDemo();
    notify("Demo profile and plan restored");
  };

  const selectedDegree = degrees.find((item) => item.code === draft.degreeCode) ?? degrees[0];
  const initials =
    draft.name
      .split(" ")
      .map((item) => item[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <AppShell title="Profile" subtitle="Your details and academic plan">
      <form onSubmit={save}>
        <h1 className="sr-only">Profile</h1>
        <div className="mb-5 flex justify-end">
          <Button variant="primary" type="submit">
            <Save size={16} /> Save changes
          </Button>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4">
            {/* Student profile */}
            <Card>
              <SectionHead
                icon={<UserRound size={18} />}
                tone="bg-sky-50 text-sky-600"
                title="Student profile"
                description="Stored only on this device in the prototype."
              />
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field label="Full name">
                  <Input
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Student ID">
                  <Input
                    value={draft.studentId}
                    onChange={(event) => setDraft({ ...draft, studentId: event.target.value })}
                    placeholder="u1234567"
                  />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                    placeholder="name@anu.edu.au"
                  />
                </Field>
                <Field label="Commencement year">
                  <Select
                    aria-label="Commencement year"
                    value={draft.commencementYear}
                    onChange={(value) => setDraft({ ...draft, commencementYear: value })}
                    options={yearOptions([2024, 2025, 2026, 2027])}
                  />
                </Field>
                <Field label="Study load">
                  <Select
                    aria-label="Study load"
                    value={draft.studyLoad}
                    onChange={(value) =>
                      setDraft({ ...draft, studyLoad: value as "Full time" | "Part time" })
                    }
                    options={[
                      { value: "Full time", label: "Full time" },
                      { value: "Part time", label: "Part time" },
                    ]}
                  />
                </Field>
              </div>
            </Card>

            {/* Degree */}
            <Card id="academic-plan">
              <SectionHead
                icon={<GraduationCap size={18} />}
                tone="bg-brand-50 text-brand-600"
                title="Degree"
                description="Your current programme. Pick a different one to compare."
              />
              <div className="p-5">
                <div className="flex items-center gap-3 rounded-xl bg-zinc-50/70 p-3 ring-1 ring-zinc-200">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-zinc-900 text-[11px] font-bold text-white">
                    {selectedDegree.code.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-zinc-900">{selectedDegree.name}</p>
                    <p className="text-[11px] text-zinc-400">
                      {selectedDegree.code} · {selectedDegree.duration} years ·{" "}
                      {selectedDegree.units} units · {selectedDegree.college}
                    </p>
                  </div>
                  <InfoTip text={selectedDegree.description} />
                </div>
                <Field label="Change degree" className="mt-4 max-w-md">
                  <Select
                    aria-label="Degree"
                    value={draft.degreeCode}
                    onChange={(value) => setDraft({ ...draft, degreeCode: value })}
                    options={degrees.map((degree) => ({
                      value: degree.code,
                      label: `${degree.name} (${degree.code})`,
                    }))}
                  />
                </Field>
              </div>
            </Card>

            {/* Catalogue year — the only place this changes */}
            <Card>
              <SectionHead
                icon={<CalendarDays size={18} />}
                tone="bg-amber-50 text-amber-600"
                title="Catalogue year"
                description="The rules year everything is evaluated against. This is the only place it changes."
              />
              <div className="p-5">
                <Field label="Rules year" className="max-w-xs">
                  <Select
                    aria-label="Rules year"
                    value={draft.catalogueYear}
                    onChange={(value) => setDraft({ ...draft, catalogueYear: value })}
                    options={yearOptions([2024, 2025, 2026], " catalogue")}
                  />
                </Field>
              </div>
            </Card>

            {/* Major — compact, description behind the (i) */}
            <Card>
              <SectionHead
                icon={<GraduationCap size={18} />}
                tone="bg-emerald-50 text-emerald-600"
                title="Major"
                description="Change this later and compare how completed courses carry across."
              />
              <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {majors.map((major) => {
                  const selected = draft.majorCode === major.code;
                  return (
                    <button
                      key={major.code}
                      type="button"
                      onClick={() => setDraft({ ...draft, majorCode: major.code })}
                      style={{ "--major": major.colour } as React.CSSProperties}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ring-1",
                        selected ? "ring-2 ring-[var(--major)]" : "ring-zinc-200 hover:ring-zinc-300",
                      )}
                    >
                      <span className="size-2.5 shrink-0 rounded-full bg-[var(--major)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-zinc-900">
                          {major.name}
                        </span>
                        <span className="block text-[11px] text-zinc-400">
                          {major.code} · {major.units} units
                        </span>
                      </span>
                      {selected && <Check size={14} className="shrink-0 text-[var(--major)]" />}
                      <InfoTip text={major.description} />
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-20">
            <Card className="flex flex-col items-center p-6 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                {initials}
              </span>
              <h2 className="mt-3 text-lg font-bold tracking-tight text-zinc-900">
                {draft.name || "Your profile"}
              </h2>
              <p className="text-xs text-zinc-400">{draft.studentId || "No student ID"}</p>
              <dl className="mt-5 w-full divide-y divide-zinc-100 border-y border-zinc-100 text-left text-[13px]">
                {[
                  ["Degree", selectedDegree.name],
                  ["Major", majors.find((item) => item.code === draft.majorCode)?.name],
                  ["Rules", `${draft.catalogueYear} catalogue`],
                  ["Load", draft.studyLoad],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[5rem_1fr] gap-2 py-2.5">
                    <dt className="text-xs text-zinc-400">{label}</dt>
                    <dd className="font-medium text-zinc-700">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex w-full items-start gap-2.5 rounded-xl bg-emerald-50/70 p-3 text-left ring-1 ring-emerald-100">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">Saved locally for now</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-emerald-700/80">
                    Ready to move to Supabase when the database is connected.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                fullWidth
                className="mt-4 text-rose-600 hover:bg-rose-50"
                onClick={reset}
              >
                <RotateCcw size={15} /> Reset demo data
              </Button>
            </Card>
          </aside>
        </div>
      </form>
    </AppShell>
  );
}
