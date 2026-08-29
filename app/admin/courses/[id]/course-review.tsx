"use client";

import {
  Archive,
  Check,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileCode2,
  Pencil,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { CourseImportArtifactViewer } from "@/components/admin/imports/course-import-artifact-viewer";
import {
  CourseSnapshotRuleEditor,
  type EditableRuleKind,
} from "@/components/admin/course-snapshot-rule-editor";
import {
  CourseReviewTabs,
  type CourseReviewTab,
} from "@/components/admin/imports/course-review-tabs";
import {
  CourseDetailTabsList,
  CourseDetailView,
} from "@/components/courses/course-detail-view";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { JsonCode } from "@/components/ui/json-code";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { CourseSnapshotProjectionData } from "@/lib/course-import/project-snapshot";
import { parseCourseSnapshotProjection } from "@/lib/course-import/snapshot-projection-contract";
import type { AdminCourseYearRecord } from "@/lib/coursemap/admin-course-year";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import {
  archiveCourseYear,
  confirmCourseSnapshot,
  publishCourseSnapshot,
  saveCourseSnapshot,
} from "@/lib/coursemap/course-snapshot-actions";

type SnapshotFields = CourseSnapshotProjectionData["snapshot"];
type AdvancedCollections = Omit<
  CourseSnapshotProjectionData,
  "academicYear" | "courseCode" | "snapshot"
>;

const advancedCollectionKeys = [
  "unitOptions",
  "fees",
  "areasOfInterest",
  "attributes",
  "relatedCourses",
  "courseOffering",
  "offeringSessions",
  "learningOutcomes",
  "assessmentItems",
  "assessmentOutcomes",
  "rules",
  "ruleGroups",
  "ruleConditions",
  "ruleConditionCourses",
  "ruleCourseReferences",
] as const satisfies readonly (keyof AdvancedCollections)[];

const positionedCollectionKeys = [
  "unitOptions",
  "fees",
  "areasOfInterest",
  "attributes",
  "relatedCourses",
  "offeringSessions",
  "learningOutcomes",
  "assessmentItems",
] as const;

const academicCareerOptions: Array<{
  value: "" | NonNullable<SnapshotFields["academicCareer"]>;
  label: string;
}> = [
  { value: "", label: "Not recorded" },
  { value: "UGRD", label: "Undergraduate" },
  { value: "PGRD", label: "Postgraduate" },
  { value: "RSCH", label: "Research" },
  { value: "OTHER", label: "Other" },
];

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(date);
}

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function nullableText(value: string) {
  return value.trim() ? value : null;
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function advancedCollections(
  projection: CourseSnapshotProjectionData,
): AdvancedCollections {
  return Object.fromEntries(
    advancedCollectionKeys.map((key) => [key, projection[key]]),
  ) as AdvancedCollections;
}

function collectionEditorValue(projection: CourseSnapshotProjectionData) {
  return JSON.stringify(advancedCollections(projection), null, 2);
}

function validatePositions(label: string, rows: unknown[], firstPosition = 1) {
  const positions = rows.map((row) =>
    isRecord(row) && Number.isInteger(row.position)
      ? Number(row.position)
      : NaN,
  );
  if (positions.some((position) => !Number.isInteger(position))) {
    throw new TypeError(`${label} requires an integer position on every row.`);
  }
  if (new Set(positions).size !== positions.length) {
    throw new TypeError(`${label} contains duplicate positions.`);
  }
  const ordered = [...positions].sort((left, right) => left - right);
  if (ordered.some((position, index) => position !== firstPosition + index)) {
    throw new TypeError(
      `${label} positions must run from ${firstPosition} without gaps.`,
    );
  }
}

function parseAdvancedCollections(value: string): AdvancedCollections {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new TypeError(
      error instanceof Error ? error.message : "The JSON is not valid.",
    );
  }
  if (!isRecord(parsed)) {
    throw new TypeError("Advanced collections must be one JSON object.");
  }
  const keys = Object.keys(parsed).sort();
  const expectedKeys = [...advancedCollectionKeys].sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new TypeError(
      `Keep exactly these collection keys: ${advancedCollectionKeys.join(", ")}.`,
    );
  }
  for (const key of advancedCollectionKeys) {
    if (key === "courseOffering") {
      if (parsed[key] !== null && !isRecord(parsed[key])) {
        throw new TypeError("courseOffering must be an object or null.");
      }
    } else if (!Array.isArray(parsed[key])) {
      throw new TypeError(`${key} must be a JSON array.`);
    }
  }
  for (const key of positionedCollectionKeys) {
    validatePositions(key, parsed[key] as unknown[]);
  }

  const rules = parsed.rules as unknown[];
  const ruleKeys = new Set(
    rules.map((rule) => (isRecord(rule) ? rule.key : undefined)),
  );
  if (ruleKeys.has(undefined) || ruleKeys.size !== rules.length) {
    throw new TypeError("Every rule requires a unique key.");
  }
  const groups = parsed.ruleGroups as unknown[];
  const groupKeys = new Set(
    groups.map((group) => (isRecord(group) ? group.key : undefined)),
  );
  if (groupKeys.has(undefined) || groupKeys.size !== groups.length) {
    throw new TypeError("Every rule group requires a unique key.");
  }
  for (const group of groups) {
    if (
      !isRecord(group) ||
      !ruleKeys.has(group.ruleKey) ||
      (group.parentGroupKey !== null && !groupKeys.has(group.parentGroupKey))
    ) {
      throw new TypeError(
        "Every rule group must reference an existing rule and parent group.",
      );
    }
  }
  const conditions = parsed.ruleConditions as unknown[];
  const conditionKeys = new Set(
    conditions.map((condition) =>
      isRecord(condition) ? condition.key : undefined,
    ),
  );
  if (
    conditionKeys.has(undefined) ||
    conditionKeys.size !== conditions.length
  ) {
    throw new TypeError("Every rule condition requires a unique key.");
  }
  for (const condition of conditions) {
    if (
      !isRecord(condition) ||
      !ruleKeys.has(condition.ruleKey) ||
      !groupKeys.has(condition.groupKey)
    ) {
      throw new TypeError(
        "Every rule condition must reference an existing rule and group.",
      );
    }
  }
  for (const member of parsed.ruleConditionCourses as unknown[]) {
    if (!isRecord(member) || !conditionKeys.has(member.conditionKey)) {
      throw new TypeError(
        "Every condition course must reference an existing condition.",
      );
    }
  }
  for (const reference of parsed.ruleCourseReferences as unknown[]) {
    if (!isRecord(reference) || !ruleKeys.has(reference.ruleKey)) {
      throw new TypeError(
        "Every course reference must reference an existing rule.",
      );
    }
  }

  const outcomePositions = new Set(
    (parsed.learningOutcomes as unknown[]).map((row) =>
      isRecord(row) ? row.position : undefined,
    ),
  );
  const assessmentPositions = new Set(
    (parsed.assessmentItems as unknown[]).map((row) =>
      isRecord(row) ? row.position : undefined,
    ),
  );
  for (const link of parsed.assessmentOutcomes as unknown[]) {
    if (
      !isRecord(link) ||
      !assessmentPositions.has(link.assessmentPosition) ||
      !outcomePositions.has(link.learningOutcomePosition)
    ) {
      throw new TypeError(
        "Every assessment outcome link must reference saved assessment and learning outcome positions.",
      );
    }
  }
  return parsed as unknown as AdvancedCollections;
}

