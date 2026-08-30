"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  CircleAlert,
  Clock3,
  ExternalLink,
  Send,
  X,
} from "lucide-react";
import { AcademicStructureImportArtifactViewer } from "@/components/admin/imports/academic-structure-import-artifact-viewer";
import {
  AcademicStructureImportDatabaseRows,
  persistedAcademicStructureDatabaseTables,
} from "@/components/admin/imports/academic-structure-import-database-rows";
import { AcademicStructureImportPipeline } from "@/components/admin/imports/academic-structure-import-pipeline";
import { CourseImportAutoRefresh } from "@/components/admin/imports/course-import-auto-refresh";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";
import { adminAcademicStructureDetailPath } from "@/lib/coursemap/academic-structure-routes";
import {
  acceptAcademicStructureImportTarget,
  publishAcademicStructureDraft,
  rejectAcademicStructureImportTarget,
} from "@/lib/coursemap/academic-structure-import-review-actions";
import type { Tone } from "@/lib/ui";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function statusTone(status: string): Tone {
  if (
    status === "failed" ||
    status === "cancelled" ||
    status === "rejected" ||
    status === "error"
  ) {
    return "danger";
  }
  if (status === "queued" || status === "running") return "info";
  if (["needs_review", "unchanged", "pending", "warning"].includes(status)) {
    return "warning";
  }
  if (["accepted", "succeeded", "valid", "resolved"].includes(status)) {
    return "success";
  }
  return "neutral";
}

function displayValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-zinc-400">Not recorded</span>;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatFee(amount: number | null, currency: string | null) {
  if (amount === null) return "Amount not stated";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency ?? "AUD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function MetadataItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1 text-zinc-800">{displayValue(value)}</dd>
    </div>
  );
}

