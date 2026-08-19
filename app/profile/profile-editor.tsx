"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { GraduationCap, LogOut, Save, UserRound } from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { OnboardingCatalogue } from "@/lib/coursemap/onboarding-catalogue";

export function ProfileEditor({
  catalogue,
}: {
  catalogue: OnboardingCatalogue;
}) {
  const { demoMode, notify, ready, state, updateProfile } = useCoursemap();
  const [draft, setDraft] = useState(state.profile);
  const [saving, setSaving] = useState(false);
  const degrees = useMemo(
    () =>
      catalogue.degrees.filter(
        (item) => item.catalogueYear === draft.catalogueYear,
      ),
    [catalogue.degrees, draft.catalogueYear],
  );
  const degree = useMemo(
    () => degrees.find((item) => item.code === draft.degreeCode),
    [degrees, draft.degreeCode],
  );
  const majors = useMemo(
    () =>
      catalogue.majors.filter(
        (item) =>
          item.catalogueYear === draft.catalogueYear &&
          (degree?.majorCodes.length ?? 0) > 0 &&
          degree?.majorCodes.includes(item.code),
      ),
    [catalogue.majors, degree?.majorCodes, draft.catalogueYear],
  );
  const catalogueYears = catalogue.catalogueYears.map((item) => item.year);
  const commencementYears = useMemo(() => {
    const duration = Math.max(1, Math.ceil(degree?.durationYears ?? 1));
    const selectedYear =
      draft.catalogueYear || catalogueYears[0] || new Date().getFullYear();
    return Array.from({ length: duration }, (_, index) => selectedYear - index);
  }, [catalogueYears, degree?.durationYears, draft.catalogueYear]);

  useEffect(() => {
    if (!ready) return;
    window.queueMicrotask(() => setDraft(state.profile));
  }, [ready, state.profile]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.degreeCode) {
      notify(
        "Add your name and select a published degree before saving",
        "warning",
      );
      return;
    }
    setSaving(true);
    const result = await updateProfile(draft);
    setSaving(false);
    notify(result.message, result.ok ? "success" : "warning");
  }

  return (
    <AppShell
      actions={
        !demoMode ? (
          <form action="/auth/logout" method="post">
            <Button size="sm" type="submit" variant="secondary">
              <LogOut size={15} /> Sign out
            </Button>
          </form>
        ) : undefined
      }
    >
      <form className="w-full space-y-5" onSubmit={save}>
        <header>
          <p className="text-sm font-medium text-brand-700">Your plan</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
            Profile and study details
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            These choices use the published catalogue, not a local sample plan.
          </p>
        </header>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <UserRound size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">About you</h2>
              <p className="text-xs text-zinc-500">
                Keep your saved plan identifiable.
              </p>
            </div>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Name">
              <Input
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                value={draft.name}
              />
            </Field>
            <Field hint="Optional" label="Student number">
              <Input
                onChange={(event) =>
                  setDraft({ ...draft, studentId: event.target.value })
                }
                value={draft.studentId}
              />
            </Field>
            <Field label="Study load">
              <Select
                aria-label="Study load"
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    studyLoad: value as "Full time" | "Part time",
                  })
                }
                options={[
                  { value: "Full time", label: "Full time" },
                  { value: "Part time", label: "Part time" },
                ]}
                value={draft.studyLoad}
              />
            </Field>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <GraduationCap size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Course of study
              </h2>
              <p className="text-xs text-zinc-500">
                Only administrator-published degrees and majors appear here.
              </p>
            </div>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Catalogue year">
              <Select
                aria-label="Catalogue year"
                onChange={(value) => {
                  const catalogueYear = Number(value);
                  const degree = catalogue.degrees.find(
                    (item) => item.catalogueYear === catalogueYear,
                  );
                  setDraft({
                    ...draft,
                    catalogueYear,
                    degreeCode: degree?.code ?? "",
                    majorCode: "",
                  });
                }}
                options={catalogueYears.map((year) => ({
                  value: year,
                  label: `${year} catalogue`,
                }))}
                value={draft.catalogueYear}
              />
            </Field>
            <Field label="Degree">
              <Select
                aria-label="Degree"
                onChange={(value) =>
                  setDraft({ ...draft, degreeCode: value, majorCode: "" })
                }
                options={degrees.map((item) => ({
                  value: item.code,
                  label: `${item.name} (${item.code})`,
                }))}
                value={draft.degreeCode}
              />
            </Field>
            <Field hint="Optional" label="Major">
              <Select
                aria-label="Major"
                onChange={(value) => setDraft({ ...draft, majorCode: value })}
                options={[
                  { value: "", label: "Choose later" },
                  ...majors.map((item) => ({
                    value: item.code,
                    label: `${item.name} (${item.code})`,
                  })),
                ]}
                value={draft.majorCode}
              />
            </Field>
            <Field label="When did you start this degree?">
              <Select
                aria-label="Commencement year"
                onChange={(value) =>
                  setDraft({ ...draft, commencementYear: value })
                }
                options={commencementYears.map((year) => ({
                  value: year,
                  label: String(year),
                }))}
                value={draft.commencementYear}
              />
            </Field>
          </div>
        </Card>

        <Button disabled={saving || !ready} type="submit">
          <Save size={16} /> {saving ? "Saving…" : "Save details"}
        </Button>
      </form>
    </AppShell>
  );
}
