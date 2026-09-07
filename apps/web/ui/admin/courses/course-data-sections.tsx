"use client";

import { useState, type FormEvent } from "react";
import { CourseUnitOptionsEditor } from "./course-unit-options-editor";
import { AnuSourceDialog } from "@/ui/admin/anu-source-dialog";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@coursemap/ui/components/alert";
import { Button } from "@coursemap/ui/primitives/button";
import { Input } from "@coursemap/ui/primitives/input";
import { Textarea } from "@coursemap/ui/primitives/textarea";
import { OptionPicker } from "@/ui/ui/option-picker";
import type { CourseSnapshotProjectionData as Projection } from "@/lib/course-import/project-snapshot";
import type { AdminCourseYearRecord } from "@/lib/coursemap/admin-course-year";
import {
  collectionEditorValue,
  preparedProjection,
} from "@/lib/coursemap/course-workspace-projection";

type Field = {
  key: string;
  label: string;
  kind?: "number" | "long" | "choice" | "boolean";
  options?: string[];
  required?: boolean;
};
type Section = {
  key: string;
  title: string;
  fields: Field[];
  collection?: keyof Projection;
  emptyRow?: Record<string, unknown>;
};
const sections: Section[] = [
  {
    key: "overview",
    title: "Overview",
    fields: [
      { key: "title", label: "Title", required: true },
      { key: "subjectCode", label: "Subject code", required: true },
      { key: "subjectName", label: "Subject name" },
      { key: "level", label: "Level", kind: "number", required: true },
      {
        key: "academicCareer",
        label: "Academic career",
        kind: "choice",
        options: ["UGRD", "PGRD", "RSCH", "OTHER"],
      },
      { key: "school", label: "School" },
      { key: "college", label: "College" },
      { key: "introduction", label: "Introduction", kind: "long" },
      { key: "description", label: "Description", kind: "long" },
    ],
  },
  {
    key: "teaching",
    title: "Teaching and workload",
    fields: [
      { key: "convenerText", label: "Convenor" },
      { key: "deliverySummary", label: "Delivery" },
      { key: "workloadText", label: "Workload", kind: "long" },
      { key: "workloadHours", label: "Workload hours", kind: "number" },
      {
        key: "inherentRequirements",
        label: "Inherent requirements",
        kind: "long",
      },
      { key: "prescribedTexts", label: "Prescribed texts", kind: "long" },
    ],
  },
  {
    key: "units",
    title: "Units and availability",
    fields: [
      {
        key: "unitValueKind",
        label: "Unit value",
        kind: "choice",
        options: ["fixed", "range", "variable", "unknown"],
      },
      { key: "units", label: "Fixed units", kind: "number" },
      { key: "minimumUnits", label: "Minimum units", kind: "number" },
      { key: "maximumUnits", label: "Maximum units", kind: "number" },
      { key: "eftsl", label: "EFTSL", kind: "number" },
      {
        key: "offeringStatus",
        label: "Availability",
        kind: "choice",
        options: ["offered", "not_offered", "unknown"],
      },
    ],
  },
  {
    key: "outcomes",
    title: "Learning outcomes",
    collection: "learningOutcomes",
    emptyRow: { body: "" },
    fields: [{ key: "body", label: "Outcome", kind: "long", required: true }],
  },
  {
    key: "assessment",
    title: "Assessment",
    collection: "assessmentItems",
    emptyRow: {
      title: "",
      weight: null,
      hurdle: null,
      dueText: null,
      sourceText: "",
    },
    fields: [
      { key: "title", label: "Assessment", kind: "long", required: true },
      { key: "weight", label: "Weight (%)", kind: "number" },
      { key: "dueText", label: "Due" },
      { key: "hurdle", label: "Hurdle", kind: "boolean" },
    ],
  },
  {
    key: "attributes",
    title: "Attributes",
    collection: "attributes",
    emptyRow: {
      attributeKind: "graduate_attribute",
      value: "",
      sourceText: "",
    },
    fields: [
      { key: "value", label: "Attribute", required: true },
      { key: "attributeKind", label: "Kind" },
    ],
  },
  {
    key: "areas",
    title: "Areas of interest",
    collection: "areasOfInterest",
    emptyRow: { name: "" },
    fields: [{ key: "name", label: "Area", required: true }],
  },
  {
    key: "offerings",
    title: "Offerings",
    collection: "offeringSessions",
    fields: [
      { key: "academicPeriodName", label: "Session", required: true },
      { key: "deliveryMode", label: "Delivery" },
      { key: "location", label: "Location" },
      { key: "classNumber", label: "Class number" },
      { key: "classSummaryUrl", label: "Class summary URL" },
      { key: "startsOn", label: "Starts" },
      { key: "enrolClosesOn", label: "Enrolment closes" },
      { key: "censusOn", label: "Census" },
      { key: "endsOn", label: "Ends" },
    ],
  },
  {
    key: "fees",
    title: "Fees",
    collection: "fees",
    fields: [
      { key: "audience", label: "Audience" },
      { key: "feeType", label: "Fee type" },
      { key: "amount", label: "Amount", kind: "number" },
      { key: "currency", label: "Currency" },
      { key: "basis", label: "Basis" },
      { key: "feeYear", label: "Year", kind: "number" },
    ],
  },
  {
    key: "related",
    title: "Related courses",
    collection: "relatedCourses",
    fields: [
      { key: "sourceCourseCode", label: "Course code" },
      { key: "sourceCourseTitle", label: "Title" },
      { key: "relationKind", label: "Relationship" },
    ],
  },
];