function RequirementTree({
  detail,
}: {
  detail: AcademicStructureImportTargetDetail;
}) {
  const groups = detail.relationalData.academic_structure_requirement_groups;
  const conditions =
    detail.relationalData.academic_structure_requirement_conditions;
  const options = detail.relationalData.academic_structure_requirement_options;
  const childrenByParent = new Map<number | null, typeof groups>();
  for (const group of groups) {
    childrenByParent.set(group.parent_group_id, [
      ...(childrenByParent.get(group.parent_group_id) ?? []),
      group,
    ]);
  }
  const conditionsByGroup = new Map<number, typeof conditions>();
  for (const condition of conditions) {
    conditionsByGroup.set(condition.requirement_group_id, [
      ...(conditionsByGroup.get(condition.requirement_group_id) ?? []),
      condition,
    ]);
  }
  const optionsByCondition = new Map<number, typeof options>();
  for (const option of options) {
    optionsByCondition.set(option.requirement_condition_id, [
      ...(optionsByCondition.get(option.requirement_condition_id) ?? []),
      option,
    ]);
  }

  function conditionSummary(condition: (typeof conditions)[number]): string {
    if (condition.condition_kind === "unit_total") {
      return `${condition.minimum_units ?? 0}${
        condition.maximum_units !== null &&
        condition.maximum_units !== condition.minimum_units
          ? ` to ${condition.maximum_units}`
          : ""
      } units`;
    }
    if (condition.condition_kind === "level") {
      return `Course level ${condition.minimum_level ?? "any"}${
        condition.maximum_level !== null
          ? ` to ${condition.maximum_level}`
          : " or above"
      }`;
    }
    if (condition.condition_kind === "subject") {
      return `${condition.subject_code ?? "Any"} subject courses`;
    }
    if (condition.condition_kind === "tag") {
      return condition.tag ?? "Tagged courses";
    }
    if (condition.condition_kind === "free_text") {
      return condition.free_text ?? "Unmodelled condition";
    }
    if (condition.condition_kind === "unrestricted") {
      return "Unrestricted electives";
    }
    return readable(condition.condition_kind);
  }

  function conditionUnits(condition: (typeof conditions)[number]) {
    if (
      condition.condition_kind === "unit_total" ||
      (condition.minimum_units === null && condition.maximum_units === null)
    ) {
      return null;
    }
    if (condition.minimum_units === condition.maximum_units) {
      return `${condition.minimum_units} units`;
    }
    if (condition.minimum_units !== null && condition.maximum_units !== null) {
      return `${condition.minimum_units} to ${condition.maximum_units} units`;
    }
    if (condition.minimum_units !== null) {
      return `At least ${condition.minimum_units} units`;
    }
    return `Up to ${condition.maximum_units} units`;
  }

  function Group({
    group,
    visited,
  }: {
    group: (typeof groups)[number];
    visited: ReadonlySet<number>;
  }) {
    if (visited.has(group.id)) {
      return (
        <Alert tone="danger">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            The saved requirement groups contain a cycle at {group.group_key}.
          </AlertDescription>
        </Alert>
      );
    }
    const nextVisited = new Set(visited).add(group.id);
    const childGroups = childrenByParent.get(group.id) ?? [];
    const groupConditions = conditionsByGroup.get(group.id) ?? [];
    const operator =
      group.operator === "all_of"
        ? "Complete all"
        : group.operator === "any_of"
          ? "Complete any one"
          : `Complete at least ${group.minimum_count ?? "the stated number"}`;

    return (
      <Card className="border-zinc-200 shadow-none">
        <CardHeader
          action={<Badge tone="neutral">{operator}</Badge>}
          description={group.description ?? undefined}
          title={group.title ?? "Requirement group"}
        />
        <CardContent className="space-y-3">
          {groupConditions.map((condition) => {
            const conditionOptions = optionsByCondition.get(condition.id) ?? [];
            const units = conditionUnits(condition);
            return (
              <div
                className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3"
                key={condition.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">
                    {readable(condition.condition_kind)}
                  </Badge>
                  <p className="text-xs font-medium text-zinc-900">
                    {conditionSummary(condition)}
                  </p>
                  {condition.minimum_courses ? (
                    <Badge tone="neutral">
                      At least {condition.minimum_courses} courses
                    </Badge>
                  ) : null}
                  {units ? <Badge tone="neutral">{units}</Badge> : null}
                </div>
                {conditionOptions.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {conditionOptions.map((option) => (
                      <Badge key={option.id} tone="neutral">
                        <span className="font-mono">{option.option_code}</span>
                        {option.structure_kind
                          ? ` · ${readable(option.structure_kind)}`
                          : ""}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <details className="mt-2 text-xs text-zinc-500">
                  <summary className="min-h-8 cursor-pointer py-1 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none">
                    Source wording
                  </summary>
                  <blockquote className="border-l-2 border-zinc-300 pl-3 leading-5 whitespace-pre-wrap">
                    {condition.source_text}
                  </blockquote>
                  <p className="mt-1 font-mono text-[10px]">
                    {condition.source_locator}
                  </p>
                </details>
              </div>
            );
          })}
          {childGroups.map((child) => (
            <Group group={child} key={child.id} visited={nextVisited} />
          ))}
        </CardContent>
      </Card>
    );
  }

  const roots = childrenByParent.get(null) ?? [];
  const unmodelled =
    detail.relationalData.academic_structure_unmodelled_requirements;
  if (roots.length === 0 && unmodelled.length === 0) {
    return (
      <DataTableShell>
        <DataTableEmpty
          description="No requirement tree or preserved unmodelled wording was saved."
          title="No requirements recorded"
        />
      </DataTableShell>
    );
  }

  return (
    <div className="space-y-3">
      {roots.map((root) => (
        <Group group={root} key={root.id} visited={new Set()} />
      ))}
      {unmodelled.length ? (
        <Alert tone="warning">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            <p className="font-medium">
              {unmodelled.length} requirement passage
              {unmodelled.length === 1 ? "" : "s"} preserved without an invented
              rule
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {unmodelled.map((item) => (
                <li key={item.id}>{item.source_text}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function CandidatePreview({
  detail,
}: {
  detail: AcademicStructureImportTargetDetail;
}) {
  const snapshot = detail.candidateSnapshot;
  if (!snapshot) {
    return (
      <DataTableShell>
        <DataTableEmpty
          description="The candidate preview appears after a snapshot has been persisted."
          title="No candidate snapshot"
        />
      </DataTableShell>
    );
  }
  const fields = detail.relationalData.academic_structure_summary_fields;
  const sections = detail.relationalData.academic_structure_snapshot_sections;
  const outcomes = detail.relationalData.academic_structure_learning_outcomes;
  const fees = detail.relationalData.academic_structure_fees;
  const relationships =
    detail.relationalData.academic_structure_snapshot_relationships;
  const evidence = detail.relationalData.academic_structure_snapshot_evidence;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          action={
            <div className="flex flex-wrap gap-1.5">
              <Badge
                tone={snapshot.critical_uncertainty ? "warning" : "success"}
              >
                {snapshot.critical_uncertainty
                  ? "Critical uncertainty"
                  : "No critical uncertainty"}
              </Badge>
              {snapshot.overall_confidence !== null ? (
                <Badge
                  tone={snapshot.critical_uncertainty ? "warning" : "brand"}
                >
                  {Math.round(snapshot.overall_confidence * 100)}% confidence
                </Badge>
              ) : null}
            </div>
          }
          description={`${readable(detail.run.structureKind)} · ${detail.run.academicYear}`}
          title={snapshot.name}
        />
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <MetadataItem label="Code" value={detail.target.code} />
            <MetadataItem label="Acronym" value={snapshot.acronym} />
            <MetadataItem label="Units" value={snapshot.units} />
            <MetadataItem label="Duration" value={snapshot.duration_years} />
            <MetadataItem
              label="Academic career"
              value={snapshot.academic_career}
            />
            <MetadataItem label="College" value={snapshot.college} />
            <MetadataItem label="Delivery" value={snapshot.mode_of_delivery} />
            <MetadataItem
              label="Selection rank"
              value={snapshot.selection_rank}
            />
            <MetadataItem label="ATAR" value={snapshot.atar} />
            <MetadataItem label="Study as" value={snapshot.study_as} />
            <MetadataItem label="Can combine" value={snapshot.can_combine} />
            <MetadataItem
              label="Vertical combination"
              value={snapshot.can_combine_vertical}
            />
          </dl>
          {snapshot.introduction ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">Introduction</p>
              <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-zinc-700">
                {snapshot.introduction}
              </p>
            </div>
          ) : null}
          {snapshot.description ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">Description</p>
              <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-zinc-700">
                {snapshot.description}
              </p>
            </div>
          ) : null}
          {snapshot.contact_text ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">Contact</p>
              <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-700">
                {snapshot.contact_text}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {fields.length ? (
        <Card>
          <CardHeader
            description="All labelled values retained from the ANU summary."
            title="Source summary"
          />
          <CardContent>
            <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((item) => (
                <div key={item.id}>
                  <dt className="text-zinc-500">{item.label}</dt>
                  <dd className="mt-1 text-zinc-800">{item.field_value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {sections.length ? (
        <section className="space-y-3" aria-labelledby="candidate-sections">
          <h2
            className="text-sm font-semibold text-zinc-950"
            id="candidate-sections"
          >
            Page sections
          </h2>
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader
                description={
                  <span className="font-mono">{section.source_locator}</span>
                }
                title={section.heading}
              />
              <CardContent>
                <pre className="overflow-auto text-sm leading-6 whitespace-pre-wrap text-zinc-700">
                  {section.markdown}
                </pre>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {outcomes.length ? (
        <Card>
          <CardHeader title="Learning outcomes" />
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-700">
              {outcomes.map((outcome) => (
                <li key={outcome.id}>{outcome.outcome_text}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3" aria-labelledby="candidate-requirements">
        <h2
          className="text-sm font-semibold text-zinc-950"
          id="candidate-requirements"
        >
          Requirements
        </h2>
        <RequirementTree detail={detail} />
      </section>

      <section className="space-y-3" aria-labelledby="candidate-fees">
        <h2 className="text-sm font-semibold text-zinc-950" id="candidate-fees">
          Fees
        </h2>
        {fees.length ? (
          <DataTableShell>
            <Table className="min-w-[780px]">
              <TableCaption>Imported fee records</TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Audience</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell>{readable(fee.audience)}</TableCell>
                    <TableCell>{readable(fee.fee_type)}</TableCell>
                    <TableCell className="tabular-nums">
                      {fee.fee_year ?? "Not stated"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatFee(fee.amount, fee.currency)}
                    </TableCell>
                    <TableCell>{readable(fee.basis)}</TableCell>
                    <TableCell className="max-w-72 text-xs text-zinc-600">
                      {fee.source_label ?? fee.source_text}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        ) : (
          <DataTableShell>
            <DataTableEmpty
              description="No relational fee was parsed. Check the source summary and artefacts for fee wording."
              title="No fee rows"
            />
          </DataTableShell>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="candidate-relationships">
        <h2
          className="text-sm font-semibold text-zinc-950"
          id="candidate-relationships"
        >
          Relationships
        </h2>
        {relationships.length ? (
          <DataTableShell>
            <Table className="min-w-[720px]">
              <TableCaption>
                Imported academic structure relationships
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Relationship</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationships.map((relationship) => (
                  <TableRow key={relationship.id}>
                    <TableCell>
                      {readable(relationship.relationship_kind)}
                    </TableCell>
                    <TableCell>{readable(relationship.target_kind)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {relationship.target_code}
                    </TableCell>
                    <TableCell>
                      {relationship.target_title ?? "Not recorded"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        ) : (
          <DataTableShell>
            <DataTableEmpty title="No relationships recorded" />
          </DataTableShell>
        )}
      </section>

      {evidence.length ? (
        <details className="group rounded-xl border border-zinc-200 bg-white shadow-xs">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-zinc-950 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none">
            Evidence and confidence
            <Badge tone="neutral">{evidence.length} records</Badge>
          </summary>
          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {evidence.map((item) => (
              <div className="p-4 text-xs" key={item.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-medium text-zinc-800">
                    {item.field_key}
                  </span>
                  <Badge tone="neutral">{item.method}</Badge>
                  <Badge tone="brand">
                    {Math.round(item.confidence * 100)}%
                  </Badge>
                </div>
                <blockquote className="mt-2 border-l-2 border-zinc-300 pl-3 leading-5 text-zinc-600">
                  {item.evidence_excerpt}
                </blockquote>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ReviewItems({
  detail,
}: {
  detail: AcademicStructureImportTargetDetail;
}) {
  const items = useMemo(
    () =>
      [...detail.reviewItems].sort((left, right) => {
        const rank = { error: 0, warning: 1, info: 2 } as const;
        return (
          (rank[left.severity as keyof typeof rank] ?? 3) -
          (rank[right.severity as keyof typeof rank] ?? 3)
        );
      }),
    [detail.reviewItems],
  );
  const previous = detail.previousSnapshot;
  const candidate = detail.candidateSnapshot;
  const snapshotFields = [
    ["Name", previous?.row.name, candidate?.name],
    ["Units", previous?.row.units, candidate?.units],
    ["Duration", previous?.row.duration_years, candidate?.duration_years],
    [
      "Academic career",
      previous?.row.academic_career,
      candidate?.academic_career,
    ],
    ["College", previous?.row.college, candidate?.college],
    ["Delivery", previous?.row.mode_of_delivery, candidate?.mode_of_delivery],
    ["Selection rank", previous?.row.selection_rank, candidate?.selection_rank],
  ].filter(([, before, after]) => before !== after);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Decision context" />
        <CardContent>
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <MetadataItem
              label="Persistence result"
              value={
                detail.target.changeKind
                  ? readable(detail.target.changeKind)
                  : null
              }
            />
            <MetadataItem
              label="Compared with"
              value={detail.previousSnapshot?.label ?? "No saved snapshot"}
            />
            <MetadataItem
              label="Candidate snapshot"
              value={detail.target.candidateSnapshotId}
            />
            <MetadataItem
              label="Current draft"
              value={detail.target.currentDraftSnapshotId}
            />
          </dl>
        </CardContent>
      </Card>

      {snapshotFields.length ? (
        <Card>
          <CardHeader
            description="A compact comparison of the main snapshot fields. Full relational data is in Candidate and Database rows."
            title="Changed snapshot fields"
          />
          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {snapshotFields.map(([label, before, after]) => (
              <div
                className="grid gap-2 px-5 py-3 text-xs sm:grid-cols-[10rem_1fr_1fr]"
                key={String(label)}
              >
                <span className="font-medium text-zinc-800">{label}</span>
                <span className="text-zinc-500">
                  Before: {displayValue(before)}
                </span>
                <span className="text-zinc-800">
                  Candidate: {displayValue(after)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="space-y-3" aria-labelledby="review-items-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            className="text-sm font-semibold text-zinc-950"
            id="review-items-title"
          >
            Review items
          </h2>
          <Badge
            tone={
              items.some((item) => item.status === "open")
                ? "warning"
                : "neutral"
            }
          >
            {items.filter((item) => item.status === "open").length} open
          </Badge>
        </div>
        {items.length === 0 ? (
          <DataTableShell>
            <DataTableEmpty
              description="The import recorded no ambiguity, conflict or validation warning. Administrator acceptance is still required."
              title="No review items"
            />
          </DataTableShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            {items.map((item) => (
              <details
                className="group border-b border-zinc-100 last:border-b-0"
                key={item.id}
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-zinc-900">
                      {item.message}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
                      {item.field_key === "$" ? "Whole import" : item.field_key}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    <Badge tone={statusTone(item.severity)}>
                      {readable(item.severity)}
                    </Badge>
                    <Badge tone={statusTone(item.status)}>
                      {readable(item.status)}
                    </Badge>
                  </span>
                </summary>
                <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 text-xs leading-5 text-zinc-600">
                  <p>Kind: {readable(item.item_kind)}</p>
                  {item.source_text ? (
                    <blockquote className="mt-2 border-l-2 border-zinc-300 pl-3 whitespace-pre-wrap">
                      {item.source_text}
                    </blockquote>
                  ) : null}
                  {item.resolution_note ? (
                    <p className="mt-2">
                      <span className="font-medium text-zinc-800">
                        Resolution:
                      </span>{" "}
                      {item.resolution_note}
                    </p>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function AcademicStructureImportTargetReview({
  canPublish: canPublishCatalogue,
  detail,
}: {
  canPublish: boolean;
  detail: AcademicStructureImportTargetDetail;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const active = ["queued", "running"].includes(detail.target.processingStatus);
  const canDecide =
    detail.target.processingStatus === "succeeded" &&
    ["needs_review", "unchanged"].includes(detail.target.reviewStatus);
  const accepted = detail.target.reviewStatus === "accepted";
  const currentDraftSnapshotId = detail.target.currentDraftSnapshotId;
  const alreadyPublished =
    currentDraftSnapshotId !== null &&
    currentDraftSnapshotId === detail.target.currentPublishedSnapshotId;
  const openErrors = detail.reviewItems.filter(
    (item) => item.status === "open" && item.severity === "error",
  ).length;
  const publicationBlocked =
    openErrors > 0 ||
    detail.candidateSnapshot?.critical_uncertainty === true ||
    detail.candidateSnapshot?.confirmation_status === "required";
  const canPublish =
    canPublishCatalogue &&
    accepted &&
    !alreadyPublished &&
    !publicationBlocked &&
    detail.target.structureYearId !== null &&
    currentDraftSnapshotId !== null;
  const workspaceHref = detail.target.structurePublicId
    ? adminAcademicStructureDetailPath({
        kind: detail.run.structureKind,
        publicId: detail.target.structurePublicId,
        year: detail.run.academicYear,
      })
    : null;

  async function decide(decision: "accept" | "reject") {
    const action =
      decision === "accept"
        ? acceptAcademicStructureImportTarget
        : rejectAcademicStructureImportTarget;
    const result = await action({
      runId: detail.run.id,
      targetId: detail.target.id,
      reviewNote: "",
    });
    setMessage({
      tone: result.ok ? "success" : "danger",
      text: result.message,
    });
    if (result.ok) router.refresh();
  }

  async function publish() {
    if (
      detail.target.structureYearId === null ||
      currentDraftSnapshotId === null
    ) {
      return;
    }
    const result = await publishAcademicStructureDraft({
      runId: detail.run.id,
      targetId: detail.target.id,
      structureYearId: detail.target.structureYearId,
      snapshotId: currentDraftSnapshotId,
    });
    setMessage({
      tone: result.ok ? "success" : "danger",
      text: result.message,
    });
    if (result.ok) router.refresh();
  }

  return (
    <AppShell
      actions={
        canDecide || accepted ? (
          <div className="flex flex-wrap items-center gap-2">
            {canDecide ? (
              <>
                <ConfirmDialog
                  confirmLabel="Reject candidate"
                  description="The imported snapshot stays in the audit history. The current draft and published structure do not change."
                  destructive
                  onConfirm={() => decide("reject")}
                  title={`Reject ${detail.target.code}?`}
                  trigger={
                    <Button size="sm" variant="danger">
                      <X aria-hidden="true" size={15} />
                      Reject
                    </Button>
                  }
                />
                <ConfirmDialog
                  confirmLabel="Accept as draft"
                  description="This makes the candidate the current draft. Students will not see it until you publish it separately."
                  onConfirm={() => decide("accept")}
                  title={`Accept ${detail.target.code} as draft?`}
                  trigger={
                    <Button size="sm" variant="primary">
                      <Check aria-hidden="true" size={15} />
                      Accept as draft
                    </Button>
                  }
                />
              </>
            ) : null}
            {accepted && workspaceHref ? (
              <ButtonLink href={workspaceHref} size="sm">
                <ExternalLink aria-hidden="true" size={15} />
                Edit draft
              </ButtonLink>
            ) : null}
            {canPublish ? (
              <ConfirmDialog
                confirmLabel="Publish draft"
                description="This is a separate publication action. It makes the exact current draft visible to student-facing catalogue reads."
                onConfirm={publish}
                title={`Publish ${detail.target.code} for ${detail.run.academicYear}?`}
                trigger={
                  <Button size="sm" variant="primary">
                    <Send aria-hidden="true" size={15} />
                    Publish draft
                  </Button>
                }
              />
            ) : accepted && !alreadyPublished && canPublishCatalogue ? (
              <Button
                disabled
                size="sm"
                title={
                  publicationBlocked
                    ? "Resolve blocking review items and critical uncertainty first"
                    : "The current draft is unavailable"
                }
              >
                <Send aria-hidden="true" size={15} />
                Publish draft
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
      admin
      breadcrumbSegmentLabels={{
        structures: "Structures",
        [detail.run.id]: `Run #${detail.run.runNumber}`,
        targets: null,
      }}
      currentBreadcrumbLabel={detail.target.code}
    >
      <CourseImportAutoRefresh active={active} />
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
        <h1 className="sr-only">Review {detail.target.code} import</h1>

        <header className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-lg font-semibold text-zinc-950">
            {detail.target.code}
          </span>
          {detail.target.title ? (
            <span className="text-sm text-zinc-600">{detail.target.title}</span>
          ) : null}
          <Badge tone="neutral">{detail.run.academicYear}</Badge>
          <Badge tone="neutral">Run #{detail.run.runNumber}</Badge>
          <Badge tone={statusTone(detail.target.processingStatus)}>
            {readable(detail.target.processingStatus)}
          </Badge>
          <Badge tone={statusTone(detail.target.reviewStatus)}>
            {readable(detail.target.reviewStatus)}
          </Badge>
          {alreadyPublished ? <Badge tone="success">Published</Badge> : null}
        </header>

        {message ? (
          <Alert tone={message.tone}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        {detail.target.errorSummary ? (
          <Alert tone="danger">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              {detail.target.errorCode ? `${detail.target.errorCode}: ` : ""}
              {detail.target.errorSummary}
            </AlertDescription>
          </Alert>
        ) : null}
        {active ? (
          <Alert tone="brand">
            <Clock3 aria-hidden="true" />
            <AlertDescription>
              This structure is still processing. Saved stages and artefacts
              update automatically.
            </AlertDescription>
          </Alert>
        ) : null}
        {openErrors || detail.candidateSnapshot?.critical_uncertainty ? (
          <Alert tone="warning">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              Review the open errors and critical uncertainty before
              publication. You can still accept the candidate as a draft and
              edit it in the structure workspace.
            </AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="pipeline">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-max">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="candidate">Candidate</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
              <TabsTrigger value="source">Source and artefacts</TabsTrigger>
              <TabsTrigger value="database">Database rows</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pipeline">
            <AcademicStructureImportPipeline
              extractions={detail.extractions}
              stages={detail.stages}
            />
          </TabsContent>
          <TabsContent value="candidate">
            <CandidatePreview detail={detail} />
          </TabsContent>
          <TabsContent value="review">
            <ReviewItems detail={detail} />
          </TabsContent>
          <TabsContent value="source">
            <div className="space-y-4">
              {detail.sourcePage ? (
                <dl className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-zinc-500">ANU page</dt>
                    <dd className="mt-1 break-all">
                      <a
                        className="text-brand-700 underline underline-offset-2"
                        href={detail.sourcePage.canonical_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {detail.sourcePage.canonical_url}
                      </a>
                    </dd>
                  </div>
                  <MetadataItem
                    label="Fetched"
                    value={dateFormatter.format(
                      new Date(detail.sourcePage.fetched_at),
                    )}
                  />
                  <MetadataItem
                    label="HTTP status"
                    value={detail.sourcePage.http_status}
                  />
                  <div>
                    <dt className="text-zinc-500">Source hash</dt>
                    <dd
                      className="mt-1 truncate font-mono text-zinc-800"
                      title={detail.sourcePage.content_sha256}
                    >
                      {detail.sourcePage.content_sha256}
                    </dd>
                  </div>
                </dl>
              ) : null}
              <AcademicStructureImportArtifactViewer
                artifacts={detail.artifacts}
              />
            </div>
          </TabsContent>
          <TabsContent value="database">
            {detail.candidateSnapshot ? (
              <div className="space-y-3">
                <p className="text-xs leading-5 text-zinc-600">
                  These are the exact candidate and review rows saved in
                  Postgres, grouped by their real destination table names.
                </p>
                <AcademicStructureImportDatabaseRows
                  emptyLabel="0 rows"
                  tables={persistedAcademicStructureDatabaseTables(
                    detail.relationalData,
                  )}
                />
              </div>
            ) : (
              <DataTableShell>
                <DataTableEmpty
                  description="Database rows appear after the candidate snapshot is saved."
                  title="No candidate rows"
                />
              </DataTableShell>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