function validateUnitValue(
  snapshot: SnapshotFields,
  collections: AdvancedCollections,
) {
  if (snapshot.unitValueKind === "fixed") {
    if (snapshot.units === null || collections.unitOptions.length > 0) {
      throw new TypeError(
        "Fixed units require one units value and no unit options.",
      );
    }
    return;
  }
  if (snapshot.unitValueKind === "range") {
    if (
      snapshot.units !== null ||
      snapshot.minimumUnits === null ||
      snapshot.maximumUnits === null ||
      snapshot.maximumUnits < snapshot.minimumUnits ||
      collections.unitOptions.length > 0
    ) {
      throw new TypeError(
        "A unit range requires minimum and maximum units, with no fixed units or options.",
      );
    }
    return;
  }
  if (snapshot.unitValueKind === "variable") {
    const optionUnits = collections.unitOptions.map((option) => option.units);
    if (
      snapshot.units !== null ||
      optionUnits.length === 0 ||
      snapshot.minimumUnits !== Math.min(...optionUnits) ||
      snapshot.maximumUnits !== Math.max(...optionUnits)
    ) {
      throw new TypeError(
        "Variable units require unit options and matching minimum and maximum units.",
      );
    }
    return;
  }
  if (
    snapshot.units !== null ||
    snapshot.minimumUnits !== null ||
    snapshot.maximumUnits !== null ||
    collections.unitOptions.length > 0
  ) {
    throw new TypeError(
      "Unknown units cannot include fixed, minimum, maximum or option values.",
    );
  }
}

function preparedProjection(
  record: AdminCourseYearRecord,
  snapshot: SnapshotFields,
  collectionJson: string,
) {
  const collections = parseAdvancedCollections(collectionJson);
  validateUnitValue(snapshot, collections);
  for (const session of collections.offeringSessions) {
    if (session.calendarYear !== record.year) {
      throw new TypeError(
        `Every offering session must belong to the selected ${record.year} course year.`,
      );
    }
  }
  if (!snapshot.title.trim()) throw new TypeError("Course title is required.");
  if (!/^[A-Z]{4}$/.test(snapshot.subjectCode)) {
    throw new TypeError("Subject code must contain four uppercase letters.");
  }
  if (!Number.isInteger(snapshot.level) || snapshot.level < 0) {
    throw new TypeError("Course level must be a non-negative whole number.");
  }
  return parseCourseSnapshotProjection({
    courseCode: record.code,
    academicYear: record.year,
    snapshot,
    ...collections,
  });
}

function collectionSummary(collections: AdvancedCollections) {
  return [
    ["Fees", collections.fees.length],
    ["Areas", collections.areasOfInterest.length],
    ["Attributes", collections.attributes.length],
    ["Sessions", collections.offeringSessions.length],
    ["Outcomes", collections.learningOutcomes.length],
    ["Assessments", collections.assessmentItems.length],
    ["Rules", collections.rules.length],
  ] as const;
}

function projectionChanges(
  current: CourseSnapshotProjectionData,
  published: CourseSnapshotProjectionData | null,
) {
  if (!published) return ["New course year with no published snapshot"];
  const changes: string[] = [];
  for (const key of Object.keys(current.snapshot) as Array<
    keyof SnapshotFields
  >) {
    if (
      JSON.stringify(current.snapshot[key]) !==
      JSON.stringify(published.snapshot[key])
    ) {
      changes.push(`Course field: ${readable(key)}`);
    }
  }
  for (const key of advancedCollectionKeys) {
    if (JSON.stringify(current[key]) !== JSON.stringify(published[key])) {
      changes.push(`Collection: ${readable(key)}`);
    }
  }
  return changes;
}

