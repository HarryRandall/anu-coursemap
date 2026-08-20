"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { GraduationCap, LogOut, Save, UserRound } from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
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
        <h1 className="sr-only">Profile and study details</h1>

        <Card className="overflow-hidden">
          <CardHeader
            className="border-b border-zinc-100"
            icon={
              <UserRound
                size={18}
                className="text-brand-600"
                aria-hidden="true"
              />
            }
            title="About you"
            description="Keep your saved plan identifiable."
          />
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
          <CardHeader
            className="border-b border-zinc-100"
            icon={
              <GraduationCap
                size={18}
                className="text-brand-600"
                aria-hidden="true"
              />
            }
            title="Course of study"
            description="Only administrator-published degrees and majors appear here."
          />
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
