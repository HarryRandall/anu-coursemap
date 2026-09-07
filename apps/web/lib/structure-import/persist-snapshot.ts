import type postgres from "postgres";
import { stableFingerprint } from "../course-import/canonical.ts";
import type { AcademicStructureExtraction } from "./contract.ts";
import {
  AcademicStructureImportStoreError,
  type AcademicStructureImportLeaseFence,
  type AcademicStructureImportSql,
  type ClaimedAcademicStructureImportTarget,
} from "./import-store.ts";
/*
 * The lease fence is checked and locked before any identity or snapshot rows
 * are touched. This keeps an expired worker from writing after another queue
 * delivery has recovered the target.
 */
type SnapshotPersistenceLeaseFence = Omit<
  AcademicStructureImportLeaseFence,
  "targetId"
>;
import type { AcademicStructureSnapshotProjection } from "./project-snapshot.ts";

type SnapshotChangeKind = "new" | "changed" | "unchanged";

export type PersistedAcademicStructureSnapshotCandidate = {
  changeKind: SnapshotChangeKind;
  structureId: number;
  structureYearId: number;
  candidateSnapshotId: number | null;
  changeSet: {
    changeKind: SnapshotChangeKind;
    semanticHash: string;
    projectionSha256: string;
    capturedDraftSnapshotId: number | null;
    capturedPublishedSnapshotId: number | null;
    currentDraftSnapshotId: number | null;
    currentPublishedSnapshotId: number | null;
    comparedSnapshotId: number | null;
    comparedSemanticHash: string | null;
    baselineChangedDuringImport: boolean;
    candidateSnapshotId: number | null;
    reusedCandidate: boolean;
    requiresManualReview: boolean;
  };
};

function requiredMapValue<K>(
  map: ReadonlyMap<K, number>,
  key: K,
  label: string,
) {
  const value = map.get(key);
  if (value === undefined) throw new Error(`${label} was not resolved.`);
  return value;
}

function verifyProjectionFingerprint(
  projection: AcademicStructureSnapshotProjection,
) {
  const { projectionSha256, ...content } = projection;
  if (stableFingerprint(content) !== projectionSha256) {
    throw new TypeError(
      "The academic structure projection fingerprint is invalid.",
    );
  }
}

function withoutSourceMetadata(value: Record<string, unknown>) {
  const output = { ...value };
  delete output.sourceText;
  delete output.sourceLocator;
  return output;
}

function canonicalReference(
  references: ReadonlyMap<string, string>,
  key: string,
  label: string,
) {
  const reference = references.get(key);
  if (!reference) {
    throw new TypeError(`${label} does not reference a projected row.`);
  }
  return reference;
}