function Panel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
      {children}
    </section>
  );
}

function FieldValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm leading-6 text-zinc-900">
        {value === null || value === undefined || value === "" ? (
          <span className="text-zinc-400">Not provided</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function nullableInputValue(value: number | null) {
  return value === null ? "" : value;
}

function SnapshotFieldsEditor({
  collectionsJson,
  draft,
  error,
  onCancel,
  onCollectionsChange,
  onDraftChange,
  onSubmit,
  preview,
  saving,
}: {
  collectionsJson: string;
  draft: SnapshotFields;
  error: string | null;
  onCancel: () => void;
  onCollectionsChange: (value: string) => void;
  onDraftChange: (value: SnapshotFields) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  preview: CourseSnapshotProjectionData | null;
  saving: boolean;
}) {
  const textField = (
    key: keyof SnapshotFields,
    options: { multiline?: boolean; required?: boolean } = {},
  ) => {
    const value = draft[key];
    const props = {
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onDraftChange({ ...draft, [key]: nullableText(event.target.value) }),
      required: options.required,
      value: typeof value === "string" ? value : "",
    };
    return options.multiline ? (
      <Textarea className="min-h-28" {...props} />
    ) : (
      <Input {...props} />
    );
  };

  return (
    <form className="space-y-6 p-5 sm:p-6" onSubmit={onSubmit}>
      <div>
        <h2 className="text-sm font-semibold text-zinc-950">Identity</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field className="sm:col-span-2" label="Course title">
            <Input
              onChange={(event) =>
                onDraftChange({ ...draft, title: event.target.value })
              }
              required
              value={draft.title}
            />
          </Field>
          <Field label="Course level">
            <Input
              min="0"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  level: Number(event.target.value),
                })
              }
              required
              step="1"
              type="number"
              value={draft.level}
            />
          </Field>
          <Field label="Subject code">
            <Input
              maxLength={4}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  subjectCode: event.target.value.toUpperCase(),
                })
              }
              pattern="[A-Z]{4}"
              required
              value={draft.subjectCode}
            />
          </Field>
          <Field label="Subject name">{textField("subjectName")}</Field>
          <Field label="Academic career">
            <Select
              aria-label="Academic career"
              onChange={(academicCareer) =>
                onDraftChange({
                  ...draft,
                  academicCareer: academicCareer || null,
                })
              }
              options={academicCareerOptions}
              value={draft.academicCareer ?? ""}
            />
          </Field>
          <Field label="School">{textField("school")}</Field>
          <Field label="College">{textField("college")}</Field>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-6">
        <h2 className="text-sm font-semibold text-zinc-950">
          Units and availability
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Unit value kind">
            <Select
              aria-label="Unit value kind"
              onChange={(unitValueKind) =>
                onDraftChange({ ...draft, unitValueKind })
              }
              options={[
                { value: "fixed", label: "Fixed" },
                { value: "range", label: "Range" },
                { value: "variable", label: "Variable options" },
                { value: "unknown", label: "Unknown" },
              ]}
              value={draft.unitValueKind}
            />
          </Field>
          <Field label="Fixed units">
            <Input
              min="0"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  units: nullableNumber(event.target.value),
                })
              }
              step="0.5"
              type="number"
              value={nullableInputValue(draft.units)}
            />
          </Field>
          <Field label="EFTSL">
            <Input
              min="0"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  eftsl: nullableNumber(event.target.value),
                })
              }
              step="0.00001"
              type="number"
              value={nullableInputValue(draft.eftsl)}
            />
          </Field>
          <Field label="Minimum units">
            <Input
              min="0"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  minimumUnits: nullableNumber(event.target.value),
                })
              }
              step="0.5"
              type="number"
              value={nullableInputValue(draft.minimumUnits)}
            />
          </Field>
          <Field label="Maximum units">
            <Input
              min="0"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  maximumUnits: nullableNumber(event.target.value),
                })
              }
              step="0.5"
              type="number"
              value={nullableInputValue(draft.maximumUnits)}
            />
          </Field>
          <Field label="Offering status">
            <Select
              aria-label="Offering status"
              onChange={(offeringStatus) =>
                onDraftChange({ ...draft, offeringStatus })
              }
              options={[
                { value: "offered", label: "Offered" },
                { value: "not_offered", label: "Not offered" },
                { value: "unknown", label: "Unknown" },
              ]}
              value={draft.offeringStatus}
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-6">
        <h2 className="text-sm font-semibold text-zinc-950">
          Teaching information
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Convenor">{textField("convenerText")}</Field>
          <Field label="Delivery summary">{textField("deliverySummary")}</Field>
          <Field className="sm:col-span-2" label="Introduction">
            {textField("introduction", { multiline: true })}
          </Field>
          <Field className="sm:col-span-2" label="Description">
            {textField("description", { multiline: true })}
          </Field>
          <Field className="sm:col-span-2" label="Workload">
            {textField("workloadText", { multiline: true })}
          </Field>
          <Field label="Workload hours">
            <Input
              min="0"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  workloadHours: nullableNumber(event.target.value),
                })
              }
              step="0.5"
              type="number"
              value={nullableInputValue(draft.workloadHours)}
            />
          </Field>
          <Field
            hint="This is source provenance and cannot be changed manually."
            label="Source updated"
          >
            <Input disabled value={formatDate(draft.sourceUpdatedAt)} />
          </Field>
          <Field className="sm:col-span-2" label="Inherent requirements">
            {textField("inherentRequirements", { multiline: true })}
          </Field>
          <Field className="sm:col-span-2" label="Prescribed texts">
            {textField("prescribedTexts", { multiline: true })}
          </Field>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">
              Advanced collections
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">
              This complete relational projection contains unit options, fees,
              areas, attributes, related courses, offerings and sessions,
              outcomes, assessments and rule trees. Keys and links are checked
              before the draft can be saved.
            </p>
          </div>
          <Badge tone={error ? "danger" : "success"}>
            {error ? "Invalid JSON" : "Structure valid"}
          </Badge>
        </div>
        <Field className="mt-4" label="Relational projection JSON">
          <Textarea
            aria-invalid={Boolean(error)}
            className="min-h-[34rem] font-mono text-xs leading-5"
            onChange={(event) => onCollectionsChange(event.target.value)}
            spellCheck={false}
            value={collectionsJson}
          />
        </Field>
        {error ? (
          <Alert className="mt-3" tone="danger">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : preview ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {collectionSummary(advancedCollections(preview)).map(
              ([label, count]) => (
                <div
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                  key={label}
                >
                  <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950 tabular-nums">
                    {count}
                  </p>
                </div>
              ),
            )}
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          disabled={saving || Boolean(error)}
          type="submit"
          variant="primary"
        >
          <Save aria-hidden="true" size={15} />
          {saving ? "Saving..." : "Save new draft snapshot"}
        </Button>
      </div>
    </form>
  );
}

