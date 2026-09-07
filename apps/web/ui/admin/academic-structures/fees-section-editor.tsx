"use client";
import { Button } from "@coursemap/ui/primitives/button";
import { Field } from "@coursemap/ui/primitives/field";
import { Input } from "@coursemap/ui/primitives/input";
import { OptionPicker } from "@/ui/common/option-picker";
import { Plus, Trash2 } from "lucide-react";
import type { AcademicStructureManualSnapshotProjection as Projection } from "@/lib/structure-import/manual-snapshot";
import { CollectionHeader, ProvenanceFields } from "./source-fields-editor";
import { nullableText, nullableNumber, numberValue } from "./editor-utils";

export function FeesSectionEditor({
  projection,
  onProjectionChange: setProjection,
}: {
  projection: Projection;
  onProjectionChange: (projection: Projection) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CollectionHeader
        action={
          <Button
            onClick={() =>
              setProjection({
                ...projection,
                fees: [
                  ...projection.fees,
                  {
                    position: projection.fees.length + 1,
                    feeYear: projection.academicYear,
                    audience: "other",
                    feeType: "other",
                    amount: null,
                    currency: null,
                    basis: "unknown",
                    sourceLabel: null,
                    sourceText: "",
                    sourceLocator: `manual:fee:${projection.fees.length + 1}`,
                  },
                ],
              })
            }
            size="sm"
            variant="outline"
            type="button"
          >
            <Plus aria-hidden="true" size={13} />
            Add fee
          </Button>
        }
        count={projection.fees.length}
      >
        Fees
      </CollectionHeader>
      <div className="space-y-3 p-5 sm:p-6">
        {projection.fees.map((fee, index) => {
          const updateFee = (
            changes: Partial<(typeof projection.fees)[number]>,
          ) =>
            setProjection({
              ...projection,
              fees: projection.fees.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...changes } : item,
              ),
            });
          return (
            <div
              className="rounded-lg border border-border p-4"
              key={`${fee.position}-${index}`}
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Audience"}</span>
                      <OptionPicker
                        value={"coursemap:" + String(fee.audience)}
                        onValueChange={(nextValue) => {
                          const option = (
                            [
                              { value: "domestic", label: "Domestic" },
                              {
                                value: "international",
                                label: "International",
                              },
                              {
                                value: "commonwealth_supported",
                                label: "Commonwealth supported",
                              },
                              { value: "other", label: "Other" },
                            ] as const
                          ).find(
                            (option) =>
                              "coursemap:" + String(option.value) === nextValue,
                          );
                          if (option)
                            ((audience) => updateFee({ audience }))(
                              option.value,
                            );
                        }}
                        aria-label={"Fee audience"}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder={"Select..."}
                        items={[
                          { value: "domestic", label: "Domestic" },
                          {
                            value: "international",
                            label: "International",
                          },
                          {
                            value: "commonwealth_supported",
                            label: "Commonwealth supported",
                          },
                          { value: "other", label: "Other" },
                        ].map((option) => ({
                          value: "coursemap:" + String(option.value),
                          label: option.label,
                        }))}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Fee type"}</span>
                      <OptionPicker
                        value={"coursemap:" + String(fee.feeType)}
                        onValueChange={(nextValue) => {
                          const option = (
                            [
                              {
                                value: "student_contribution",
                                label: "Student contribution",
                              },
                              { value: "tuition", label: "Tuition" },
                              { value: "indicative", label: "Indicative" },
                              { value: "other", label: "Other" },
                            ] as const
                          ).find(
                            (option) =>
                              "coursemap:" + String(option.value) === nextValue,
                          );
                          if (option)
                            ((feeType) => updateFee({ feeType }))(option.value);
                        }}
                        aria-label={"Fee type"}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder={"Select..."}
                        items={[
                          {
                            value: "student_contribution",
                            label: "Student contribution",
                          },
                          { value: "tuition", label: "Tuition" },
                          { value: "indicative", label: "Indicative" },
                          { value: "other", label: "Other" },
                        ].map((option) => ({
                          value: "coursemap:" + String(option.value),
                          label: option.label,
                        }))}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Amount"}</span>
                      <Input
                        min="0"
                        onChange={(event) =>
                          updateFee({
                            amount: nullableNumber(event.target.value),
                          })
                        }
                        step="0.01"
                        type="number"
                        value={numberValue(fee.amount)}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Currency"}</span>
                      <OptionPicker
                        value={"coursemap:" + String(fee.currency ?? "unknown")}
                        onValueChange={(nextValue) => {
                          const option = (
                            [
                              { value: "unknown", label: "Not stated" },
                              { value: "AUD", label: "AUD" },
                            ] as const
                          ).find(
                            (option) =>
                              "coursemap:" + String(option.value) === nextValue,
                          );
                          if (option)
                            ((currency) =>
                              updateFee({
                                currency: currency === "unknown" ? null : "AUD",
                              }))(option.value);
                        }}
                        aria-label={"Fee currency"}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder={"Select..."}
                        items={[
                          { value: "unknown", label: "Not stated" },
                          { value: "AUD", label: "AUD" },
                        ].map((option) => ({
                          value: "coursemap:" + String(option.value),
                          label: option.label,
                        }))}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Basis"}</span>
                      <OptionPicker
                        value={"coursemap:" + String(fee.basis)}
                        onValueChange={(nextValue) => {
                          const option = (
                            [
                              { value: "programme", label: "Programme" },
                              { value: "unit", label: "Per unit" },
                              { value: "eftsl", label: "Per EFTSL" },
                              { value: "annual", label: "Annual" },
                              { value: "unknown", label: "Not stated" },
                            ] as const
                          ).find(
                            (option) =>
                              "coursemap:" + String(option.value) === nextValue,
                          );
                          if (option)
                            ((basis) => updateFee({ basis }))(option.value);
                        }}
                        aria-label={"Fee basis"}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder={"Select..."}
                        items={[
                          { value: "programme", label: "Programme" },
                          { value: "unit", label: "Per unit" },
                          { value: "eftsl", label: "Per EFTSL" },
                          { value: "annual", label: "Annual" },
                          { value: "unknown", label: "Not stated" },
                        ].map((option) => ({
                          value: "coursemap:" + String(option.value),
                          label: option.label,
                        }))}
                      />
                    </label>
                  </Field>
                  <Field>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Fee year"}</span>
                      <Input
                        min="2000"
                        onChange={(event) =>
                          updateFee({
                            feeYear: nullableNumber(event.target.value),
                          })
                        }
                        step="1"
                        type="number"
                        value={numberValue(fee.feeYear)}
                      />
                    </label>
                  </Field>
                  <Field className="sm:col-span-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        {"Source label"}
                      </span>
                      <Input
                        onChange={(event) =>
                          updateFee({
                            sourceLabel: nullableText(event.target.value),
                          })
                        }
                        value={fee.sourceLabel ?? ""}
                      />
                    </label>
                  </Field>
                </div>
                <Button
                  onClick={() =>
                    setProjection({
                      ...projection,
                      fees: projection.fees.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Remove fee ${index + 1}`}
                  title={`Remove fee ${index + 1}`}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </Button>
              </div>
              <ProvenanceFields
                onLocatorChange={(sourceLocator) =>
                  updateFee({ sourceLocator })
                }
                onSourceTextChange={(sourceText) => updateFee({ sourceText })}
                sourceLocator={fee.sourceLocator}
                sourceText={fee.sourceText}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
