import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { extractDeterministicCourse } from "../lib/course-import/deterministic.ts";
import { persistCourseSnapshotCandidate } from "../lib/course-import/persist-snapshot.ts";
import { projectCourseSnapshot } from "../lib/course-import/project-snapshot.ts";
import { createLocalDatabaseClient } from "../scripts/catalogue/lib/local-database.mjs";

const rollbackSignal = new Error(
  "Intentional course snapshot persistence test rollback",
);
const academicYear = 2026;
const courseCode = "COMP2400";
const programmeCode = "PERSIST-PROG";
const sourceUrl = "https://programsandcourses.anu.edu.au/2026/course/COMP2400";
const fixtureHtml = await readFile(
  new URL(
    "./fixtures/course-import/anu-2026-comp2400-rich.html",
    import.meta.url,
  ),
  "utf8",
);
const extraction = extractDeterministicCourse({
  html: fixtureHtml,
  courseCode,
  year: academicYear,
  sourceUrl,
});
if (!extraction.requisites.prerequisiteRule) {
  throw new Error("The course persistence fixture must have a prerequisite.");
}
extraction.requisites = {
  ...extraction.requisites,
  prerequisiteText: `${extraction.requisites.prerequisiteText} Enrolment in ${programmeCode} is also required.`,
  prerequisiteRule: {
    op: "all_of",
    rules: [
      extraction.requisites.prerequisiteRule,
      { op: "enrolled_in", programmeCode },
    ],
  },
};
const projection = projectCourseSnapshot(extraction);