function RequisitePanel({
  canEdit,
  empty,
  editing,
  kind,
  onCancelEdit,
  onEdit,
  onSave,
  projection,
}: {
  canEdit: boolean;
  empty: string;
  editing: boolean;
  kind:
    | "incompatibility"
    | "prerequisite"
    | "corequisite"
    | "permission"
    | "assumed_knowledge";
  onCancelEdit: () => void;
  onEdit: () => void;
  onSave: (projection: CourseSnapshotProjectionData) => Promise<void>;
  projection: CourseSnapshotProjectionData;
}) {
  const rules = projection.rules.filter((rule) => rule.ruleKind === kind);
  const ruleKeys = new Set(rules.map((rule) => rule.key));
  const relevantConditions = projection.ruleConditions.filter((condition) =>
    ruleKeys.has(condition.ruleKey),
  );
  const tree = {
    rules,
    groups: projection.ruleGroups.filter((group) =>
      ruleKeys.has(group.ruleKey),
    ),
    conditions: relevantConditions,
    courseSets: projection.ruleConditionCourses.filter((member) =>
      relevantConditions.some(
        (condition) => condition.key === member.conditionKey,
      ),
    ),
    courseReferences: projection.ruleCourseReferences.filter((reference) =>
      ruleKeys.has(reference.ruleKey),
    ),
  };
  return (
    <Panel label={readable(kind)}>
      {editing ? (
        <CourseSnapshotRuleEditor
          canEdit={canEdit}
          kind={kind}
          onCancel={onCancelEdit}
          onSave={onSave}
          projection={projection}
        />
      ) : rules.length ? (
        <>
          <div className="divide-y divide-zinc-100">
            {rules.map((rule) => (
              <div className="px-5 py-5 sm:px-6" key={rule.key}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-950">
                    {readable(rule.ruleKind)}
                  </h2>
                  <Badge
                    tone={rule.hardness === "hard" ? "warning" : "neutral"}
                  >
                    {readable(rule.hardness)}
                  </Badge>
                </div>
                <p className="mt-3 border-l-2 border-zinc-300 pl-4 text-sm leading-7 whitespace-pre-wrap text-zinc-700">
                  {rule.sourceText}
                </p>
              </div>
            ))}
          </div>
          <details className="border-t border-zinc-200">
            <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:px-6">
              Structured rule tree
            </summary>
            <JsonCode label={`${readable(kind)} rule tree`} value={tree} />
          </details>
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3 sm:px-6">
            <p className="text-xs text-zinc-500">
              Edit the source wording and complete relational tree together.
            </p>
            <Button disabled={!canEdit} onClick={onEdit} size="sm">
              <Pencil aria-hidden="true" size={14} /> Edit rule tree
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-7 sm:px-6">
          <p className="text-sm text-zinc-500">{empty}</p>
          <Button disabled={!canEdit} onClick={onEdit} size="sm">
            <Pencil aria-hidden="true" size={14} /> Add rule tree
          </Button>
        </div>
      )}
    </Panel>
  );
}

