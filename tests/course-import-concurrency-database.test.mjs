import assert from "node:assert/strict";
import test from "node:test";

import { refreshCourseDirectoryForYearLocal } from "../lib/catalogue-import/run-course-directory-refresh.ts";
import { createLocalDatabaseClient } from "../scripts/catalogue/lib/local-database.mjs";

const workerOne = "63000000-0000-4000-8000-000000000001";
const workerTwo = "63000000-0000-4000-8000-000000000002";

const directoryPayload = {
  Items: [
    {
      CourseCode: "COMP1100",
      Name: "Programming as Problem Solving",
      Career: "Undergraduate",
      Units: 6,
    },
    {
      CourseCode: "COMP1110",
      Name: "Structured Programming",
      Career: "Undergraduate",
      Units: 6,
    },
  ],
};

async function ensureNativeDirectoryFixture() {
  await refreshCourseDirectoryForYearLocal({
    academicYear: 2026,
    fetchImpl: async () =>
      new Response(JSON.stringify(directoryPayload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
}

async function waitForBothFinishersToBlock(sql) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const [row] = await sql`
      select count(*)::integer as blocked_count
      from pg_stat_activity
      where application_name in (
        ${"coursemap_import_finish_one"},
        ${"coursemap_import_finish_two"}
      )
        and wait_event_type = ${"Lock"}
    `;
    if (row.blocked_count === 2) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Both course import finishers did not reach the run lock.");
}

test(
  "simultaneous target finishes leave the run in an exact terminal state",
  { timeout: 15_000 },
  async () => {
    const coordinator = await createLocalDatabaseClient();
    const finisherOne = await createLocalDatabaseClient();
    const finisherTwo = await createLocalDatabaseClient();
    const blocker = await createLocalDatabaseClient();
    let runId;
    let blockerTransactionOpen = false;
    let finishPromises = [];

    try {
      await ensureNativeDirectoryFixture();
      const targets = await coordinator`
        with candidates as (
          select
            entries.id as directory_entry_id,
            entries.code,
            entries.course_id,
            entries.academic_year_id,
            documents.source_id,
            course_years.id as course_year_id,
            course_years.draft_snapshot_id,
            course_years.published_snapshot_id,
            count(*) over (
              partition by documents.source_id, entries.academic_year_id
            ) as group_size
          from public.course_directory_entries as entries
          join public.course_source_pages as documents
            on documents.id = entries.source_page_id
           and documents.academic_year_id = entries.academic_year_id
          join public.academic_years as years
            on years.id = entries.academic_year_id
           and years.is_import_enabled
          left join public.course_years as course_years
            on course_years.course_id = entries.course_id
           and course_years.academic_year_id = entries.academic_year_id
          where entries.is_current
        )
        select *
        from candidates
        where group_size >= 2
        order by source_id, academic_year_id, code
        limit 2
      `;
      assert.equal(
        targets.length,
        2,
        "the preview seed must expose two courses",
      );
      assert.equal(targets[0].source_id, targets[1].source_id);
      assert.equal(targets[0].academic_year_id, targets[1].academic_year_id);

      const created = await coordinator.begin(async (tx) => {
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
            ${targets[0].source_id},
            ${targets[0].academic_year_id},
            ${"google/gemini-test"},
            ${"concurrency-test-parser"},
            ${"concurrency-test-prompt"},
            ${"course-snapshot.v1"},
            ${2}
          )
          returning id
        `;
        const insertedTargets = await tx`
          insert into public.course_import_targets ${tx(
            targets.map((target, index) => ({
              run_id: run.id,
              source_id: target.source_id,
              academic_year_id: target.academic_year_id,
              directory_entry_id: target.directory_entry_id,
              position: index + 1,
              course_code: target.code,
              course_id: target.course_id,
              course_year_id: target.course_year_id,
              baseline_draft_snapshot_id: target.draft_snapshot_id,
              baseline_published_snapshot_id: target.published_snapshot_id,
            })),
          )}
          returning id, position
        `;
        return {
          run,
          targets: insertedTargets.toSorted(
            (left, right) => left.position - right.position,
          ),
        };
      });
      runId = String(created.run.id);
      const targetOneId = String(created.targets[0].id);
      const targetTwoId = String(created.targets[1].id);

      const [claimOne] = await finisherOne`
        select * from private.claim_course_import_target(
          ${runId}::uuid,
          ${targetOneId}::uuid,
          ${"concurrency-message-one"}::text,
          ${workerOne}::uuid,
          ${600}::integer
        )
      `;
      const [claimTwo] = await finisherTwo`
        select * from private.claim_course_import_target(
          ${runId}::uuid,
          ${targetTwoId}::uuid,
          ${"concurrency-message-two"}::text,
          ${workerTwo}::uuid,
          ${600}::integer
        )
      `;

      await finisherOne`
        select set_config(
          ${"application_name"},
          ${"coursemap_import_finish_one"},
          false
        )
      `;
      await finisherTwo`
        select set_config(
          ${"application_name"},
          ${"coursemap_import_finish_two"},
          false
        )
      `;

      await blocker.unsafe("begin");
      blockerTransactionOpen = true;
      await blocker`
        select id
        from public.course_import_runs
        where id = ${runId}
        for update
      `;

      finishPromises = [
        (async () =>
          finisherOne`
            select private.finish_course_import_target(
              ${runId}::uuid,
              ${targetOneId}::uuid,
              ${"concurrency-message-one"}::text,
              ${workerOne}::uuid,
              ${claimOne.lock_version}::integer,
              ${"failed"}::text,
              null::text,
              null::bigint,
              null::bigint,
              null::bigint,
              null::bigint,
              ${"TEST_CONCURRENCY"}::text,
              ${"Intentional concurrency test failure."}::text
            )
          `)(),
        (async () =>
          finisherTwo`
            select private.finish_course_import_target(
              ${runId}::uuid,
              ${targetTwoId}::uuid,
              ${"concurrency-message-two"}::text,
              ${workerTwo}::uuid,
              ${claimTwo.lock_version}::integer,
              ${"failed"}::text,
              null::text,
              null::bigint,
              null::bigint,
              null::bigint,
              null::bigint,
              ${"TEST_CONCURRENCY"}::text,
              ${"Intentional concurrency test failure."}::text
            )
          `)(),
      ];

      await waitForBothFinishersToBlock(coordinator);
      await blocker.unsafe("commit");
      blockerTransactionOpen = false;
      await Promise.all(finishPromises);
      finishPromises = [];

      const [run] = await coordinator`
        select
          status,
          processed_count,
          failed_count,
          completed_at is not null as is_completed
        from public.course_import_runs
        where id = ${runId}
      `;
      assert.deepEqual(
        run,
        {
          status: "failed",
          processed_count: 2,
          failed_count: 2,
          is_completed: true,
        },
        "the last finisher must observe both completed targets",
      );
    } finally {
      if (blockerTransactionOpen) {
        await blocker.unsafe("rollback").catch(() => {});
      }
      if (finishPromises.length > 0) {
        await Promise.allSettled(finishPromises);
      }
      if (runId) {
        await coordinator`
          delete from public.course_import_runs where id = ${runId}
        `.catch(() => {});
      }
      await Promise.all([
        coordinator.end({ timeout: 5 }),
        finisherOne.end({ timeout: 5 }),
        finisherTwo.end({ timeout: 5 }),
        blocker.end({ timeout: 5 }),
      ]);
    }
  },
);