function semanticProjection(projection: AcademicStructureSnapshotProjection) {
  const groupReferences = new Map(
    projection.requirementGroups.map((group, index) => [
      group.key,
      `group:${index + 1}`,
    ]),
  );
  const conditionReferences = new Map(
    projection.requirementConditions.map((condition, index) => [
      condition.key,
      `condition:${index + 1}`,
    ]),
  );
  if (groupReferences.size !== projection.requirementGroups.length) {
    throw new TypeError("Projected requirement group keys must be unique.");
  }
  if (conditionReferences.size !== projection.requirementConditions.length) {
    throw new TypeError("Projected requirement condition keys must be unique.");
  }
  if (
    (projection.requirementRootKey === null) !==
    (projection.requirementGroups.length === 0)
  ) {
    throw new TypeError(
      "The projected requirement root does not match its requirement rows.",
    );
  }

  const snapshot = {
    title: projection.snapshot.title,
    acronym: projection.snapshot.acronym,
    shortName: projection.snapshot.shortName,
    introduction: projection.snapshot.introduction,
    description: projection.snapshot.description,
    totalUnits: projection.snapshot.totalUnits,
    durationYears: projection.snapshot.durationYears,
    academicCareer: projection.snapshot.academicCareer,
    college: projection.snapshot.college,
    deliveryMode: projection.snapshot.deliveryMode,
    selectionRank: projection.snapshot.selectionRank,
    atar: projection.snapshot.atar,
    canCombine: projection.snapshot.canCombine,
    canCombineVertical: projection.snapshot.canCombineVertical,
    studyAs: projection.snapshot.studyAs,
    contactText: projection.snapshot.contactText,
  };
  return {
    schemaVersion: projection.schemaVersion,
    structureKind: projection.structureKind,
    structureCode: projection.structureCode,
    academicYear: projection.academicYear,
    snapshot,
    summaryFields: projection.summaryFields.map((field) =>
      withoutSourceMetadata(field),
    ),
    sections: projection.sections.map((section) =>
      withoutSourceMetadata(section),
    ),
    learningOutcomes: projection.learningOutcomes.map((outcome) =>
      withoutSourceMetadata(outcome),
    ),
    fees: projection.fees.map((fee) => withoutSourceMetadata(fee)),
    relationships: projection.relationships.map((relationship) =>
      withoutSourceMetadata(relationship),
    ),
    requirementRootKey:
      projection.requirementRootKey === null
        ? null
        : canonicalReference(
            groupReferences,
            projection.requirementRootKey,
            "Requirement root",
          ),
    requirementGroups: projection.requirementGroups.map((group) => ({
      ...withoutSourceMetadata(group),
      key: canonicalReference(groupReferences, group.key, "Requirement group"),
      parentGroupKey:
        group.parentGroupKey === null
          ? null
          : canonicalReference(
              groupReferences,
              group.parentGroupKey,
              "Parent requirement group",
            ),
    })),
    requirementConditions: projection.requirementConditions.map(
      (condition) => ({
        ...withoutSourceMetadata(condition),
        key: canonicalReference(
          conditionReferences,
          condition.key,
          "Requirement condition",
        ),
        groupKey: canonicalReference(
          groupReferences,
          condition.groupKey,
          "Requirement condition group",
        ),
      }),
    ),
    requirementOptions: projection.requirementOptions.map((option) => ({
      ...option,
      conditionKey: canonicalReference(
        conditionReferences,
        option.conditionKey,
        "Requirement option condition",
      ),
    })),
    unmodelledRequirements: projection.unmodelledRequirements.map((item) => ({
      position: item.position,
      sourceText: item.sourceText,
    })),
  };
}

/**
 * Excludes extraction evidence and review metadata so a model wording change
 * cannot create a new academic structure snapshot when the canonical rows are
 * otherwise identical.
 */
export function academicStructureSemanticHash(
  projection: AcademicStructureSnapshotProjection,
) {
  verifyProjectionFingerprint(projection);
  return stableFingerprint(semanticProjection(projection));
}

function makeChangeSet({
  changeKind,
  semanticHash,
  projection,
  claim,
  currentDraftSnapshotId,
  currentPublishedSnapshotId,
  comparedSnapshotId,
  comparedSemanticHash,
  candidateSnapshotId,
  reusedCandidate,
}: {
  changeKind: SnapshotChangeKind;
  semanticHash: string;
  projection: AcademicStructureSnapshotProjection;
  claim: ClaimedAcademicStructureImportTarget;
  currentDraftSnapshotId: number | null;
  currentPublishedSnapshotId: number | null;
  comparedSnapshotId: number | null;
  comparedSemanticHash: string | null;
  candidateSnapshotId: number | null;
  reusedCandidate: boolean;
}) {
  const baselineChangedDuringImport =
    claim.baselineDraftSnapshotId !== currentDraftSnapshotId ||
    claim.baselinePublishedSnapshotId !== currentPublishedSnapshotId;
  return {
    changeKind,
    semanticHash,
    projectionSha256: projection.projectionSha256,
    capturedDraftSnapshotId: claim.baselineDraftSnapshotId,
    capturedPublishedSnapshotId: claim.baselinePublishedSnapshotId,
    currentDraftSnapshotId,
    currentPublishedSnapshotId,
    comparedSnapshotId,
    comparedSemanticHash,
    baselineChangedDuringImport,
    candidateSnapshotId,
    reusedCandidate,
    requiresManualReview: true,
  };
}

async function insertReviewItem(
  tx: postgres.TransactionSql,
  {
    targetId,
    snapshotId,
    fieldKey,
    itemKind,
    severity,
    message,
    sourceText,
  }: {
    targetId: string;
    snapshotId: number;
    fieldKey: string;
    itemKind:
      | "missing"
      | "ambiguous"
      | "conflict"
      | "unsupported"
      | "invalid"
      | "evidence_missing"
      | "manual_review";
    severity: "info" | "warning" | "error";
    message: string;
    sourceText: string | null;
  },
) {
  await tx`
    insert into public.academic_structure_review_items (
      target_id,
      snapshot_id,
      field_key,
      item_kind,
      severity,
      message,
      source_text
    )
    select
      ${targetId},
      ${snapshotId},
      ${fieldKey},
      ${itemKind},
      ${severity},
      ${message},
      ${sourceText}
    where not exists (
      select 1
      from public.academic_structure_review_items
      where target_id = ${targetId}
        and snapshot_id = ${snapshotId}
        and field_key = ${fieldKey}
        and item_kind = ${itemKind}
        and message = ${message}
    )
  `;
}