export function CourseReview({
  canWrite,
  previewCourse,
  record,
}: {
  canWrite: boolean;
  previewCourse: CourseDetails | null;
  record: AdminCourseYearRecord;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CourseReviewTab>("changes");
  const [editing, setEditing] = useState(false);
  const [editingRuleKind, setEditingRuleKind] =
    useState<EditableRuleKind | null>(null);
  const [draft, setDraft] = useState<SnapshotFields | null>(
    record.projection ? structuredClone(record.projection.snapshot) : null,
  );
  const [collectionsJson, setCollectionsJson] = useState(() =>
    record.projection ? collectionEditorValue(record.projection) : "{}",
  );
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmationNote, setConfirmationNote] = useState("");
  const [confirmationAcknowledged, setConfirmationAcknowledged] =
    useState(false);
  const [archiving, setArchiving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const projection = record.projection;
  const isActive = record.lifecycleStatus === "active";
  const viewingHistorical =
    record.currentSnapshotId !== null &&
    record.currentSnapshotId !== record.activeSnapshotId;
  const isDraft =
    record.draftSnapshotId !== null &&
    record.currentSnapshotId === record.draftSnapshotId;
  const canEdit =
    canWrite &&
    isActive &&
    !viewingHistorical &&
    projection !== null &&
    record.currentSnapshotId !== null;
  const canPublish =
    canWrite &&
    isActive &&
    isDraft &&
    record.snapshot?.sealed_at !== null &&
    !record.snapshot?.has_critical_uncertainty &&
    record.blockingReviewItems.length === 0;
  const needsExplicitConfirmation = Boolean(
    record.snapshot?.has_critical_uncertainty ||
    record.blockingReviewItems.length > 0,
  );
  const editorState = useMemo(() => {
    if (!draft) return { error: "No snapshot is available.", preview: null };
    try {
      return {
        error: null,
        preview: preparedProjection(record, draft, collectionsJson),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "The edit is invalid.",
        preview: null,
      };
    }
  }, [collectionsJson, draft, record]);
  const changes = projection
    ? projectionChanges(projection, record.publishedProjection)
    : [];

  function chooseYear(year: number) {
    router.push(`/admin/courses/${record.publicId}?year=${year}`);
  }

  function chooseSnapshot(snapshotId: number) {
    const suffix =
      snapshotId === record.activeSnapshotId ? "" : `&snapshot=${snapshotId}`;
    router.push(
      `/admin/courses/${record.publicId}?year=${record.year}${suffix}`,
    );
  }

  function startEditing() {
    if (!canEdit || !projection) return;
    setEditingRuleKind(null);
    setDraft(structuredClone(projection.snapshot));
    setCollectionsJson(collectionEditorValue(projection));
    setEditing(true);
    setActiveTab("fields");
    setMessage(null);
  }

  function cancelEditing() {
    if (projection) {
      setDraft(structuredClone(projection.snapshot));
      setCollectionsJson(collectionEditorValue(projection));
    }
    setEditing(false);
    setEditingRuleKind(null);
    setMessage(null);
  }

  function startRuleEditing(kind: EditableRuleKind) {
    if (!canEdit || !projection) return;
    setEditing(false);
    setEditingRuleKind(kind);
    setMessage(null);
  }

  async function saveRuleProjection(next: CourseSnapshotProjectionData) {
    if (record.currentSnapshotId === null) return;
    setSaving(true);
    setMessage(null);
    const result = await saveCourseSnapshot({
      coursePublicId: record.publicId,
      courseYearId: record.courseYearId,
      expectedBaseSnapshotId: record.currentSnapshotId,
      projection: next,
    });
    setSaving(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) {
      setEditingRuleKind(null);
      router.refresh();
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editorState.preview || record.currentSnapshotId === null) return;
    setSaving(true);
    setMessage(null);
    const result = await saveCourseSnapshot({
      coursePublicId: record.publicId,
      courseYearId: record.courseYearId,
      expectedBaseSnapshotId: record.currentSnapshotId,
      projection: editorState.preview,
    });
    setSaving(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  async function publish() {
    if (record.draftSnapshotId === null) return;
    setPublishing(true);
    setMessage(null);
    const result = await publishCourseSnapshot({
      code: record.code,
      coursePublicId: record.publicId,
      courseYearId: record.courseYearId,
      expectedPublishedSnapshotId: record.publishedSnapshotId,
      snapshotId: record.draftSnapshotId,
      year: record.year,
    });
    setPublishing(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) router.refresh();
  }

  async function confirmReviewedSnapshot() {
    if (
      !projection ||
      record.currentSnapshotId === null ||
      !confirmationAcknowledged ||
      !confirmationNote.trim()
    ) {
      return;
    }
    setConfirming(true);
    setMessage(null);
    const result = await confirmCourseSnapshot({
      blockingReviewItemIds: record.blockingReviewItems.map((item) => item.id),
      confirmationNote,
      coursePublicId: record.publicId,
      courseYearId: record.courseYearId,
      expectedBaseSnapshotId: record.currentSnapshotId,
      projection,
    });
    setConfirming(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) {
      setConfirmationAcknowledged(false);
      setConfirmationNote("");
      router.refresh();
    }
  }

  async function archive() {
    setArchiving(true);
    setMessage(null);
    const result = await archiveCourseYear({
      code: record.code,
      coursePublicId: record.publicId,
      courseYearId: record.courseYearId,
      expectedDraftSnapshotId: record.draftSnapshotId,
      expectedPublishedSnapshotId: record.publishedSnapshotId,
      year: record.year,
    });
    setArchiving(false);
    setMessage({
      text: result.message,
      tone: result.ok ? "success" : "danger",
    });
    if (result.ok) router.refresh();
  }

  return (
    <Tabs
      className="block"
      onValueChange={(value) => setActiveTab(value as CourseReviewTab)}
      value={activeTab}
    >
      <AppShell
        actions={
          <>
            {!editing ? (
              <Button
                disabled={!canEdit}
                onClick={startEditing}
                size="sm"
                title={
                  canEdit
                    ? "Create a new snapshot from the current course data"
                    : "An active snapshot and course write permission are required"
                }
              >
                <Pencil aria-hidden="true" size={15} /> Edit fields
              </Button>
            ) : null}
            {record.publishedSnapshotId ? (
              <ButtonLink
                href={`/courses/${record.code}?year=${record.year}`}
                size="sm"
              >
                <ExternalLink aria-hidden="true" size={15} /> Student page
              </ButtonLink>
            ) : null}
            {isDraft ? (
              <ConfirmDialog
                confirmLabel="Publish draft"
                description={`Publish snapshot ${record.draftSnapshotId} for ${record.code} ${record.year}. It will replace the student-facing snapshot for this year.`}
                onConfirm={publish}
                title={`Publish ${record.code} ${record.year}?`}
                trigger={
                  <Button
                    disabled={!canPublish || publishing}
                    size="sm"
                    title={
                      record.snapshot?.has_critical_uncertainty
                        ? "Critical uncertainty must be confirmed through a manual draft before publication"
                        : canPublish
                          ? "Publish the current draft"
                          : "A sealed current draft and course write permission are required"
                    }
                    variant="primary"
                  >
                    <Check aria-hidden="true" size={15} />
                    {publishing ? "Publishing..." : "Publish draft"}
                  </Button>
                }
              />
            ) : null}
            <ConfirmDialog
              confirmLabel="Archive course year"
              description={`Archive ${record.code} for ${record.year}. Students will no longer see it for this year, but every snapshot and source artefact will be kept.`}
              destructive
              onConfirm={archive}
              title={`Archive ${record.code} ${record.year}?`}
              trigger={
                <Button
                  disabled={!canWrite || !isActive || archiving}
                  size="sm"
                  variant="danger"
                >
                  <Archive aria-hidden="true" size={15} />
                  {archiving ? "Archiving..." : "Archive"}
                </Button>
              }
            />
          </>
        }
        admin
        currentBreadcrumbLabel={projection?.snapshot.title ?? record.code}
        tabs={<CourseReviewTabs />}
      >
        <div className="mx-auto w-full max-w-7xl min-w-0 pb-10">
          <h1 className="sr-only">
            Review {record.code} {projection?.snapshot.title}
          </h1>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="w-28">
              <Select
                aria-label="Academic year"
                onChange={chooseYear}
                options={record.availableYears.map((year) => ({
                  label: String(year.year),
                  value: year.year,
                }))}
                value={record.year}
              />
            </div>
            {record.snapshotHistory.length > 1 &&
            record.currentSnapshotId !== null ? (
              <div className="w-56">
                <Select
                  aria-label="Saved snapshot"
                  onChange={chooseSnapshot}
                  options={record.snapshotHistory.map((snapshot) => ({
                    label: `Snapshot ${snapshot.snapshotNumber} · ${readable(snapshot.origin)}`,
                    value: snapshot.id,
                  }))}
                  value={record.currentSnapshotId}
                />
              </div>
            ) : null}
            <Badge tone={isActive ? "success" : "neutral"}>
              {readable(record.lifecycleStatus)}
            </Badge>
            {isDraft ? <Badge tone="brand">Draft</Badge> : null}
            {viewingHistorical ? (
              <Badge tone="neutral">Historical snapshot</Badge>
            ) : null}
            {record.publishedSnapshotId ? (
              <Badge tone="success">Published snapshot available</Badge>
            ) : (
              <Badge tone="neutral">Not published</Badge>
            )}
            {record.snapshot?.overall_confidence !== null &&
            record.snapshot?.overall_confidence !== undefined ? (
              <Badge
                tone={
                  record.snapshot.overall_confidence >= 0.85
                    ? "success"
                    : "warning"
                }
              >
                {Math.round(record.snapshot.overall_confidence * 100)}%
                confidence
              </Badge>
            ) : null}
          </div>

          {message ? (
            <Alert className="mb-4" role="status" tone={message.tone}>
              {message.tone === "success" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}
          {!isActive ? (
            <Alert className="mb-4" tone="warning">
              <Archive aria-hidden="true" />
              <AlertDescription>
                This course year is archived. Its snapshots remain available for
                audit, but it cannot be edited or published.
              </AlertDescription>
            </Alert>
          ) : null}
          {viewingHistorical ? (
            <Alert className="mb-4" tone="neutral">
              <AlertDescription>
                You are inspecting an immutable historical snapshot. Select the
                active snapshot above to edit or publish.
              </AlertDescription>
            </Alert>
          ) : null}
          {record.snapshot?.has_critical_uncertainty ? (
            <Alert className="mb-4" tone="warning">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                This imported draft has critical uncertainty. Review every field
                against the source, then use the explicit confirmation action
                before publication.
              </AlertDescription>
            </Alert>
          ) : null}
          {needsExplicitConfirmation && isDraft && !viewingHistorical ? (
            <Panel label="Explicit review confirmation">
              <div className="border-b border-zinc-200 px-5 py-4 sm:px-6">
                <h2 className="text-sm font-semibold text-zinc-950">
                  Confirm the reviewed course
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Saving edits does not clear import uncertainty. Compare the
                  source and parsed result, resolve the exact blocking items
                  below, then record why this snapshot is authoritative.
                </p>
              </div>
              {record.blockingReviewItems.length > 0 ? (
                <ul className="divide-y divide-zinc-100">
                  {record.blockingReviewItems.map((item) => (
                    <li className="px-5 py-3 sm:px-6" key={item.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="warning">
                          {readable(item.importance)}
                        </Badge>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {item.field_path}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-800">
                        {item.summary}
                      </p>
                      {item.source_excerpt ? (
                        <p className="mt-1 border-l-2 border-zinc-200 pl-3 text-xs leading-5 text-zinc-500">
                          {item.source_excerpt}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-3 text-xs text-zinc-500 sm:px-6">
                  The snapshot is marked critically uncertain even though no
                  individual blocking row remains.
                </p>
              )}
              <div className="space-y-4 border-t border-zinc-200 px-5 py-4 sm:px-6">
                <Field
                  hint="For example: checked course page, fees, offerings and prerequisite logic against the saved source."
                  label="Confirmation note"
                >
                  <Textarea
                    className="min-h-24"
                    onChange={(event) =>
                      setConfirmationNote(event.target.value)
                    }
                    placeholder="Describe what you checked and any judgement applied."
                    value={confirmationNote}
                  />
                </Field>
                <label className="flex items-start gap-3 text-sm leading-5 text-zinc-700">
                  <Checkbox
                    checked={confirmationAcknowledged}
                    onCheckedChange={(checked) =>
                      setConfirmationAcknowledged(checked === true)
                    }
                  />
                  <span>
                    I checked the original source, the AI interpretation and
                    every blocking item shown above.
                  </span>
                </label>
                <div className="flex justify-end">
                  <Button
                    disabled={
                      !canWrite ||
                      confirming ||
                      !confirmationAcknowledged ||
                      !confirmationNote.trim()
                    }
                    onClick={() => void confirmReviewedSnapshot()}
                    variant="primary"
                  >
                    <CheckCircle2 aria-hidden="true" size={15} />
                    {confirming ? "Confirming..." : "Confirm reviewed snapshot"}
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}

          <TabsContent className="mt-0" value="changes">
            <Panel label="Snapshot changes">
              <div className="grid grid-cols-2 border-b border-zinc-200 sm:grid-cols-4">
                {[
                  ["Course year", String(record.year)],
                  [
                    "Snapshot",
                    record.snapshot
                      ? `${record.snapshot.snapshot_number} · ${readable(record.snapshot.origin)}`
                      : "None",
                  ],
                  [
                    "Validation",
                    record.snapshot
                      ? readable(record.snapshot.validation_status)
                      : "Not recorded",
                  ],
                  ["Changed sections", String(changes.length)],
                ].map(([label, value], index) => (
                  <div
                    className={`px-4 py-4 sm:px-6 ${index ? "border-l border-zinc-200" : ""}`}
                    key={label}
                  >
                    <p className="text-xs font-medium text-zinc-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-zinc-100 px-5 sm:px-6">
                {changes.length ? (
                  changes.map((change) => (
                    <div className="py-3 text-sm text-zinc-700" key={change}>
                      {change}
                    </div>
                  ))
                ) : (
                  <p className="py-7 text-sm text-zinc-500">
                    The draft matches the currently published projection.
                  </p>
                )}
              </div>
              {record.evidence.length ? (
                <details className="border-t border-zinc-200">
                  <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:px-6">
                    Field evidence ({record.evidence.length})
                  </summary>
                  <JsonCode
                    label="Snapshot field evidence"
                    value={record.evidence}
                  />
                </details>
              ) : null}
            </Panel>
          </TabsContent>

          <TabsContent className="mt-0" value="fields">
            <Panel label="All fields">
              {editing && draft ? (
                <SnapshotFieldsEditor
                  collectionsJson={collectionsJson}
                  draft={draft}
                  error={editorState.error}
                  onCancel={cancelEditing}
                  onCollectionsChange={setCollectionsJson}
                  onDraftChange={setDraft}
                  onSubmit={saveDraft}
                  preview={editorState.preview}
                  saving={saving}
                />
              ) : projection ? (
                <>
                  <div className="px-5 sm:px-6">
                    <dl>
                      <FieldValue label="Course code" value={record.code} />
                      <FieldValue
                        label="Title"
                        value={projection.snapshot.title}
                      />
                      <FieldValue label="Academic year" value={record.year} />
                      <FieldValue
                        label="Units"
                        value={
                          projection.snapshot.units ??
                          `${projection.snapshot.minimumUnits ?? "?"} to ${projection.snapshot.maximumUnits ?? "?"}`
                        }
                      />
                      <FieldValue
                        label="Subject"
                        value={`${projection.snapshot.subjectCode}${projection.snapshot.subjectName ? ` · ${projection.snapshot.subjectName}` : ""}`}
                      />
                      <FieldValue
                        label="Level"
                        value={projection.snapshot.level}
                      />
                      <FieldValue
                        label="School"
                        value={projection.snapshot.school}
                      />
                      <FieldValue
                        label="College"
                        value={projection.snapshot.college}
                      />
                      <FieldValue
                        label="Career"
                        value={projection.snapshot.academicCareer}
                      />
                      <FieldValue
                        label="Convenor"
                        value={projection.snapshot.convenerText}
                      />
                      <FieldValue
                        label="Delivery"
                        value={projection.snapshot.deliverySummary}
                      />
                      <FieldValue
                        label="Description"
                        value={projection.snapshot.description}
                      />
                      <FieldValue
                        label="Workload"
                        value={projection.snapshot.workloadText}
                      />
                      <FieldValue
                        label="Source updated"
                        value={formatDate(projection.snapshot.sourceUpdatedAt)}
                      />
                    </dl>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                      {collectionSummary(advancedCollections(projection)).map(
                        ([label, count]) => (
                          <Badge key={label} tone="neutral">
                            {count} {label.toLowerCase()}
                          </Badge>
                        ),
                      )}
                    </div>
                    <Button
                      disabled={!canEdit}
                      onClick={startEditing}
                      size="sm"
                    >
                      <Pencil aria-hidden="true" size={14} /> Edit complete
                      snapshot
                    </Button>
                  </div>
                </>
              ) : (
                <p className="px-5 py-8 text-sm text-zinc-500 sm:px-6">
                  This course year does not have a draft or published snapshot.
                </p>
              )}
            </Panel>
          </TabsContent>

          <TabsContent className="mt-0" value="source">
            <div className="space-y-4">
              <Panel label="Source">
                {record.sourcePage ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-6">
                      <div>
                        <h2 className="text-base font-semibold text-zinc-950">
                          ANU source page
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500">
                          Manual snapshots keep this immutable source reference.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {record.importTarget ? (
                          <ButtonLink
                            href={`/admin/imports/runs/${record.importTarget.runId}/targets/${record.importTarget.targetId}`}
                            size="sm"
                          >
                            <FileCode2 aria-hidden="true" size={15} /> Import
                            review
                          </ButtonLink>
                        ) : null}
                        <ButtonLink
                          href={record.sourcePage.canonical_url}
                          rel="noreferrer"
                          size="sm"
                          target="_blank"
                        >
                          <ExternalLink aria-hidden="true" size={15} /> Open ANU
                          page
                        </ButtonLink>
                      </div>
                    </div>
                    <div className="px-5 sm:px-6">
                      <dl>
                        <FieldValue
                          label="Retrieved"
                          value={formatDate(record.sourcePage.fetched_at)}
                        />
                        <FieldValue
                          label="Last modified"
                          value={formatDate(
                            record.sourcePage.source_last_modified,
                          )}
                        />
                        <FieldValue
                          label="Content hash"
                          value={
                            <span className="font-mono text-xs break-all">
                              {record.sourcePage.content_sha256}
                            </span>
                          }
                        />
                        <FieldValue
                          label="Canonical URL"
                          value={
                            <span className="break-all">
                              {record.sourcePage.canonical_url}
                            </span>
                          }
                        />
                      </dl>
                    </div>
                  </>
                ) : (
                  <p className="px-5 py-8 text-sm text-zinc-500 sm:px-6">
                    No immutable source page is attached to this snapshot.
                  </p>
                )}
              </Panel>
              {record.importTarget ? (
                <CourseImportArtifactViewer artifacts={record.artifacts} />
              ) : null}
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="parsed">
            <Panel label="Parsed output">
              <div className="flex items-center gap-2 px-5 py-4 sm:px-6">
                <FileCode2
                  aria-hidden="true"
                  className="text-zinc-400"
                  size={17}
                />
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">
                    Canonical relational projection
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Assembled from the saved snapshot and child rows, not an
                    import JSON blob.
                  </p>
                </div>
              </div>
              <JsonCode
                label="Canonical course projection"
                value={projection}
              />
            </Panel>
          </TabsContent>

          <TabsContent className="mt-0" value="prerequisites">
            {projection ? (
              <div className="space-y-4">
                <RequisitePanel
                  canEdit={canEdit}
                  empty="No prerequisite rules are stored for this snapshot."
                  editing={editingRuleKind === "prerequisite"}
                  kind="prerequisite"
                  onCancelEdit={() => setEditingRuleKind(null)}
                  onEdit={() => startRuleEditing("prerequisite")}
                  onSave={saveRuleProjection}
                  projection={projection}
                />
                <RequisitePanel
                  canEdit={canEdit}
                  empty="No corequisite rules are stored for this snapshot."
                  editing={editingRuleKind === "corequisite"}
                  kind="corequisite"
                  onCancelEdit={() => setEditingRuleKind(null)}
                  onEdit={() => startRuleEditing("corequisite")}
                  onSave={saveRuleProjection}
                  projection={projection}
                />
                <RequisitePanel
                  canEdit={canEdit}
                  empty="No permission rules are stored for this snapshot."
                  editing={editingRuleKind === "permission"}
                  kind="permission"
                  onCancelEdit={() => setEditingRuleKind(null)}
                  onEdit={() => startRuleEditing("permission")}
                  onSave={saveRuleProjection}
                  projection={projection}
                />
                <RequisitePanel
                  canEdit={canEdit}
                  empty="No assumed knowledge rules are stored for this snapshot."
                  editing={editingRuleKind === "assumed_knowledge"}
                  kind="assumed_knowledge"
                  onCancelEdit={() => setEditingRuleKind(null)}
                  onEdit={() => startRuleEditing("assumed_knowledge")}
                  onSave={saveRuleProjection}
                  projection={projection}
                />
              </div>
            ) : null}
          </TabsContent>

          <TabsContent className="mt-0" value="incompatibilities">
            {projection ? (
              <RequisitePanel
                canEdit={canEdit}
                empty="No incompatibility rules are stored for this snapshot."
                editing={editingRuleKind === "incompatibility"}
                kind="incompatibility"
                onCancelEdit={() => setEditingRuleKind(null)}
                onEdit={() => startRuleEditing("incompatibility")}
                onSave={saveRuleProjection}
                projection={projection}
              />
            ) : null}
          </TabsContent>

          <TabsContent className="mt-0" value="student">
            {previewCourse ? (
              <Tabs className="gap-0" defaultValue="overview">
                <div className="border-b border-zinc-200">
                  <CourseDetailTabsList />
                </div>
                <div className="pt-6">
                  <CourseDetailView
                    course={previewCourse}
                    fullWidth
                    requisiteCompletion={{
                      completedCourses: [],
                      isAuthenticated: false,
                    }}
                  />
                </div>
              </Tabs>
            ) : (
              <Panel label="Student preview">
                <p className="px-5 py-8 text-sm text-zinc-500 sm:px-6">
                  A snapshot is required before the student preview is
                  available.
                </p>
              </Panel>
            )}
          </TabsContent>
        </div>
      </AppShell>
    </Tabs>
  );
}