function hash(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

test("persists and idempotently reuses a complete review candidate", async () => {
  const sql = await createLocalDatabaseClient();
  try {
    await assert.rejects(
      sql.begin(async (tx) => {
        await tx`
          insert into public.course_sources (name, kind, base_url)
          values (
            ${"ANU Programs and Courses"},
            ${"anu_programs_courses"},
            ${"https://programsandcourses.anu.edu.au"}
          )
          on conflict (kind, base_url) do nothing
        `;
        const [source] = await tx`
          select id
          from public.course_sources
          where kind = ${"anu_programs_courses"}
            and base_url = ${"https://programsandcourses.anu.edu.au"}
        `;
        const [year] = await tx`
          select id
          from public.academic_years
          where year = ${academicYear}
        `;
        assert.ok(source);
        assert.ok(year);

        const directoryHash = hash("course persistence directory fixture");
        const [directoryDocument] = await tx`
          insert into public.course_source_pages (
            source_id,
            academic_year_id,
            page_kind,
            external_key,
            canonical_url,
            media_type,
            content_sha256,
            http_status,
            byte_size,
            storage_bucket,
            storage_path
          ) values (
            ${source.id},
            ${year.id},
            ${"course_directory"},
            ${"persistence-test-directory"},
            ${"https://programsandcourses.anu.edu.au/2026/search?type=course"},
            ${"application/json"},
            ${directoryHash},
            ${200},
            ${2},
            ${"course-import-artifacts"},
            ${`tests/${directoryHash}.json`}
          )
          returning id
        `;
        const sourceHash = hash(fixtureHtml);
        const [sourcePage] = await tx`
          insert into public.course_source_pages (
            source_id,
            academic_year_id,
            page_kind,
            external_key,
            canonical_url,
            media_type,
            content_sha256,
            http_status,
            byte_size,
            storage_bucket,
            storage_path
          ) values (
            ${source.id},
            ${year.id},
            ${"course_page"},
            ${courseCode},
            ${sourceUrl},
            ${"text/html"},
            ${sourceHash},
            ${200},
            ${Buffer.byteLength(fixtureHtml, "utf8")},
            ${"course-import-artifacts"},
            ${`tests/${sourceHash}.html`}
          )
          returning id
        `;
        await tx`
          insert into public.course_directory_entries (
            academic_year_id,
            code,
            title,
            units,
            source_page_id
          ) values (
            ${year.id},
            ${courseCode},
            ${extraction.title},
            ${6},
            ${directoryDocument.id}
          )
          on conflict (academic_year_id, code) do update
          set
            title = excluded.title,
            units = excluded.units,
            source_page_id = excluded.source_page_id,
            course_id = null,
            is_current = true
        `;
        const [directoryEntry] = await tx`
          select id
          from public.course_directory_entries
          where academic_year_id = ${year.id}
            and code = ${courseCode}
        `;
        const [run] = await tx`
          insert into public.course_import_runs (
            source_id,
            academic_year_id,
            requested_model,
            parser_version,
            prompt_version,
            schema_version,
            target_count
          ) values (
            ${source.id},
            ${year.id},
            ${"google/gemini-3.1-flash-lite"},
            ${"test-parser"},
            ${"test-prompt"},
            ${"course-snapshot.v1"},
            ${1}
          )
          returning id
        `;
        const [target] = await tx`
          insert into public.course_import_targets (
            run_id,
            source_id,
            academic_year_id,
            directory_entry_id,
            position,
            course_code
          ) values (
            ${run.id},
            ${source.id},
            ${year.id},
            ${directoryEntry.id},
            ${1},
            ${courseCode}
          )
          returning id
        `;
        const claim = {
          runId: String(run.id),
          targetId: String(target.id),
          academicYear,
          academicYearId: Number(year.id),
          courseCode,
          requestedModel: "google/gemini-3.1-flash-lite",
          initiatedBy: null,
          parserVersion: "test-parser",
          promptVersion: "test-prompt",
          schemaVersion: "course-snapshot.v1",
          sourceId: Number(source.id),
          sourceBaseUrl: "https://programsandcourses.anu.edu.au",
          directoryEntryId: Number(directoryEntry.id),
          courseId: null,
          courseYearId: null,
          baselineDraftSnapshotId: null,
          baselinePublishedSnapshotId: null,
          attemptCount: 1,
          lockVersion: 1,
          leaseExpiresAt: new Date(Date.now() + 600_000).toISOString(),
        };

        const [before] = await tx`
          select count(*)::integer as snapshots
          from public.course_snapshots as snapshots
          join public.course_years as course_years
            on course_years.id = snapshots.course_year_id
          join public.courses as courses on courses.id = course_years.course_id
          where courses.code = ${courseCode}
            and course_years.academic_year_id = ${year.id}
        `;

        const first = await persistCourseSnapshotCandidate(tx, {
          claim,
          sourcePageId: Number(sourcePage.id),
          projection,
          extraction,
        });
        assert.ok(first.changeKind === "new" || first.changeKind === "changed");
        assert.ok(first.candidateSnapshotId);
        assert.equal(first.changeSet.requiresManualReview, true);

        const second = await persistCourseSnapshotCandidate(tx, {
          claim,
          sourcePageId: Number(sourcePage.id),
          projection,
          extraction,
        });
        assert.equal(second.candidateSnapshotId, first.candidateSnapshotId);
        assert.equal(second.changeSet.reusedCandidate, true);

        const [counts] = await tx`
          select
            (select count(*) from public.course_snapshots
              where course_year_id = ${first.courseYearId})::integer
              as snapshots,
            (select count(*) from public.course_review_items
              where target_id = ${target.id})::integer as review_items,
            (select count(*) from public.course_fees
              where course_snapshot_id = ${first.candidateSnapshotId})::integer
              as fees,
            (select count(*) from public.course_learning_outcomes
              where course_snapshot_id = ${first.candidateSnapshotId})::integer
              as outcomes,
            (select count(*) from public.course_assessment_items
              where course_snapshot_id = ${first.candidateSnapshotId})::integer
              as assessments,
            (select count(*) from public.offering_sessions
              where course_snapshot_id = ${first.candidateSnapshotId})::integer
              as sessions,
            (select count(*) from public.course_attributes
              where course_snapshot_id = ${first.candidateSnapshotId})::integer
              as attributes
        `;
        assert.equal(counts.snapshots, before.snapshots + 1);
        assert.ok(counts.review_items >= 1);
        assert.equal(counts.fees, projection.fees.length);
        assert.equal(counts.outcomes, projection.learningOutcomes.length);
        assert.equal(counts.assessments, projection.assessmentItems.length);
        assert.equal(counts.sessions, projection.offeringSessions.length);
        assert.equal(counts.attributes, projection.attributes.length);

        const [programmeCondition] = await tx`
          select
            conditions.free_text,
            conditions.required_structure_id,
            structures.code,
            structures.kind
          from public.course_rule_conditions as conditions
          join public.academic_structures as structures
            on structures.id = conditions.required_structure_id
          where conditions.course_snapshot_id = ${first.candidateSnapshotId}
            and conditions.condition_kind = ${"admission"}
        `;
        assert.ok(programmeCondition);
        assert.equal(programmeCondition.code, programmeCode);
        assert.equal(programmeCondition.kind, "programme");
        assert.equal(programmeCondition.free_text, null);
        assert.ok(programmeCondition.required_structure_id);

        const [storedProjection] = await tx`
          select private.course_snapshot_projection(
            ${first.candidateSnapshotId}
          ) as value
        `;
        const projectedProgrammeCondition =
          storedProjection.value.ruleConditions.find(
            (condition) => condition.conditionKind === "admission",
          );
        assert.equal(
          projectedProgrammeCondition.requiredStructureCode,
          programmeCode,
        );
        assert.equal(projectedProgrammeCondition.freeText, null);

        const [offeringSession] = await tx`
          select academic_period_id, academic_period_code, academic_period_name
          from public.offering_sessions
          where course_snapshot_id = ${first.candidateSnapshotId}
        `;
        assert.equal(offeringSession.academic_period_id, null);
        assert.equal(
          offeringSession.academic_period_code,
          projection.offeringSessions[0].academicPeriodCode,
        );
        assert.equal(
          offeringSession.academic_period_name,
          projection.offeringSessions[0].academicPeriodName,
        );

        const [snapshot] = await tx`
          select sealed_at
          from public.course_snapshots
          where id = ${first.candidateSnapshotId}
        `;
        assert.equal(snapshot.sealed_at, null);
        throw rollbackSignal;
      }),
      (error) => error === rollbackSignal,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
});
