"use client";
import type { ChangeEvent } from "react";
import { Field } from "@reui/ui/field";
import { Input } from "@reui/ui/input";
import { Textarea } from "@reui/ui/textarea";
import { OptionPicker } from "@/components/ui/option-picker";
import type { AcademicStructureManualSnapshotProjection as Projection } from "@/lib/structure-import/manual-snapshot";
import { nullableText, nullableNumber, numberValue } from "./editor-utils";

export function DetailsSectionEditor({
  projection,
  onProjectionChange: setProjection,
}: {
  projection: Projection;
  onProjectionChange: (projection: Projection) => void;
}) {
  const updateSnapshot = (
    key: keyof Projection["snapshot"],
    value: Projection["snapshot"][keyof Projection["snapshot"]],
  ) =>
    setProjection({
      ...projection,
      snapshot: { ...projection.snapshot, [key]: value },
    });

  const textField = (
    key: keyof Projection["snapshot"],
    options: { multiline?: boolean; required?: boolean } = {},
  ) => {
    const value = projection.snapshot[key];
    const props = {
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        updateSnapshot(key, nullableText(event.target.value)),
      required: options.required,
      value: typeof value === "string" ? value : "",
    };
    return options.multiline ? <Textarea {...props} /> : <Input {...props} />;
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">Details</h2>
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Identity</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field className="sm:col-span-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Name"}</span>
                {textField("title", { required: true })}
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Acronym"}</span>
                {textField("acronym")}
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Short name"}</span>
                {textField("shortName")}
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Academic career"}</span>
                {textField("academicCareer")}
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"College"}</span>
                {textField("college")}
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Total units"}</span>
                <Input
                  min="0.5"
                  onChange={(event) =>
                    updateSnapshot(
                      "totalUnits",
                      nullableNumber(event.target.value),
                    )
                  }
                  step="0.5"
                  type="number"
                  value={numberValue(projection.snapshot.totalUnits)}
                />
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  {"Duration in years"}
                </span>
                <Input
                  min="0.1"
                  onChange={(event) =>
                    updateSnapshot(
                      "durationYears",
                      nullableNumber(event.target.value),
                    )
                  }
                  step="0.1"
                  type="number"
                  value={numberValue(projection.snapshot.durationYears)}
                />
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Delivery mode"}</span>
                {textField("deliveryMode")}
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Study as"}</span>
                {textField("studyAs")}
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Contact"}</span>
                {textField("contactText")}
              </label>
            </Field>
          </div>
        </div>

        <div className="border-t border-border/60 pt-6">
          <h3 className="text-sm font-semibold text-foreground">
            Admissions and combinations
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Selection rank"}</span>
                <Input
                  max="100"
                  min="0"
                  onChange={(event) =>
                    updateSnapshot(
                      "selectionRank",
                      nullableNumber(event.target.value),
                    )
                  }
                  step="0.05"
                  type="number"
                  value={numberValue(projection.snapshot.selectionRank)}
                />
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"ATAR"}</span>
                <Input
                  max="100"
                  min="0"
                  onChange={(event) =>
                    updateSnapshot("atar", nullableNumber(event.target.value))
                  }
                  step="0.05"
                  type="number"
                  value={numberValue(projection.snapshot.atar)}
                />
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{"Can combine"}</span>
                <OptionPicker
                  value={
                    "coursemap:" +
                    String(
                      projection.snapshot.canCombine === null
                        ? "unknown"
                        : projection.snapshot.canCombine
                          ? "yes"
                          : "no",
                    )
                  }
                  onValueChange={(nextValue) => {
                    const option = (
                      [
                        { value: "unknown", label: "Not recorded" },
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ] as const
                    ).find(
                      (option) =>
                        "coursemap:" + String(option.value) === nextValue,
                    );
                    if (option)
                      ((value) =>
                        updateSnapshot(
                          "canCombine",
                          value === "unknown" ? null : value === "yes",
                        ))(option.value);
                  }}
                  aria-label={"Can combine"}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={"Select..."}
                  items={[
                    { value: "unknown", label: "Not recorded" },
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ].map((option) => ({
                    value: "coursemap:" + String(option.value),
                    label: option.label,
                  }))}
                />
              </label>
            </Field>
            <Field>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  {"Can combine vertically"}
                </span>
                <OptionPicker
                  value={
                    "coursemap:" +
                    String(
                      projection.snapshot.canCombineVertical === null
                        ? "unknown"
                        : projection.snapshot.canCombineVertical
                          ? "yes"
                          : "no",
                    )
                  }
                  onValueChange={(nextValue) => {
                    const option = (
                      [
                        { value: "unknown", label: "Not recorded" },
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ] as const
                    ).find(
                      (option) =>
                        "coursemap:" + String(option.value) === nextValue,
                    );
                    if (option)
                      ((value) =>
                        updateSnapshot(
                          "canCombineVertical",
                          value === "unknown" ? null : value === "yes",
                        ))(option.value);
                  }}
                  aria-label={"Can combine vertically"}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={"Select..."}
                  items={[
                    { value: "unknown", label: "Not recorded" },
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ].map((option) => ({
                    value: "coursemap:" + String(option.value),
                    label: option.label,
                  }))}
                />
              </label>
            </Field>
          </div>
        </div>

        <div className="grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Introduction"}</span>
              {textField("introduction", { multiline: true })}
            </label>
          </Field>
          <Field className="sm:col-span-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Description"}</span>
              {textField("description", { multiline: true })}
            </label>
          </Field>
        </div>
      </div>
    </section>
  );
}
