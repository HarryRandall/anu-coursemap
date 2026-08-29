import type postgres from "postgres";
import type { CourseExtraction } from "./contract.ts";
import type {
  ClaimedCourseImportTarget,
  CourseImportSql,
} from "./import-store.ts";
import type { CourseSnapshotProjection } from "./project-snapshot.ts";

type SnapshotChangeKind = "new" | "changed" | "unchanged";
type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type PersistedCourseSnapshotCandidate = {
  changeKind: SnapshotChangeKind;
  courseId: number;
  courseYearId: number;
  candidateSnapshotId: number | null;
  changeSet: {
    changeKind: SnapshotChangeKind;
    projectionSha256: string;
    capturedDraftSnapshotId: number | null;
    capturedPublishedSnapshotId: number | null;
    currentDraftSnapshotId: number | null;
    currentPublishedSnapshotId: number | null;
    comparedSnapshotId: number | null;
    comparedProjectionSha256: string | null;
    baselineChangedDuringImport: boolean;
    candidateSnapshotId: number | null;
    reusedCandidate: boolean;
    requiresManualReview: boolean;
  };
};

function pathValue(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function requiredMapValue<K>(
  map: ReadonlyMap<K, number>,
  key: K,
  label: string,
) {
  const value = map.get(key);
  if (value === undefined) throw new Error(`${label} was not resolved.`);
  return value;
}

function evidenceImportance(fieldKey: string) {
  return /^(?:code|year|title|unitValue|requisites)(?:\.|$)/.test(fieldKey)
    ? "critical"
    : /^(?:fees|offerings|assessmentItems|learningOutcomes)(?:\.|$)/.test(
          fieldKey,
        )
      ? "high"
      : "normal";
}

function confidenceBand(confidence: number | null) {
  if (confidence === null) return "unknown";
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}

function issueCode(kind: CourseExtraction["reviewItems"][number]["kind"]) {
  return `EXTRACTION_${kind.toUpperCase()}`;
}

function allReferencedCourseCodes(projection: CourseSnapshotProjection) {
  return [
    projection.courseCode,
    ...projection.relatedCourses.map(
      ({ sourceCourseCode }) => sourceCourseCode,
    ),
    ...projection.ruleConditions.flatMap(({ requiredCourseCode }) =>
      requiredCourseCode ? [requiredCourseCode] : [],
    ),
    ...projection.ruleConditionCourses.map(
      ({ sourceCourseCode }) => sourceCourseCode,
    ),
    ...projection.ruleCourseReferences.map(
      ({ referencedCourseCode }) => referencedCourseCode,
    ),
  ];
}

async function ensureCourseIds(
  tx: postgres.TransactionSql,
  codes: readonly string[],
) {
  const uniqueCodes = [...new Set(codes)].sort();
  if (uniqueCodes.length === 0) return new Map<string, number>();
  await tx`
    insert into public.courses ${tx(uniqueCodes.map((code) => ({ code })))}
    on conflict (code) do nothing
  `;
  const rows = await tx`
    select id, code
    from public.courses
    where code = any(${tx.array(uniqueCodes)}::text[])
  `;
  const output = new Map(
    rows.map((row) => [String(row.code), Number(row.id)] as const),
  );
  if (output.size !== uniqueCodes.length) {
    throw new Error("Not every referenced course identity was resolved.");
  }
  return output;
}

function makeChangeSet({
  changeKind,
  projectionSha256,
  claim,
  currentDraftSnapshotId,
  currentPublishedSnapshotId,
  comparedSnapshotId,
  comparedProjectionSha256,
  candidateSnapshotId,
  reusedCandidate,
}: {
  changeKind: SnapshotChangeKind;
  projectionSha256: string;
  claim: ClaimedCourseImportTarget;
  currentDraftSnapshotId: number | null;
  currentPublishedSnapshotId: number | null;
  comparedSnapshotId: number | null;
  comparedProjectionSha256: string | null;
  candidateSnapshotId: number | null;
  reusedCandidate: boolean;
}) {
  const baselineChangedDuringImport =
    claim.baselineDraftSnapshotId !== currentDraftSnapshotId ||
    claim.baselinePublishedSnapshotId !== currentPublishedSnapshotId;
  return {
    changeKind,
    projectionSha256,
    capturedDraftSnapshotId: claim.baselineDraftSnapshotId,
    capturedPublishedSnapshotId: claim.baselinePublishedSnapshotId,
    currentDraftSnapshotId,
    currentPublishedSnapshotId,
    comparedSnapshotId,
    comparedProjectionSha256,
    baselineChangedDuringImport,
    candidateSnapshotId,
    reusedCandidate,
    requiresManualReview: changeKind !== "unchanged",
  };
}

async function recordCandidateReviewItems(
  tx: postgres.TransactionSql,
  {
    claim,
    candidateSnapshotId,
    projectionSha256,
    extraction,
    currentDraftSnapshotId,
    currentPublishedSnapshotId,
  }: {
    claim: ClaimedCourseImportTarget;
    candidateSnapshotId: number;
    projectionSha256: string;
    extraction: CourseExtraction;
    currentDraftSnapshotId: number | null;
    currentPublishedSnapshotId: number | null;
  },
) {
  await tx`
    insert into public.course_review_items (
      target_id,
      course_snapshot_id,
      entity_kind,
      entity_key,
      field_path,
      issue_code,
      importance,
      is_blocking,
      confidence,
      summary,
      new_value
    ) values (
      ${claim.targetId},
      ${candidateSnapshotId},
      ${"course"},
      ${"root"},
      ${"$"},
      ${"MANUAL_REVIEW_REQUIRED"},
      ${"high"},
      ${true},
      ${extraction.overallConfidence},
      ${"Review every imported field before accepting this course snapshot."},
      ${tx.json({ projectionSha256 })}
    )
    on conflict (
      target_id,
      entity_kind,
      entity_key,
      field_path,
      issue_code
    ) do nothing
  `;

  const baselineChangedDuringImport =
    claim.baselineDraftSnapshotId !== currentDraftSnapshotId ||
    claim.baselinePublishedSnapshotId !== currentPublishedSnapshotId;
  if (baselineChangedDuringImport) {
    await tx`
      insert into public.course_review_items (
        target_id,
        course_snapshot_id,
        entity_kind,
        entity_key,
        field_path,
        issue_code,
        importance,
        is_blocking,
        summary,
        old_value,
        new_value
      ) values (
        ${claim.targetId},
        ${candidateSnapshotId},
        ${"course"},
        ${"root"},
        ${"snapshotPointers"},
        ${"BASELINE_CHANGED_DURING_IMPORT"},
        ${"critical"},
        ${true},
        ${"The course draft or publication changed while this import was running."},
        ${tx.json({
          draftSnapshotId: claim.baselineDraftSnapshotId,
          publishedSnapshotId: claim.baselinePublishedSnapshotId,
        })},
        ${tx.json({
          draftSnapshotId: currentDraftSnapshotId,
          publishedSnapshotId: currentPublishedSnapshotId,
        })}
      )
      on conflict (
        target_id,
        entity_kind,
        entity_key,
        field_path,
        issue_code
      ) do nothing
    `;
  }

  for (const review of extraction.reviewItems) {
    const supportingEvidence = extraction.evidence.find(
      ({ fieldKey }) => fieldKey === review.fieldKey,
    );
    const value = pathValue(extraction, review.fieldKey);
    await tx`
      insert into public.course_review_items (
        target_id,
        course_snapshot_id,
        entity_kind,
        entity_key,
        field_path,
        issue_code,
        importance,
        is_blocking,
        confidence,
        summary,
        new_value,
        source_locator,
        source_excerpt
      ) values (
        ${claim.targetId},
        ${candidateSnapshotId},
        ${"course"},
        ${"root"},
        ${review.fieldKey},
        ${issueCode(review.kind)},
        ${review.severity === "error" ? "critical" : "normal"},
        ${review.severity === "error"},
        ${supportingEvidence?.confidence ?? null},
        ${review.message},
        ${tx.json(
          toJsonValue(
            value === undefined || value === null
              ? { extractionState: review.kind }
              : value,
          ),
        )},
        ${supportingEvidence?.sourceLocator ?? null},
        ${supportingEvidence?.evidenceExcerpt ?? null}
      )
      on conflict (
        target_id,
        entity_kind,
        entity_key,
        field_path,
        issue_code
      ) do nothing
    `;
  }
}

export async function persistCourseSnapshotCandidate(
  sql: CourseImportSql | postgres.TransactionSql,
  {
    claim,
    sourceDocumentId,
    projection,
    extraction,
  }: {
    claim: ClaimedCourseImportTarget;
    sourceDocumentId: number;
    projection: CourseSnapshotProjection;
    extraction: CourseExtraction;
  },
): Promise<PersistedCourseSnapshotCandidate> {
  if (
    projection.courseCode !== claim.courseCode ||
    projection.academicYear !== claim.academicYear
  ) {
    throw new TypeError(
      "The course projection does not match its import target.",
    );
  }

  const persist = async (tx: postgres.TransactionSql) => {
    const courseIds = await ensureCourseIds(
      tx,
      allReferencedCourseCodes(projection),
    );
    const courseId = courseIds.get(projection.courseCode)!;
    if (claim.courseId !== null && claim.courseId !== courseId) {
      throw new Error(
        "The import target points at a different course identity.",
      );
    }

    await tx`
      update public.course_directory_entries
      set course_id = ${courseId}
      where id = ${claim.directoryEntryId}
        and academic_year_id = ${claim.academicYearId}
        and code = ${claim.courseCode}
        and (course_id is null or course_id = ${courseId})
    `;

    await tx`
      insert into public.course_years (course_id, academic_year_id)
      values (${courseId}, ${claim.academicYearId})
      on conflict (course_id, academic_year_id) do nothing
    `;
    const [courseYear] = await tx`
      select id, draft_snapshot_id, published_snapshot_id
      from public.course_years
      where course_id = ${courseId}
        and academic_year_id = ${claim.academicYearId}
      for update
    `;
    if (!courseYear) throw new Error("The course year was not resolved.");
    const courseYearId = Number(courseYear.id);
    if (claim.courseYearId !== null && claim.courseYearId !== courseYearId) {
      throw new Error("The import target points at a different course year.");
    }

    const currentDraftSnapshotId =
      courseYear.draft_snapshot_id === null
        ? null
        : Number(courseYear.draft_snapshot_id);
    const currentPublishedSnapshotId =
      courseYear.published_snapshot_id === null
        ? null
        : Number(courseYear.published_snapshot_id);
    const comparedSnapshotId =
      currentDraftSnapshotId ?? currentPublishedSnapshotId;
    const [comparedSnapshot] = comparedSnapshotId
      ? await tx`
          select projection_sha256
          from public.course_snapshots
          where id = ${comparedSnapshotId}
            and course_year_id = ${courseYearId}
        `
      : [];
    const comparedProjectionSha256 = comparedSnapshot
      ? String(comparedSnapshot.projection_sha256)
      : null;

    const [existingCandidate] = await tx`
      select
        reviews.course_snapshot_id,
        snapshots.projection_sha256,
        snapshots.source_document_id
      from public.course_review_items as reviews
      join public.course_snapshots as snapshots
        on snapshots.id = reviews.course_snapshot_id
      where reviews.target_id = ${claim.targetId}
        and reviews.issue_code = ${"MANUAL_REVIEW_REQUIRED"}
        and snapshots.course_year_id = ${courseYearId}
      order by reviews.created_at desc
      limit 1
    `;
    if (existingCandidate) {
      if (
        String(existingCandidate.projection_sha256) !==
        projection.projectionSha256
      ) {
        throw new TypeError(
          "A retry produced different canonical data after its candidate snapshot was saved.",
        );
      }
      if (Number(existingCandidate.source_document_id) !== sourceDocumentId) {
        throw new TypeError(
          "The ANU source page changed after this target saved its candidate snapshot; start a new import run.",
        );
      }
      const candidateSnapshotId = Number(existingCandidate.course_snapshot_id);
      const changeKind: SnapshotChangeKind =
        claim.baselineDraftSnapshotId === null &&
        claim.baselinePublishedSnapshotId === null
          ? "new"
          : "changed";
      return {
        changeKind,
        courseId,
        courseYearId,
        candidateSnapshotId,
        changeSet: makeChangeSet({
          changeKind,
          projectionSha256: projection.projectionSha256,
          claim,
          currentDraftSnapshotId,
          currentPublishedSnapshotId,
          comparedSnapshotId,
          comparedProjectionSha256,
          candidateSnapshotId,
          reusedCandidate: true,
        }),
      };
    }

    const [matchingPendingCandidate] = await tx`
      select snapshots.id
      from public.course_snapshots as snapshots
      join public.course_review_items as reviews
        on reviews.course_snapshot_id = snapshots.id
       and reviews.issue_code = ${"MANUAL_REVIEW_REQUIRED"}
       and reviews.status = ${"open"}
      join public.course_import_targets as targets
        on targets.id = reviews.target_id
       and targets.processing_status = ${"ready_for_review"}
       and targets.review_status = ${"pending"}
      where snapshots.course_year_id = ${courseYearId}
        and snapshots.origin = ${"import"}
        and snapshots.source_document_id = ${sourceDocumentId}
        and snapshots.projection_sha256 = ${projection.projectionSha256}
      order by snapshots.snapshot_number desc
      limit 1
    `;
    if (matchingPendingCandidate) {
      const candidateSnapshotId = Number(matchingPendingCandidate.id);
      await recordCandidateReviewItems(tx, {
        claim,
        candidateSnapshotId,
        projectionSha256: projection.projectionSha256,
        extraction,
        currentDraftSnapshotId,
        currentPublishedSnapshotId,
      });
      const changeKind: SnapshotChangeKind =
        comparedSnapshotId === null ? "new" : "changed";
      return {
        changeKind,
        courseId,
        courseYearId,
        candidateSnapshotId,
        changeSet: makeChangeSet({
          changeKind,
          projectionSha256: projection.projectionSha256,
          claim,
          currentDraftSnapshotId,
          currentPublishedSnapshotId,
          comparedSnapshotId,
          comparedProjectionSha256,
          candidateSnapshotId,
          reusedCandidate: true,
        }),
      };
    }

    if (comparedProjectionSha256 === projection.projectionSha256) {
      const changeKind = "unchanged" as const;
      return {
        changeKind,
        courseId,
        courseYearId,
        candidateSnapshotId: null,
        changeSet: makeChangeSet({
          changeKind,
          projectionSha256: projection.projectionSha256,
          claim,
          currentDraftSnapshotId,
          currentPublishedSnapshotId,
          comparedSnapshotId,
          comparedProjectionSha256,
          candidateSnapshotId: null,
          reusedCandidate: false,
        }),
      };
    }

    const [numberRow] = await tx`
      select coalesce(max(snapshot_number), 0) + 1 as snapshot_number
      from public.course_snapshots
      where course_year_id = ${courseYearId}
    `;
    const reviewHasErrors = extraction.reviewItems.some(
      ({ severity }) => severity === "error",
    );
    const validationStatus =
      extraction.reviewItems.length > 0 ? "valid_with_warnings" : "valid";
    const snapshot = projection.snapshot;
    const [snapshotRow] = await tx`
      insert into public.course_snapshots (
        course_year_id,
        academic_year_id,
        snapshot_number,
        origin,
        based_on_snapshot_id,
        source_document_id,
        projection_sha256,
        schema_version,
        validation_status,
        overall_confidence,
        has_critical_uncertainty,
        title,
        unit_value_kind,
        units,
        minimum_units,
        maximum_units,
        eftsl,
        level,
        subject_code,
        subject_name,
        school,
        college,
        academic_career,
        convener_text,
        delivery_summary,
        introduction,
        description,
        workload_text,
        workload_hours,
        inherent_requirements,
        prescribed_texts,
        offering_status,
        source_updated_at,
        created_by
      ) values (
        ${courseYearId},
        ${claim.academicYearId},
        ${Number(numberRow.snapshot_number)},
        ${"import"},
        ${comparedSnapshotId},
        ${sourceDocumentId},
        ${projection.projectionSha256},
        ${claim.schemaVersion},
        ${validationStatus},
        ${extraction.overallConfidence},
        ${reviewHasErrors},
        ${snapshot.title},
        ${snapshot.unitValueKind},
        ${snapshot.units},
        ${snapshot.minimumUnits},
        ${snapshot.maximumUnits},
        ${snapshot.eftsl},
        ${snapshot.level},
        ${snapshot.subjectCode},
        ${snapshot.subjectName},
        ${snapshot.school},
        ${snapshot.college},
        ${snapshot.academicCareer},
        ${snapshot.convenerText},
        ${snapshot.deliverySummary},
        ${snapshot.introduction},
        ${snapshot.description},
        ${snapshot.workloadText},
        ${snapshot.workloadHours},
        ${snapshot.inherentRequirements},
        ${snapshot.prescribedTexts},
        ${snapshot.offeringStatus},
        ${snapshot.sourceUpdatedAt},
        ${claim.initiatedBy}
      )
      returning id
    `;
    if (!snapshotRow) throw new Error("The course snapshot was not created.");
    const candidateSnapshotId = Number(snapshotRow.id);

    if (projection.unitOptions.length > 0) {
      await tx`
        insert into public.course_unit_options ${tx(
          projection.unitOptions.map((option) => ({
            course_snapshot_id: candidateSnapshotId,
            position: option.position,
            units: option.units,
            label: option.label,
            source_text: option.sourceText,
          })),
        )}
      `;
    }
    if (projection.fees.length > 0) {
      await tx`
        insert into public.course_fees ${tx(
          projection.fees.map((fee) => ({
            course_snapshot_id: candidateSnapshotId,
            position: fee.position,
            fee_year: fee.feeYear,
            audience: fee.audience,
            fee_type: fee.feeType,
            amount: fee.amount,
            currency: fee.currency,
            basis: fee.basis,
            student_contribution_band: fee.studentContributionBand,
            source_label: fee.sourceLabel,
            source_text: fee.sourceText,
          })),
        )}
      `;
    }
    if (projection.areasOfInterest.length > 0) {
      await tx`
        insert into public.course_areas_of_interest ${tx(
          projection.areasOfInterest.map((area) => ({
            course_snapshot_id: candidateSnapshotId,
            position: area.position,
            name: area.name,
          })),
        )}
      `;
    }
    if (projection.attributes.length > 0) {
      await tx`
        insert into public.course_attributes ${tx(
          projection.attributes.map((attribute) => ({
            course_snapshot_id: candidateSnapshotId,
            position: attribute.position,
            attribute_kind: attribute.attributeKind,
            value: attribute.value,
            source_text: attribute.sourceText,
          })),
        )}
      `;
    }
    if (projection.relatedCourses.length > 0) {
      await tx`
        insert into public.course_related_courses ${tx(
          projection.relatedCourses.map((related) => ({
            course_snapshot_id: candidateSnapshotId,
            position: related.position,
            relation_kind: related.relationKind,
            related_course_id: courseIds.get(related.sourceCourseCode) ?? null,
            source_course_code: related.sourceCourseCode,
            source_course_title: related.sourceCourseTitle,
            source_text: related.sourceText,
          })),
        )}
      `;
    }

    if (projection.courseOffering) {
      const [offering] = await tx`
        insert into public.course_offerings (
          course_snapshot_id,
          academic_year_id,
          course_source_document_id,
          delivery_mode,
          location,
          status
        ) values (
          ${candidateSnapshotId},
          ${claim.academicYearId},
          ${sourceDocumentId},
          ${projection.courseOffering.deliveryMode},
          ${projection.courseOffering.location},
          ${"draft"}
        )
        returning id
      `;
      const offeringId = Number(offering.id);
      const periodCodes = [
        ...new Set(
          projection.offeringSessions.map(
            ({ academicPeriodCode }) => academicPeriodCode,
          ),
        ),
      ];
      const periods =
        periodCodes.length > 0
          ? await tx`
              select id, code
              from public.academic_periods
              where calendar_year = ${claim.academicYear}
                and code = any(${tx.array(periodCodes)}::text[])
            `
          : [];
      const periodIds = new Map(
        periods.map((period) => [String(period.code), Number(period.id)]),
      );
      await tx`
        insert into public.offering_sessions ${tx(
          projection.offeringSessions.map((session) => ({
            course_offering_id: offeringId,
            course_snapshot_id: candidateSnapshotId,
            academic_year_id: claim.academicYearId,
            course_source_document_id: sourceDocumentId,
            academic_period_id:
              periodIds.get(session.academicPeriodCode) ?? null,
            academic_period_code: session.academicPeriodCode,
            academic_period_name: session.academicPeriodName,
            position: session.position,
            class_number: session.classNumber,
            starts_on: session.startsOn,
            enrol_closes_on: session.enrolClosesOn,
            census_on: session.censusOn,
            ends_on: session.endsOn,
            delivery_mode: session.deliveryMode,
            location: session.location,
            class_summary_url: session.classSummaryUrl,
            source_text: session.sourceText,
          })),
        )}
      `;
    }

    const outcomeRows =
      projection.learningOutcomes.length > 0
        ? await tx`
            insert into public.course_learning_outcomes ${tx(
              projection.learningOutcomes.map((outcome) => ({
                course_snapshot_id: candidateSnapshotId,
                position: outcome.position,
                body: outcome.body,
              })),
            )}
            returning id, position
          `
        : [];
    const outcomeIds = new Map(
      outcomeRows.map((outcome) => [
        Number(outcome.position),
        Number(outcome.id),
      ]),
    );
    const assessmentRows =
      projection.assessmentItems.length > 0
        ? await tx`
            insert into public.course_assessment_items ${tx(
              projection.assessmentItems.map((assessment) => ({
                course_snapshot_id: candidateSnapshotId,
                position: assessment.position,
                title: assessment.title,
                weight: assessment.weight,
                hurdle: assessment.hurdle,
                due_text: assessment.dueText,
                source_text: assessment.sourceText,
              })),
            )}
            returning id, position
          `
        : [];
    const assessmentIds = new Map(
      assessmentRows.map((assessment) => [
        Number(assessment.position),
        Number(assessment.id),
      ]),
    );
    if (projection.assessmentOutcomes.length > 0) {
      await tx`
        insert into public.course_assessment_outcomes ${tx(
          projection.assessmentOutcomes.map((link) => ({
            course_snapshot_id: candidateSnapshotId,
            assessment_item_id: requiredMapValue(
              assessmentIds,
              link.assessmentPosition,
              "Assessment item",
            ),
            learning_outcome_id: requiredMapValue(
              outcomeIds,
              link.learningOutcomePosition,
              "Assessment learning outcome",
            ),
          })),
        )}
      `;
    }

    const ruleIds = new Map<string, number>();
    for (const rule of projection.rules) {
      const [row] = await tx`
        insert into public.course_rules (
          course_snapshot_id,
          academic_year_id,
          course_source_document_id,
          rule_kind,
          hardness,
          source_text,
          review_state,
          confidence
        ) values (
          ${candidateSnapshotId},
          ${claim.academicYearId},
          ${sourceDocumentId},
          ${rule.ruleKind},
          ${rule.hardness},
          ${rule.sourceText},
          ${"review"},
          ${extraction.overallConfidence ?? 0}
        )
        returning id
      `;
      ruleIds.set(rule.key, Number(row.id));
    }

    const groupIds = new Map<string, number>();
    const pendingGroups = [...projection.ruleGroups];
    while (pendingGroups.length > 0) {
      const insertable = pendingGroups.filter(
        ({ parentGroupKey }) =>
          parentGroupKey === null || groupIds.has(parentGroupKey),
      );
      if (insertable.length === 0) {
        throw new Error("The projected rule group tree contains a cycle.");
      }
      for (const group of insertable) {
        const [row] = await tx`
          insert into public.course_rule_groups (
            course_rule_id,
            course_snapshot_id,
            parent_group_id,
            operator,
            minimum_count,
            position
          ) values (
            ${requiredMapValue(ruleIds, group.ruleKey, "Course rule")},
            ${candidateSnapshotId},
            ${
              group.parentGroupKey === null
                ? null
                : requiredMapValue(
                    groupIds,
                    group.parentGroupKey,
                    "Parent course rule group",
                  )
            },
            ${group.operator},
            ${group.minimumCount},
            ${group.position}
          )
          returning id
        `;
        groupIds.set(group.key, Number(row.id));
        pendingGroups.splice(pendingGroups.indexOf(group), 1);
      }
    }

    const conditionIds = new Map<string, number>();
    for (const condition of projection.ruleConditions) {
      const [row] = await tx`
        insert into public.course_rule_conditions (
          course_rule_id,
          course_snapshot_id,
          group_id,
          condition_kind,
          required_course_id,
          minimum_units,
          minimum_mark,
          subject_code,
          minimum_course_level,
          maximum_course_level,
          free_text,
          minimum_gpa,
          minimum_year,
          minimum_wam,
          course_requirement_mode,
          hardness,
          source_text,
          confidence,
          review_state,
          position
        ) values (
          ${requiredMapValue(ruleIds, condition.ruleKey, "Course rule")},
          ${candidateSnapshotId},
          ${requiredMapValue(
            groupIds,
            condition.groupKey,
            "Course rule group",
          )},
          ${condition.conditionKind},
          ${
            condition.requiredCourseCode
              ? requiredMapValue(
                  courseIds,
                  condition.requiredCourseCode,
                  "Required course",
                )
              : null
          },
          ${condition.minimumUnits},
          ${condition.minimumMark},
          ${condition.subjectCode},
          ${condition.minimumCourseLevel},
          ${condition.maximumCourseLevel},
          ${condition.freeText},
          ${condition.minimumGpa},
          ${condition.minimumYear},
          ${condition.minimumWam},
          ${condition.courseRequirementMode},
          ${condition.hardness},
          ${condition.sourceText},
          ${extraction.overallConfidence ?? 0},
          ${"review"},
          ${condition.position}
        )
        returning id
      `;
      conditionIds.set(condition.key, Number(row.id));
    }
    if (projection.ruleConditionCourses.length > 0) {
      await tx`
        insert into public.course_rule_condition_courses ${tx(
          projection.ruleConditionCourses.map((course) => ({
            condition_id: requiredMapValue(
              conditionIds,
              course.conditionKey,
              "Course rule condition",
            ),
            course_snapshot_id: candidateSnapshotId,
            position: course.position,
            referenced_course_id:
              courseIds.get(course.sourceCourseCode) ?? null,
            source_course_code: course.sourceCourseCode,
            source_text: course.sourceText,
          })),
        )}
      `;
    }
    if (projection.ruleCourseReferences.length > 0) {
      await tx`
        insert into public.course_rule_course_references ${tx(
          projection.ruleCourseReferences.map((reference) => ({
            course_rule_id: requiredMapValue(
              ruleIds,
              reference.ruleKey,
              "Course rule",
            ),
            course_snapshot_id: candidateSnapshotId,
            referenced_course_id: requiredMapValue(
              courseIds,
              reference.referencedCourseCode,
              "Referenced course",
            ),
            source_text: reference.sourceText,
            confidence: extraction.overallConfidence ?? 0,
            review_state: "review",
          })),
        )}
      `;
    }

    const evidenceByField = new Map<string, CourseExtraction["evidence"]>();
    for (const evidence of extraction.evidence) {
      evidenceByField.set(evidence.fieldKey, [
        ...(evidenceByField.get(evidence.fieldKey) ?? []),
        evidence,
      ]);
    }
    if (evidenceByField.size > 0) {
      await tx`
        insert into public.course_snapshot_field_evidence ${tx(
          [...evidenceByField.entries()].map(([fieldKey, evidenceRows]) => {
            const confidence = Math.min(
              ...evidenceRows.map((row) => row.confidence),
            );
            const method = evidenceRows.some(({ method }) => method === "model")
              ? "source_matched"
              : "deterministic";
            return {
              course_snapshot_id: candidateSnapshotId,
              academic_year_id: claim.academicYearId,
              source_document_id: sourceDocumentId,
              entity_kind: "course",
              entity_key: "root",
              field_key: fieldKey,
              importance: evidenceImportance(fieldKey),
              extraction_state: "present",
              confidence,
              confidence_band: confidenceBand(confidence),
              verification_status: method,
              source_locator: evidenceRows
                .map(({ sourceLocator }) => sourceLocator)
                .join("; "),
              evidence_excerpt: evidenceRows
                .map(({ evidenceExcerpt }) => evidenceExcerpt)
                .join(" | "),
              note: null,
            };
          }),
        )}
      `;
    }

    await recordCandidateReviewItems(tx, {
      claim,
      candidateSnapshotId,
      projectionSha256: projection.projectionSha256,
      extraction,
      currentDraftSnapshotId,
      currentPublishedSnapshotId,
    });

    const changeKind: SnapshotChangeKind =
      comparedSnapshotId === null ? "new" : "changed";
    return {
      changeKind,
      courseId,
      courseYearId,
      candidateSnapshotId,
      changeSet: makeChangeSet({
        changeKind,
        projectionSha256: projection.projectionSha256,
        claim,
        currentDraftSnapshotId,
        currentPublishedSnapshotId,
        comparedSnapshotId,
        comparedProjectionSha256,
        candidateSnapshotId,
        reusedCandidate: false,
      }),
    };
  };

  return "begin" in sql ? sql.begin(persist) : sql.savepoint(persist);
}