async function recordCandidateReviewItems(
  tx: postgres.TransactionSql,
  {
    claim,
    candidateSnapshotId,
    semanticHash,
    extraction,
    currentDraftSnapshotId,
    currentPublishedSnapshotId,
  }: {
    claim: ClaimedAcademicStructureImportTarget;
    candidateSnapshotId: number;
    semanticHash: string;
    extraction: AcademicStructureExtraction;
    currentDraftSnapshotId: number | null;
    currentPublishedSnapshotId: number | null;
  },
) {
  await insertReviewItem(tx, {
    targetId: claim.targetId,
    snapshotId: candidateSnapshotId,
    fieldKey: "$",
    itemKind: "manual_review",
    severity: "warning",
    message: "Review every imported field before accepting this snapshot.",
    sourceText: semanticHash,
  });

  const baselineChangedDuringImport =
    claim.baselineDraftSnapshotId !== currentDraftSnapshotId ||
    claim.baselinePublishedSnapshotId !== currentPublishedSnapshotId;
  if (baselineChangedDuringImport) {
    await insertReviewItem(tx, {
      targetId: claim.targetId,
      snapshotId: candidateSnapshotId,
      fieldKey: "snapshotPointers",
      itemKind: "conflict",
      severity: "error",
      message:
        "The draft or published snapshot changed while this import was running.",
      sourceText: null,
    });
  }

  for (const review of extraction.reviewItems) {
    const evidence = extraction.evidence.find(
      ({ fieldKey }) => fieldKey === review.fieldKey,
    );
    await insertReviewItem(tx, {
      targetId: claim.targetId,
      snapshotId: candidateSnapshotId,
      fieldKey: review.fieldKey,
      itemKind: review.kind,
      severity: review.severity,
      message: review.message,
      sourceText: evidence?.evidenceExcerpt ?? null,
    });
  }
}