function readable(value: unknown) {
  if (value === null || value === undefined || value === "")
    return "Not provided";
  return String(value).replaceAll("_", " ");
}

function rowsFor(
  section: Section,
  projection: Projection,
): Record<string, unknown>[] {
  if (!section.collection) return [projection.snapshot];
  const value = projection[section.collection];
  return Array.isArray(value)
    ? (value as unknown as Record<string, unknown>[])
    : [];
}

export function CourseDataSections({
  canEdit,
  onSave,
  onEditingChange,
  record,
}: {
  canEdit: boolean;
  onSave: (projection: Projection) => Promise<void>;
  onEditingChange?: (editing: boolean) => void;
  record: AdminCourseYearRecord;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Projection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projection = record.projection;
  if (!projection)
    return (
      <p className="py-10 text-sm text-muted-foreground">
        No course data is available.
      </p>
    );

  function begin(section: Section) {
    setDraft(structuredClone(projection!));
    setEditing(section.key);
    onEditingChange?.(true);
    setError(null);
  }

  function update(
    section: Section,
    index: number,
    field: Field,
    value: string,
  ) {
    if (!draft) return;
    const next = structuredClone(draft);
    const row = rowsFor(section, next)[index];
    row[field.key] =
      field.kind === "number"
        ? value.trim()
          ? Number(value)
          : null
        : field.kind === "boolean"
          ? value === "not_recorded"
            ? null
            : value === "true"
          : value || (field.required ? "" : null);
    setDraft(next);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      // Validate the complete projection so section edits cannot break linked rows.
      const next = preparedProjection(
        record,
        draft.snapshot,
        collectionEditorValue(draft),
      );
      await onSave(next);
      setEditing(null);
      onEditingChange?.(false);
      setDraft(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The section could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => {
        const isEditing = editing === section.key && draft !== null;
        const rows = rowsFor(section, isEditing ? draft : projection);
        const evidence = record.evidence.filter(
          (item) =>
            item.evidence_excerpt &&
            (section.fields.some((field) => field.key === item.field_key) ||
              item.field_key === section.collection),
        );
        const originalRows = record.sourceOriginalProjection
          ? rowsFor(section, record.sourceOriginalProjection)
          : [];
        const sourceTexts = evidence.length
          ? evidence.map((item) => item.evidence_excerpt!)
          : originalRows.flatMap((row) =>
              typeof row.sourceText === "string" && row.sourceText
                ? [row.sourceText]
                : section.fields
                    .filter(
                      (field) =>
                        row[field.key] !== null &&
                        row[field.key] !== "" &&
                        row[field.key] !== undefined,
                    )
                    .map(
                      (field) => `${field.label}: ${readable(row[field.key])}`,
                    ),
            );
        return (
          <section
            aria-label={section.title}
            className="rounded-xl border border-border bg-card"
            key={section.key}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold">{section.title}</h2>
              <div className="flex items-center gap-2">
                <AnuSourceDialog
                  title={section.title}
                  texts={sourceTexts}
                  sourceUrl={record.sourcePage?.canonical_url}
                />
                {!isEditing && canEdit ? (
                  <Button
                    disabled={editing !== null}
                    onClick={() => begin(section)}
                    size="sm"
                    variant="outline"
                    type="button"
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="border-t border-border/60">
              <form onSubmit={save} className="min-w-0 px-5 pb-5 sm:px-6">
                {rows.length ? (
                  <div className="divide-y divide-border/60">
                    {rows.map((row, index) => (
                      <div className="py-4" key={index}>
                        <div
                          className={
                            isEditing
                              ? "grid gap-4 sm:grid-cols-2"
                              : "grid gap-x-6 gap-y-4 sm:grid-cols-2"
                          }
                        >
                          {section.fields.map((field) => {
                            if (
                              !isEditing &&
                              (row[field.key] === null ||
                                row[field.key] === "") &&
                              section.collection
                            )
                              return null;
                            return (
                              <div
                                className={
                                  field.kind === "long" ? "sm:col-span-2" : ""
                                }
                                key={field.key}
                              >
                                {isEditing ? (
                                  <label className="flex flex-col gap-2 text-sm">
                                    <span className="font-medium">
                                      {field.label}
                                    </span>
                                    {field.kind === "boolean" ? (
                                      <OptionPicker
                                        aria-label={field.label}
                                        value={
                                          row[field.key] === null
                                            ? "not_recorded"
                                            : String(row[field.key])
                                        }
                                        items={[
                                          {
                                            value: "not_recorded",
                                            label: "Not recorded",
                                          },
                                          { value: "true", label: "Yes" },
                                          { value: "false", label: "No" },
                                        ]}
                                        onValueChange={(value) =>
                                          update(section, index, field, value)
                                        }
                                      />
                                    ) : field.kind === "choice" ? (
                                      <OptionPicker
                                        aria-label={field.label}
                                        value={String(row[field.key] ?? "")}
                                        items={(field.options ?? []).map(
                                          (value) => ({
                                            value,
                                            label: readable(value),
                                          }),
                                        )}
                                        onValueChange={(value) =>
                                          update(section, index, field, value)
                                        }
                                      />
                                    ) : field.kind === "long" ? (
                                      <Textarea
                                        className="min-h-28"
                                        value={String(row[field.key] ?? "")}
                                        onChange={(event) =>
                                          update(
                                            section,
                                            index,
                                            field,
                                            event.target.value,
                                          )
                                        }
                                        required={field.required}
                                      />
                                    ) : (
                                      <Input
                                        value={String(row[field.key] ?? "")}
                                        type={
                                          field.kind === "number"
                                            ? "number"
                                            : "text"
                                        }
                                        step="any"
                                        onChange={(event) =>
                                          update(
                                            section,
                                            index,
                                            field,
                                            event.target.value,
                                          )
                                        }
                                        required={field.required}
                                      />
                                    )}
                                  </label>
                                ) : (
                                  <>
                                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                                      {field.label}
                                    </p>
                                    <p className="text-sm leading-6 break-words whitespace-pre-wrap">
                                      {readable(row[field.key])}
                                    </p>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {isEditing &&
                        section.collection &&
                        !["learningOutcomes", "assessmentItems"].includes(
                          section.collection,
                        ) ? (
                          <Button
                            className="mt-3"
                            aria-label={`Remove ${section.title.toLowerCase()} ${index + 1}`}
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => {
                              const next = structuredClone(draft);
                              const remaining = rowsFor(section, next)
                                .filter((_, rowIndex) => index !== rowIndex)
                                .map((item, rowIndex) => ({
                                  ...item,
                                  position: rowIndex + 1,
                                }));
                              Object.assign(next, {
                                [section.collection!]: remaining,
                              });
                              setDraft(next);
                            }}
                          >
                            <Trash2 aria-hidden="true" size={14} />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-5 text-sm text-muted-foreground">
                    None recorded.
                  </p>
                )}
                {isEditing ? (
                  <>
                    {section.key === "units" ? (
                      <CourseUnitOptionsEditor
                        projection={draft}
                        onChange={setDraft}
                      />
                    ) : null}
                    {section.collection && section.emptyRow ? (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const next = structuredClone(draft);
                          const currentRows = rowsFor(section, next);
                          currentRows.push({
                            ...section.emptyRow,
                            position: currentRows.length + 1,
                          });
                          setDraft(next);
                        }}
                      >
                        <Plus aria-hidden="true" size={14} />
                        Add item
                      </Button>
                    ) : null}
                    {error ? (
                      <Alert className="mt-4" variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="mt-5 flex justify-end gap-2 border-t border-border/60 pt-4">
                      <Button
                        disabled={saving}
                        onClick={() => {
                          setEditing(null);
                          onEditingChange?.(false);
                          setDraft(null);
                          setError(null);
                        }}
                        variant="outline"
                        type="button"
                      >
                        Cancel
                      </Button>
                      <Button disabled={saving} type="submit">
                        <Save aria-hidden="true" size={14} />
                        {saving ? "Saving..." : "Save section"}
                      </Button>
                    </div>
                  </>
                ) : null}
              </form>
            </div>
          </section>
        );
      })}
    </div>
  );
}
