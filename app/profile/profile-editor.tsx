"use client";
import { Alert, AlertDescription } from "@reui/components/alert";
import { Button } from "@reui/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@reui/ui/card";
import { Field, FieldDescription } from "@reui/ui/field";
import { Input } from "@reui/ui/input";
import { OptionPicker } from "@/components/ui/option-picker";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  LogOut,
  Save,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { StructureMultiSelect } from "@/components/profile/structure-multi-select";

import type { OnboardingCatalogue } from "@/lib/coursemap/onboarding-catalogue";
import { nominalProgrammeDuration } from "@/lib/coursemap/plan-timeline";

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
  const minors = useMemo(
    () =>
      catalogue.minors.filter(
        (item) =>
          item.catalogueYear === draft.catalogueYear &&
          (degree?.minorCodes.length ?? 0) > 0 &&
          degree?.minorCodes.includes(item.code),
      ),
    [catalogue.minors, degree?.minorCodes, draft.catalogueYear],
  );
  const specialisations = useMemo(
    () =>
      catalogue.specialisations.filter(
        (item) =>
          item.catalogueYear === draft.catalogueYear &&
          (degree?.specialisationCodes.length ?? 0) > 0 &&
          degree?.specialisationCodes.includes(item.code),
      ),
    [
      catalogue.specialisations,
      degree?.specialisationCodes,
      draft.catalogueYear,
    ],
  );
  const catalogueYears = catalogue.catalogueYears.map((item) => item.year);
  const planningDuration = nominalProgrammeDuration(
    degree
      ? { duration: degree.durationYears, units: degree.units }
      : undefined,
  );
  const commencementYears = useMemo(() => {
    if (planningDuration === null) return [];
    const selectedYear =
      draft.catalogueYear || catalogueYears[0] || new Date().getFullYear();
    return Array.from(
      { length: planningDuration },
      (_, index) => selectedYear - index,
    );
  }, [catalogueYears, draft.catalogueYear, planningDuration]);

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
    if (planningDuration === null) {
      notify(
        "This programme does not have duration or unit information recorded yet",
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
            <Button size="sm" type="submit" variant="outline">
              <LogOut size={15} />
              Sign out
            </Button>
          </form>
        ) : undefined
      }
    >
      <form className="w-full space-y-5" onSubmit={save}>
        <h1 className="sr-only">Profile and study details</h1>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60">
            {
              <UserRound
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
            }
            <CardTitle>
              <h2>{"About you"}</h2>
            </CardTitle>
            {Boolean("Keep your saved plan identifiable.") && (
              <CardDescription>
                {"Keep your saved plan identifiable."}
              </CardDescription>
            )}
          </CardHeader>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Name"}</span>
                <Input
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  value={draft.name}
                />
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Student number"}</span>
                <Input
                  onChange={(event) =>
                    setDraft({ ...draft, studentId: event.target.value })
                  }
                  value={draft.studentId}
                />
                <FieldDescription>
                  {"Optional. Use the format u1234567."}
                </FieldDescription>
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Study load"}</span>
                <OptionPicker
                  value={"coursemap:" + String(draft.studyLoad)}
                  onValueChange={(nextValue) => {
                    const option = (
                      [
                        { value: "Full time", label: "Full time" },
                        { value: "Part time", label: "Part time" },
                      ] as const
                    ).find(
                      (option) =>
                        "coursemap:" + String(option.value) === nextValue,
                    );
                    if (option)
                      ((value) =>
                        setDraft({
                          ...draft,
                          studyLoad: value as "Full time" | "Part time",
                        }))(option.value);
                  }}
                  aria-label={"Study load"}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={"Select..."}
                  items={[
                    { value: "Full time", label: "Full time" },
                    { value: "Part time", label: "Part time" },
                  ].map((option) => ({
                    value: "coursemap:" + String(option.value),
                    label: option.label,
                  }))}
                />
              </label>
            </Field>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60">
            {
              <GraduationCap
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
            }
            <CardTitle>
              <h2>{"Course of study"}</h2>
            </CardTitle>
            {Boolean(
              "Only administrator-published academic structures appear here.",
            ) && (
              <CardDescription>
                {
                  "Only administrator-published academic structures appear here."
                }
              </CardDescription>
            )}
          </CardHeader>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Catalogue year"}</span>
                <OptionPicker
                  value={"coursemap:" + String(draft.catalogueYear)}
                  onValueChange={(nextValue) => {
                    const option = catalogueYears
                      .map((year) => ({
                        value: year,
                        label: `${year} catalogue`,
                      }))
                      .find(
                        (option) =>
                          "coursemap:" + String(option.value) === nextValue,
                      );
                    if (option)
                      ((value) => {
                        const catalogueYear = Number(value);
                        const degree = catalogue.degrees.find(
                          (item) => item.catalogueYear === catalogueYear,
                        );
                        setDraft({
                          ...draft,
                          catalogueYear,
                          degreeCode: degree?.code ?? "",
                          majorCode: "",
                          minorCodes: [],
                          specialisationCodes: [],
                        });
                      })(option.value);
                  }}
                  aria-label={"Catalogue year"}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={"Select..."}
                  searchable={false}
                  items={catalogueYears
                    .map((year) => ({
                      value: year,
                      label: `${year} catalogue`,
                    }))
                    .map((option) => ({
                      value: "coursemap:" + String(option.value),
                      label: option.label,
                    }))}
                />
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Degree"}</span>
                <OptionPicker
                  value={"coursemap:" + String(draft.degreeCode)}
                  onValueChange={(nextValue) => {
                    const option = degrees
                      .map((item) => ({
                        value: item.code,
                        label: `${item.name} (${item.code})`,
                      }))
                      .find(
                        (option) =>
                          "coursemap:" + String(option.value) === nextValue,
                      );
                    if (option)
                      ((value) =>
                        setDraft({
                          ...draft,
                          degreeCode: value,
                          majorCode: "",
                          minorCodes: [],
                          specialisationCodes: [],
                        }))(option.value);
                  }}
                  aria-label={"Degree"}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={"Select..."}
                  items={degrees
                    .map((item) => ({
                      value: item.code,
                      label: `${item.name} (${item.code})`,
                    }))
                    .map((option) => ({
                      value: "coursemap:" + String(option.value),
                      label: option.label,
                    }))}
                />
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Major"}</span>
                <OptionPicker
                  value={"coursemap:" + String(draft.majorCode)}
                  onValueChange={(nextValue) => {
                    const option = (
                      [
                        { value: "", label: "Choose later" },
                        ...majors.map((item) => ({
                          value: item.code,
                          label: `${item.name} (${item.code})`,
                        })),
                      ] as const
                    ).find(
                      (option) =>
                        "coursemap:" + String(option.value) === nextValue,
                    );
                    if (option)
                      ((value) => setDraft({ ...draft, majorCode: value }))(
                        option.value,
                      );
                  }}
                  aria-label={"Major"}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={"Select..."}
                  items={[
                    { value: "", label: "Choose later" },
                    ...majors.map((item) => ({
                      value: item.code,
                      label: `${item.name} (${item.code})`,
                    })),
                  ].map((option) => ({
                    value: "coursemap:" + String(option.value),
                    label: option.label,
                  }))}
                />
                <FieldDescription>{"Optional"}</FieldDescription>
              </label>
            </Field>
            {minors.length > 0 ? (
              <StructureMultiSelect
                className="sm:col-span-2"
                hint="Optional. Select every minor included in this plan."
                label="Minors"
                onChange={(minorCodes) => setDraft({ ...draft, minorCodes })}
                options={minors}
                value={draft.minorCodes}
              />
            ) : null}
            {specialisations.length > 0 ? (
              <StructureMultiSelect
                className="sm:col-span-2"
                hint="Optional. Select every specialisation included in this plan."
                label="Specialisations"
                onChange={(specialisationCodes) =>
                  setDraft({ ...draft, specialisationCodes })
                }
                options={specialisations}
                value={draft.specialisationCodes}
              />
            ) : null}
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  {"When did you start this degree?"}
                </span>
                <OptionPicker
                  value={"coursemap:" + String(draft.commencementYear)}
                  onValueChange={(nextValue) => {
                    const option = commencementYears
                      .map((year) => ({
                        value: year,
                        label: String(year),
                      }))
                      .find(
                        (option) =>
                          "coursemap:" + String(option.value) === nextValue,
                      );
                    if (option)
                      ((value) =>
                        setDraft({ ...draft, commencementYear: value }))(
                        option.value,
                      );
                  }}
                  disabled={planningDuration === null}
                  aria-label={"Commencement year"}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={"Select..."}
                  searchable={false}
                  items={commencementYears
                    .map((year) => ({
                      value: year,
                      label: String(year),
                    }))
                    .map((option) => ({
                      value: "coursemap:" + String(option.value),
                      label: option.label,
                    }))}
                />
              </label>
            </Field>
            {degree?.durationYears === null || degree?.units === null ? (
              <Alert className="sm:col-span-2" variant={"warning"}>
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>
                  {planningDuration === null
                    ? "Programme duration and unit total are not recorded. An administrator must publish at least one before this plan can be saved."
                    : degree.durationYears === null
                      ? `Programme duration is not recorded. Coursemap is using the published ${degree.units} unit total to size the planning timeline.`
                      : "Programme unit total is not recorded. The timeline can use its published duration, but unit progress will remain unavailable."}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </Card>

        <Button
          disabled={saving || !ready || planningDuration === null}
          type="submit"
          variant="outline"
        >
          <Save size={16} />
          {saving ? "Saving…" : "Save details"}
        </Button>
      </form>
    </AppShell>
  );
}