async function insertProjectionRows(
  tx: postgres.TransactionSql,
  snapshotId: number,
  projection: AcademicStructureSnapshotProjection,
) {
  if (projection.summaryFields.length > 0) {
    await tx`
      insert into public.academic_structure_summary_fields ${tx(
        projection.summaryFields.map((field) => ({
          snapshot_id: snapshotId,
          position: field.position,
          field_key: field.fieldKey,
          label: field.label,
          value_position: field.valuePosition,
          field_value: field.fieldValue,
          source_text: field.sourceText,
        })),
      )}
    `;
  }
  if (projection.sections.length > 0) {
    await tx`
      insert into public.academic_structure_snapshot_sections ${tx(
        projection.sections.map((section) => ({
          snapshot_id: snapshotId,
          section_key: section.sectionKey,
          heading: section.heading,
          markdown: section.markdown,
          source_text: section.sourceText,
          source_locator: section.sourceLocator,
          position: section.position,
        })),
      )}
    `;
  }
  if (projection.learningOutcomes.length > 0) {
    await tx`
      insert into public.academic_structure_learning_outcomes ${tx(
        projection.learningOutcomes.map((outcome) => ({
          snapshot_id: snapshotId,
          position: outcome.position,
          outcome_text: outcome.outcomeText,
          source_text: outcome.sourceText,
          source_locator: outcome.sourceLocator,
        })),
      )}
    `;
  }
  if (projection.fees.length > 0) {
    await tx`
      insert into public.academic_structure_fees ${tx(
        projection.fees.map((fee) => ({
          snapshot_id: snapshotId,
          position: fee.position,
          fee_year: fee.feeYear,
          audience: fee.audience,
          fee_type: fee.feeType,
          amount: fee.amount,
          currency: fee.currency,
          basis: fee.basis,
          source_label: fee.sourceLabel,
          source_text: fee.sourceText,
          source_locator: fee.sourceLocator,
        })),
      )}
    `;
  }
  if (projection.relationships.length > 0) {
    await tx`
      insert into public.academic_structure_snapshot_relationships ${tx(
        projection.relationships.map((relationship) => ({
          snapshot_id: snapshotId,
          position: relationship.position,
          relationship_kind: relationship.relationshipKind,
          target_kind: relationship.targetKind,
          target_code: relationship.targetCode,
          target_title: relationship.targetTitle,
          source_text: relationship.sourceText,
          source_locator: relationship.sourceLocator,
        })),
      )}
    `;
  }

  const groupIds = new Map<string, number>();
  const pendingGroups = [...projection.requirementGroups];
  while (pendingGroups.length > 0) {
    const insertable = pendingGroups.filter(
      ({ parentGroupKey }) =>
        parentGroupKey === null || groupIds.has(parentGroupKey),
    );
    if (insertable.length === 0) {
      throw new TypeError(
        "The projected academic structure requirement tree contains a cycle.",
      );
    }
    for (const group of insertable) {
      const [row] = await tx`
        insert into public.academic_structure_requirement_groups (
          snapshot_id,
          parent_group_id,
          group_key,
          title,
          description,
          operator,
          minimum_count,
          minimum_units,
          maximum_units,
          source_text,
          source_locator,
          position
        ) values (
          ${snapshotId},
          ${
            group.parentGroupKey === null
              ? null
              : requiredMapValue(
                  groupIds,
                  group.parentGroupKey,
                  "Parent requirement group",
                )
          },
          ${group.key},
          ${group.title},
          ${group.description},
          ${group.operator},
          ${group.minimumCount},
          ${group.minimumUnits},
          ${group.maximumUnits},
          ${group.sourceText},
          ${group.sourceLocator},
          ${group.position}
        )
        returning id
      `;
      if (!row) throw new Error("The requirement group was not created.");
      groupIds.set(group.key, Number(row.id));
      pendingGroups.splice(pendingGroups.indexOf(group), 1);
    }
  }

  const conditionIds = new Map<string, number>();
  for (const condition of projection.requirementConditions) {
    const [row] = await tx`
      insert into public.academic_structure_requirement_conditions (
        snapshot_id,
        requirement_group_id,
        position,
        projection_key,
        condition_kind,
        structure_kind,
        subject_code,
        minimum_level,
        maximum_level,
        minimum_units,
        maximum_units,
        minimum_courses,
        tag,
        free_text,
        source_text,
        source_locator
      ) values (
        ${snapshotId},
        ${requiredMapValue(groupIds, condition.groupKey, "Requirement group")},
        ${condition.position},
        ${condition.key},
        ${condition.conditionKind},
        ${condition.structureKind},
        ${condition.subjectCode},
        ${condition.minimumLevel},
        ${condition.maximumLevel},
        ${condition.minimumUnits},
        ${condition.maximumUnits},
        ${condition.minimumCourses},
        ${condition.tag},
        ${condition.freeText},
        ${condition.sourceText},
        ${condition.sourceLocator}
      )
      returning id
    `;
    if (!row) throw new Error("The requirement condition was not created.");
    conditionIds.set(condition.key, Number(row.id));
  }
  if (projection.requirementOptions.length > 0) {
    await tx`
      insert into public.academic_structure_requirement_options ${tx(
        projection.requirementOptions.map((option) => ({
          snapshot_id: snapshotId,
          requirement_condition_id: requiredMapValue(
            conditionIds,
            option.conditionKey,
            "Requirement condition",
          ),
          position: option.position,
          option_kind: option.optionKind,
          option_code: option.optionCode,
          structure_kind: option.structureKind,
        })),
      )}
    `;
  }
  if (projection.unmodelledRequirements.length > 0) {
    await tx`
      insert into public.academic_structure_unmodelled_requirements ${tx(
        projection.unmodelledRequirements.map((item) => ({
          snapshot_id: snapshotId,
          position: item.position,
          source_text: item.sourceText,
          source_locator: item.sourceLocator,
        })),
      )}
    `;
  }
  if (projection.evidence.length > 0) {
    await tx`
      insert into public.academic_structure_snapshot_evidence ${tx(
        projection.evidence.map((evidence) => ({
          snapshot_id: snapshotId,
          position: evidence.position,
          field_key: evidence.fieldKey,
          source_locator: evidence.sourceLocator,
          evidence_excerpt: evidence.evidenceExcerpt,
          confidence: evidence.confidence,
          method: evidence.method,
        })),
      )}
    `;
  }
}

export async function persistAcademicStructureSnapshotCandidate(
  sql: AcademicStructureImportSql | postgres.TransactionSql,
  {
    claim,
    sourcePageId,
    projection,
    extraction,
    messageId,
    workerId,
    expectedLockVersion,
  }: {
    claim: ClaimedAcademicStructureImportTarget;
    sourcePageId: number;
    projection: AcademicStructureSnapshotProjection;
    extraction: AcademicStructureExtraction;
  } & SnapshotPersistenceLeaseFence,
): Promise<PersistedAcademicStructureSnapshotCandidate> {
  if (
    projection.structureKind !== claim.structureKind ||
    projection.structureCode !== claim.structureCode ||
    projection.academicYear !== claim.academicYear ||
    projection.schemaVersion !== claim.schemaVersion ||
    extraction.kind !== claim.structureKind ||
    extraction.code !== claim.structureCode ||
    extraction.year !== claim.academicYear
  ) {
    throw new TypeError(
      "The academic structure projection does not match its import target.",
    );
  }
  const semanticHash = academicStructureSemanticHash(projection);

  const persist = async (tx: postgres.TransactionSql) => {
    const [activeLease] = await tx`
      select targets.id
      from public.academic_structure_import_targets as targets
      where targets.id = ${claim.targetId}
        and targets.run_id = ${claim.runId}
        and targets.processing_status = ${"running"}
        and targets.queue_message_id = ${messageId}
        and targets.worker_id = ${workerId}
        and targets.lock_version = ${expectedLockVersion}
        and targets.lease_expires_at > statement_timestamp()
      for update
    `;
    if (!activeLease) {
      throw new AcademicStructureImportStoreError(
        "The academic structure import target lease is no longer current.",
        "IMPORT_TARGET_LEASE_LOST",
      );
    }

    await tx`
      insert into public.academic_structures (code, kind)
      values (${claim.structureCode}, ${claim.structureKind})
      on conflict (code) do nothing
    `;
    const [structure] = await tx`
      select id, kind
      from public.academic_structures
      where code = ${claim.structureCode}
      for update
    `;
    if (!structure || String(structure.kind) !== claim.structureKind) {
      throw new TypeError(
        "The imported code belongs to a different academic structure kind.",
      );
    }
    const structureId = Number(structure.id);
    if (claim.structureId !== null && claim.structureId !== structureId) {
      throw new TypeError(
        "The import target points at a different academic structure identity.",
      );
    }

    await tx`
      insert into public.academic_structure_years (
        structure_id,
        academic_year_id
      ) values (
        ${structureId},
        ${claim.academicYearId}
      )
      on conflict (structure_id, academic_year_id) do nothing
    `;
    const [structureYear] = await tx`
      select id, draft_snapshot_id, published_snapshot_id
      from public.academic_structure_years
      where structure_id = ${structureId}
        and academic_year_id = ${claim.academicYearId}
      for update
    `;
    if (!structureYear) {
      throw new Error("The academic structure year was not resolved.");
    }
    const structureYearId = Number(structureYear.id);
    if (
      claim.structureYearId !== null &&
      claim.structureYearId !== structureYearId
    ) {
      throw new TypeError(
        "The import target points at a different academic structure year.",
      );
    }
    const currentDraftSnapshotId =
      structureYear.draft_snapshot_id === null
        ? null
        : Number(structureYear.draft_snapshot_id);
    const currentPublishedSnapshotId =
      structureYear.published_snapshot_id === null
        ? null
        : Number(structureYear.published_snapshot_id);

    const [targetState] = await tx`
      update public.academic_structure_import_targets
      set
        structure_id = ${structureId},
        structure_year_id = ${structureYearId},
        updated_at = now()
      where id = ${claim.targetId}
        and run_id = ${claim.runId}
        and processing_status = ${"running"}
        and queue_message_id = ${messageId}
        and worker_id = ${workerId}
        and lock_version = ${expectedLockVersion}
        and lease_expires_at > statement_timestamp()
        and (structure_id is null or structure_id = ${structureId})
        and (structure_year_id is null or structure_year_id = ${structureYearId})
      returning baseline_draft_snapshot_id, baseline_published_snapshot_id
    `;
    if (!targetState) {
      throw new Error(
        "The import target could not capture its academic structure baseline.",
      );
    }
    const effectiveClaim: ClaimedAcademicStructureImportTarget = {
      ...claim,
      structureId,
      structureYearId,
      baselineDraftSnapshotId:
        targetState.baseline_draft_snapshot_id === null
          ? null
          : Number(targetState.baseline_draft_snapshot_id),
      baselinePublishedSnapshotId:
        targetState.baseline_published_snapshot_id === null
          ? null
          : Number(targetState.baseline_published_snapshot_id),
    };

    const comparedSnapshotId =
      currentDraftSnapshotId ?? currentPublishedSnapshotId;
    const [comparedSnapshot] = comparedSnapshotId
      ? await tx`
          select semantic_hash
          from public.academic_structure_snapshots
          where id = ${comparedSnapshotId}
            and structure_year_id = ${structureYearId}
        `
      : [];
    const comparedSemanticHash = comparedSnapshot
      ? String(comparedSnapshot.semantic_hash)
      : null;

    if (comparedSemanticHash === semanticHash) {
      const changeKind = "unchanged" as const;
      return {
        changeKind,
        structureId,
        structureYearId,
        candidateSnapshotId: null,
        changeSet: makeChangeSet({
          changeKind,
          semanticHash,
          projection,
          claim: effectiveClaim,
          currentDraftSnapshotId,
          currentPublishedSnapshotId,
          comparedSnapshotId,
          comparedSemanticHash,
          candidateSnapshotId: null,
          reusedCandidate: false,
        }),
      };
    }

    const insertedSnapshot = await tx`
      insert into public.academic_structure_snapshots (
        structure_year_id,
        academic_year_id,
        source_page_id,
        import_target_id,
        parent_snapshot_id,
        origin,
        schema_version,
        semantic_hash,
        name,
        acronym,
        short_name,
        introduction,
        description,
        units,
        duration_years,
        academic_career,
        college,
        mode_of_delivery,
        selection_rank,
        atar,
        can_combine,
        can_combine_vertical,
        study_as,
        contact_text,
        overall_confidence,
        critical_uncertainty,
        confirmation_status,
        created_by
      ) values (
        ${structureYearId},
        ${claim.academicYearId},
        ${sourcePageId},
        ${claim.targetId},
        ${comparedSnapshotId},
        ${"imported"},
        ${projection.schemaVersion},
        ${semanticHash},
        ${projection.snapshot.title},
        ${projection.snapshot.acronym},
        ${projection.snapshot.shortName},
        ${projection.snapshot.introduction},
        ${projection.snapshot.description},
        ${projection.snapshot.totalUnits},
        ${projection.snapshot.durationYears},
        ${projection.snapshot.academicCareer},
        ${projection.snapshot.college},
        ${projection.snapshot.deliveryMode},
        ${projection.snapshot.selectionRank},
        ${projection.snapshot.atar},
        ${projection.snapshot.canCombine},
        ${projection.snapshot.canCombineVertical},
        ${projection.snapshot.studyAs},
        ${projection.snapshot.contactText},
        ${projection.snapshot.overallConfidence},
        ${false},
        ${"not_required"},
        ${claim.initiatedBy}
      )
      on conflict (structure_year_id, semantic_hash) do nothing
      returning id
    `;
    const inserted = insertedSnapshot.length === 1;
    const [snapshot] = inserted
      ? insertedSnapshot
      : await tx`
          select id
          from public.academic_structure_snapshots
          where structure_year_id = ${structureYearId}
            and semantic_hash = ${semanticHash}
        `;
    if (!snapshot) {
      throw new Error("The academic structure snapshot was not created.");
    }
    const candidateSnapshotId = Number(snapshot.id);
    if (inserted) {
      await insertProjectionRows(tx, candidateSnapshotId, projection);
    }

    await recordCandidateReviewItems(tx, {
      claim: effectiveClaim,
      candidateSnapshotId,
      semanticHash,
      extraction,
      currentDraftSnapshotId,
      currentPublishedSnapshotId,
    });

    const changeKind: SnapshotChangeKind =
      comparedSnapshotId === null ? "new" : "changed";
    return {
      changeKind,
      structureId,
      structureYearId,
      candidateSnapshotId,
      changeSet: makeChangeSet({
        changeKind,
        semanticHash,
        projection,
        claim: effectiveClaim,
        currentDraftSnapshotId,
        currentPublishedSnapshotId,
        comparedSnapshotId,
        comparedSemanticHash,
        candidateSnapshotId,
        reusedCandidate: !inserted,
      }),
    };
  };

  return "begin" in sql ? sql.begin(persist) : sql.savepoint(persist);
}

export const academicStructurePersistenceInternals = {
  makeChangeSet,
  semanticProjection,
  verifyProjectionFingerprint,
};
