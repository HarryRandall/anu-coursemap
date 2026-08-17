import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ANU_COURSE_PARSER_VERSION,
  ANU_PROGRAMS_AND_COURSES_SOURCE,
  parseAnuCourseDocument,
} from "../lib/catalogue-import/anu-programs-courses.ts";
import { parseCatalogueManifest } from "../lib/catalogue-import/manifest.ts";
import { withLocalCatalogueImportTransaction } from "../scripts/catalogue/lib/importer.mjs";
import { createLocalDatabaseClient } from "../scripts/catalogue/lib/local-database.mjs";

const catalogueYear = 2026;
const courseCode = "COMP2100";
const sourceUrl = "https://programsandcourses.anu.edu.au/2026/course/COMP2100";
const fetchedAt = "2026-08-14T01:02:03.000Z";
const expectedPrerequisite =
  "Successfully completed COMP1110 or COMP1140 AND 6 units of 1000 level MATH.";
const expectedIncompatibility = "Incompatible with COMP6442.";
const rejectedCourseCode = "ZZZZ9876";
const sessionConflictCourseCode = "ZZZZ9877";
const periodConflictCourseCodes = ["ZZZZ9878", "ZZZZ9879"];
const conflictCourseCodes = [
  sessionConflictCourseCode,
  ...periodConflictCourseCodes,
];
const rollbackSignal = new Error(
  "Intentional catalogue database integration test rollback",
);
const conflictRollbackSignal = new Error(
  "Intentional catalogue preflight integration test rollback",
);

const fixtureHtml = await readFile(
  new URL("./fixtures/catalogue/anu-2026-comp2100.html", import.meta.url),
  "utf8",
);

const document = parseAnuCourseDocument({
  html: fixtureHtml,
  sourceUrl,
  expectedCourseCode: courseCode,
  catalogueYear,
  fetchedAt,
  httpEtag: '"catalogue-db-fixture"',
  sourceLastModified: "Thu, 13 Aug 2026 02:15:00 GMT",
});

const manifest = parseCatalogueManifest({
  schemaVersion: 1,
  parserVersion: ANU_COURSE_PARSER_VERSION,
  catalogueYear,
  source: { ...ANU_PROGRAMS_AND_COURSES_SOURCE },
  scope: { kind: "course_codes", courseCodes: [courseCode] },
  documents: [document],
  diagnostics: [],
});

const changedPrerequisite = `${expectedPrerequisite} Permission from the course convener is also required.`;
const publicationRegressionManifest = (() => {
  const changed = structuredClone(manifest);
  const changedDocument = changed.documents[0];
  changedDocument.offering.sessions[0].deliveryMode = "Hybrid";
  changedDocument.offering.sessions[0].location = "Acton";
  changedDocument.offering.sessions[0].sourceFragment =
    "3699 changed to hybrid delivery at Acton";
  changedDocument.course.requisites.rawRequisiteText = changedPrerequisite;
  changedDocument.course.requisites.rawText = `${changedPrerequisite} ${expectedIncompatibility}`;
  const requisiteDiagnostic = changedDocument.diagnostics.find(
    ({ code }) => code === "UNSTRUCTURED_REQUISITE_TEXT",
  );
  if (requisiteDiagnostic) {
    requisiteDiagnostic.sourceFragment =
      changedDocument.course.requisites.rawText;
  }
  return parseCatalogueManifest(changed);
})();

function completeManifestWithoutOfferingAndRules(sourceRevision) {
  const changed = structuredClone(manifest);
  const changedDocument = changed.documents[0];
  changedDocument.contentSha256 = createHash("sha256")
    .update(`${fixtureHtml}\n${sourceRevision}`, "utf8")
    .digest("hex");
  changedDocument.fetchedAt = "2026-08-14T02:03:04.000Z";
  changedDocument.httpEtag = `"${sourceRevision}"`;
  changedDocument.periods = [];
  changedDocument.offeringObserved = true;
  delete changedDocument.offering;
  changedDocument.course.requisites = {
    observed: true,
    rawText: null,
    rawRequisiteText: null,
    rawIncompatibilityText: null,
    linkedCourseCodes: [],
  };
  changedDocument.diagnostics = [];
  changedDocument.sourceFragment = sourceRevision;
  return parseCatalogueManifest(changed);
}

const removalManifest = completeManifestWithoutOfferingAndRules(
  "complete-source-without-offering-or-rules",
);
const unobservedOfferingManifest = (() => {
  const unobserved = structuredClone(manifest);
  unobserved.documents[0].contentSha256 = createHash("sha256")
    .update(`${fixtureHtml}\noffering-section-not-observed`, "utf8")
    .digest("hex");
  unobserved.documents[0].fetchedAt = "2026-08-14T01:32:03.000Z";
  unobserved.documents[0].httpEtag = '"offering-section-not-observed"';
  unobserved.documents[0].offeringObserved = false;
  unobserved.documents[0].periods = [];
  delete unobserved.documents[0].offering;
  unobserved.documents[0].diagnostics.push({
    code: "OFFERING_SECTION_NOT_OBSERVED",
    severity: "warning",
    message: "The current-year offering section was not observed.",
    field: "offering",
    sourceFragment: "Offering selector drift fixture",
  });
  unobserved.documents[0].sourceFragment = "Unobserved offering fixture";
  return parseCatalogueManifest(unobserved);
})();
const unobservedRequisiteManifest = (() => {
  const unobserved = structuredClone(manifest);
  unobserved.documents[0].contentSha256 = createHash("sha256")
    .update(`${fixtureHtml}\nrequisite-section-not-observed`, "utf8")
    .digest("hex");
  unobserved.documents[0].fetchedAt = "2026-08-14T01:42:03.000Z";
  unobserved.documents[0].httpEtag = '"requisite-section-not-observed"';
  unobserved.documents[0].course.requisites = {
    observed: false,
    rawText: null,
    rawRequisiteText: null,
    rawIncompatibilityText: null,
    linkedCourseCodes: [],
  };
  unobserved.documents[0].diagnostics = [
    {
      code: "REQUISITE_SECTION_NOT_OBSERVED",
      severity: "warning",
      message: "The official requisite section was not observed.",
      field: "course.requisites",
      sourceFragment: "Requisite selector drift fixture",
    },
  ];
  unobserved.documents[0].sourceFragment = "Unobserved requisite fixture";
  return parseCatalogueManifest(unobserved);
})();
const structuredRulePreservationManifest =
  completeManifestWithoutOfferingAndRules(
    "complete-source-after-structured-rule-review",
  );

const rejectedManifest = (() => {
  const rejected = structuredClone(manifest);
  rejected.scope.courseCodes = [rejectedCourseCode];
  rejected.documents[0].externalKey = rejectedCourseCode;
  rejected.documents[0].canonicalUrl = `https://programsandcourses.anu.edu.au/2026/course/${rejectedCourseCode.toLowerCase()}`;
  rejected.documents[0].contentSha256 = createHash("sha256")
    .update(`${fixtureHtml}\nfatal-source-fact-conflict`, "utf8")
    .digest("hex");
  rejected.documents[0].course.code = rejectedCourseCode;
  rejected.documents[0].diagnostics = [
    {
      code: "SOURCE_FACT_CONFLICT",
      severity: "error",
      message: "The official source supplied conflicting course titles.",
      field: "course.title",
      sourceFragment: "Conflicting title fixture",
    },
  ];
  rejected.documents[0].sourceFragment = "Fatal source fact conflict fixture";
  return parseCatalogueManifest(rejected);
})();

function documentForSyntheticCourse(code, sourceRevision) {
  const synthetic = structuredClone(manifest.documents[0]);
  synthetic.externalKey = code;
  synthetic.canonicalUrl = `https://programsandcourses.anu.edu.au/2026/course/${code}`;
  synthetic.contentSha256 = createHash("sha256")
    .update(`${fixtureHtml}\n${sourceRevision}`, "utf8")
    .digest("hex");
  synthetic.course.code = code;
  synthetic.sourceFragment = sourceRevision;
  return synthetic;
}

const sessionConflictManifest = (() => {
  const conflictDocument = documentForSyntheticCourse(
    sessionConflictCourseCode,
    "same-period session conflict fixture",
  );
  const conflictingSession = structuredClone(
    conflictDocument.offering.sessions[0],
  );
  conflictingSession.deliveryMode = "Online";
  conflictingSession.location = "Online";
  conflictingSession.classNumber = "9999";
  conflictingSession.sourceFragment =
    "Conflicting online class for the same S1 period";
  conflictDocument.offering.sessions.push(conflictingSession);
  return parseCatalogueManifest({
    ...structuredClone(manifest),
    scope: {
      kind: "course_codes",
      courseCodes: [sessionConflictCourseCode],
    },
    documents: [conflictDocument],
  });
})();

const periodConflictManifest = (() => {
  const documents = periodConflictCourseCodes.map((code, index) =>
    documentForSyntheticCourse(
      code,
      `academic period conflict fixture ${index}`,
    ),
  );
  const conflictingPeriod = documents[1].periods.find(
    ({ code }) => code === "S1",
  );
  conflictingPeriod.name = "Conflicting First Semester";
  return parseCatalogueManifest({
    ...structuredClone(manifest),
    scope: {
      kind: "course_codes",
      courseCodes: [...periodConflictCourseCodes],
    },
    documents,
  });
})();

const testContentHashes = new Set([
  document.contentSha256,
  unobservedOfferingManifest.documents[0].contentSha256,
  unobservedRequisiteManifest.documents[0].contentSha256,
  removalManifest.documents[0].contentSha256,
  structuredRulePreservationManifest.documents[0].contentSha256,
  rejectedManifest.documents[0].contentSha256,
]);

function serialise(value) {
  return JSON.parse(
    JSON.stringify(value, (_, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
}

async function domainState(sql) {
  const sources = await sql`
    select to_jsonb(sources) as value
    from public.catalogue_sources as sources
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
    order by sources.id
  `;
  const years = await sql`
    select to_jsonb(years) as value
    from public.catalogue_years as years
    where years.year = ${catalogueYear}
    order by years.id
  `;
  const documents = await sql`
    select to_jsonb(documents) as value
    from public.catalogue_source_documents as documents
    join public.catalogue_sources as sources on sources.id = documents.source_id
    join public.catalogue_years as years on years.id = documents.catalogue_year_id
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
      and years.year = ${catalogueYear}
      and documents.entity_kind = 'course'
      and documents.external_key = ${courseCode}
    order by documents.id
  `;
  const testDocuments = documents.filter(({ value }) =>
    testContentHashes.has(value.content_sha256),
  );
  const courses = await sql`
    select to_jsonb(courses) as value
    from public.courses as courses
    where courses.code = ${courseCode}
    order by courses.id
  `;
  const versions = await sql`
    select to_jsonb(versions) as value
    from public.course_versions as versions
    join public.courses as courses on courses.id = versions.course_id
    join public.catalogue_years as years on years.id = versions.catalogue_year_id
    where courses.code = ${courseCode} and years.year = ${catalogueYear}
    order by versions.id
  `;
  const periods = await sql`
    select to_jsonb(periods) as value
    from public.academic_periods as periods
    where periods.calendar_year = ${catalogueYear}
      and periods.code in ('S1', 'S2')
    order by periods.code
  `;
  const offerings = await sql`
    select to_jsonb(offerings) as value
    from public.course_offerings as offerings
    join public.course_versions as versions on versions.id = offerings.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    join public.catalogue_years as years on years.id = versions.catalogue_year_id
    where courses.code = ${courseCode} and years.year = ${catalogueYear}
    order by offerings.id
  `;
  const sessions = await sql`
    select to_jsonb(sessions) as value
    from public.offering_sessions as sessions
    join public.course_offerings as offerings on offerings.id = sessions.course_offering_id
    join public.course_versions as versions on versions.id = offerings.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    join public.academic_periods as periods on periods.id = sessions.academic_period_id
    where courses.code = ${courseCode} and periods.calendar_year = ${catalogueYear}
    order by periods.code, sessions.id
  `;
  const rules = await sql`
    select
      to_jsonb(rules) as rule,
      to_jsonb(groups) as root_group,
      to_jsonb(conditions) as condition
    from public.course_rules as rules
    join public.course_versions as versions on versions.id = rules.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    join public.catalogue_years as years on years.id = versions.catalogue_year_id
    join public.course_rule_groups as groups
      on groups.course_rule_id = rules.id and groups.parent_group_id is null
    join public.course_rule_conditions as conditions
      on conditions.course_rule_id = rules.id and conditions.group_id = groups.id
    where courses.code = ${courseCode} and years.year = ${catalogueYear}
    order by rules.rule_kind, conditions.position
  `;

  return serialise({
    sources,
    years,
    documents: testDocuments,
    courses,
    versions,
    periods,
    offerings,
    sessions,
    rules,
  });
}

async function relevantDatabaseState(sql) {
  const domain = await domainState(sql);
  const runs = await sql`
    select to_jsonb(runs) as value
    from public.catalogue_import_runs as runs
    join public.catalogue_sources as sources on sources.id = runs.source_id
    join public.catalogue_years as years on years.id = runs.catalogue_year_id
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
      and years.year = ${catalogueYear}
      and runs.scope = ${`course_codes:${courseCode}`}
      and runs.parser_version = ${manifest.parserVersion}
    order by runs.id
  `;
  const items = await sql`
    select to_jsonb(items) as value
    from public.catalogue_import_items as items
    join public.catalogue_import_runs as runs on runs.id = items.run_id
    join public.catalogue_sources as sources on sources.id = runs.source_id
    join public.catalogue_years as years on years.id = runs.catalogue_year_id
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
      and years.year = ${catalogueYear}
      and runs.scope = ${`course_codes:${courseCode}`}
      and runs.parser_version = ${manifest.parserVersion}
    order by items.id
  `;
  const reviews = await sql`
    select to_jsonb(reviews) as value
    from public.catalogue_review_items as reviews
    join public.catalogue_import_items as items on items.id = reviews.import_item_id
    join public.catalogue_import_runs as runs on runs.id = items.run_id
    join public.catalogue_sources as sources on sources.id = runs.source_id
    join public.catalogue_years as years on years.id = runs.catalogue_year_id
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
      and years.year = ${catalogueYear}
      and runs.scope = ${`course_codes:${courseCode}`}
      and runs.parser_version = ${manifest.parserVersion}
    order by reviews.id
  `;

  const rejected = await rejectedCourseState(sql);

  return serialise({ domain, runs, items, reviews, rejected });
}

async function rejectedCourseState(sql) {
  const documents = await sql`
    select to_jsonb(documents) as value
    from public.catalogue_source_documents as documents
    join public.catalogue_sources as sources on sources.id = documents.source_id
    join public.catalogue_years as years on years.id = documents.catalogue_year_id
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
      and years.year = ${catalogueYear}
      and documents.external_key = ${rejectedCourseCode}
      and documents.content_sha256 = ${rejectedManifest.documents[0].contentSha256}
    order by documents.id
  `;
  const courses = await sql`
    select to_jsonb(courses) as value
    from public.courses as courses
    where courses.code = ${rejectedCourseCode}
    order by courses.id
  `;
  const versions = await sql`
    select to_jsonb(versions) as value
    from public.course_versions as versions
    join public.courses as courses on courses.id = versions.course_id
    join public.catalogue_years as years on years.id = versions.catalogue_year_id
    where courses.code = ${rejectedCourseCode} and years.year = ${catalogueYear}
    order by versions.id
  `;
  const runs = await sql`
    select to_jsonb(runs) as value
    from public.catalogue_import_runs as runs
    join public.catalogue_sources as sources on sources.id = runs.source_id
    join public.catalogue_years as years on years.id = runs.catalogue_year_id
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
      and years.year = ${catalogueYear}
      and runs.scope = ${`course_codes:${rejectedCourseCode}`}
      and runs.parser_version = ${manifest.parserVersion}
    order by runs.id
  `;
  const items = await sql`
    select to_jsonb(items) as value
    from public.catalogue_import_items as items
    join public.catalogue_import_runs as runs on runs.id = items.run_id
    where runs.id in (
      select matching_runs.id
      from public.catalogue_import_runs as matching_runs
      join public.catalogue_sources as sources on sources.id = matching_runs.source_id
      join public.catalogue_years as years on years.id = matching_runs.catalogue_year_id
      where sources.kind = ${manifest.source.kind}
        and sources.base_url = ${manifest.source.baseUrl}
        and years.year = ${catalogueYear}
        and matching_runs.scope = ${`course_codes:${rejectedCourseCode}`}
        and matching_runs.parser_version = ${manifest.parserVersion}
    )
    order by items.id
  `;

  return serialise({ documents, courses, versions, runs, items });
}

async function conflictDomainState(sql) {
  const periods = await sql`
    select to_jsonb(periods) as value
    from public.academic_periods as periods
    where periods.calendar_year = ${catalogueYear}
      and periods.code in ('S1', 'S2')
    order by periods.code
  `;
  const courses = await sql`
    select to_jsonb(courses) as value
    from public.courses as courses
    where courses.code in ${sql(conflictCourseCodes)}
    order by courses.code
  `;
  const versions = await sql`
    select to_jsonb(versions) as value
    from public.course_versions as versions
    join public.courses as courses on courses.id = versions.course_id
    where courses.code in ${sql(conflictCourseCodes)}
    order by courses.code, versions.id
  `;
  const offerings = await sql`
    select to_jsonb(offerings) as value
    from public.course_offerings as offerings
    join public.course_versions as versions on versions.id = offerings.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    where courses.code in ${sql(conflictCourseCodes)}
    order by courses.code, offerings.id
  `;
  const sessions = await sql`
    select to_jsonb(sessions) as value
    from public.offering_sessions as sessions
    join public.course_offerings as offerings on offerings.id = sessions.course_offering_id
    join public.course_versions as versions on versions.id = offerings.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    where courses.code in ${sql(conflictCourseCodes)}
    order by courses.code, sessions.id
  `;
  const rules = await sql`
    select to_jsonb(rules) as value
    from public.course_rules as rules
    join public.course_versions as versions on versions.id = rules.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    where courses.code in ${sql(conflictCourseCodes)}
    order by courses.code, rules.id
  `;
  return serialise({ offerings, periods, courses, rules, sessions, versions });
}

async function conflictDatabaseState(sql) {
  const domain = await conflictDomainState(sql);
  const documents = await sql`
    select to_jsonb(documents) as value
    from public.catalogue_source_documents as documents
    join public.catalogue_sources as sources on sources.id = documents.source_id
    join public.catalogue_years as years on years.id = documents.catalogue_year_id
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
      and years.year = ${catalogueYear}
      and documents.external_key in ${sql(conflictCourseCodes)}
    order by documents.external_key, documents.id
  `;
  const runs = await sql`
    select to_jsonb(runs) as value
    from public.catalogue_import_runs as runs
    join public.catalogue_sources as sources on sources.id = runs.source_id
    join public.catalogue_years as years on years.id = runs.catalogue_year_id
    where sources.kind = ${manifest.source.kind}
      and sources.base_url = ${manifest.source.baseUrl}
      and years.year = ${catalogueYear}
      and runs.scope in (
        ${`course_codes:${sessionConflictCourseCode}`},
        ${`course_codes:${periodConflictCourseCodes.join(",")}`}
      )
    order by runs.id
  `;
  const items = await sql`
    select to_jsonb(items) as value
    from public.catalogue_import_items as items
    where items.target_key in ${sql(conflictCourseCodes)}
    order by items.id
  `;
  const reviews = await sql`
    select to_jsonb(reviews) as value
    from public.catalogue_review_items as reviews
    join public.catalogue_import_items as items on items.id = reviews.import_item_id
    where items.target_key in ${sql(conflictCourseCodes)}
    order by reviews.id
  `;
  return serialise({ documents, domain, items, reviews, runs });
}

test(
  "imports the reduced COMP2100 manifest idempotently and rolls every row back",
  { timeout: 60_000 },
  async () => {
    const sql = await createLocalDatabaseClient();
    const before = await relevantDatabaseState(sql);
    const runIds = [];

    try {
      await assert.rejects(
        withLocalCatalogueImportTransaction(
          sql,
          async ({ tx, importManifest }) => {
            // Make the domain import deterministic without changing durable local
            // state. Any previous local version is restored by the outer rollback.
            await tx`
            delete from public.course_versions as versions
            using public.courses as courses, public.catalogue_years as years
            where versions.course_id = courses.id
              and versions.catalogue_year_id = years.id
              and courses.code = ${courseCode}
              and years.year = ${catalogueYear}
          `;
            await tx`
            update public.academic_periods
            set status = 'draft'
            where calendar_year = ${catalogueYear}
              and code in ('S1', 'S2')
              and status <> 'draft'
          `;

            const first = await importManifest(manifest);
            runIds.push(first.runId);
            assert.deepEqual(first, {
              counts: {
                added: 1,
                changed: 0,
                checked: 1,
                failed: 0,
                unchanged: 0,
              },
              runId: first.runId,
              status: "succeeded",
            });

            const firstDomainState = await domainState(tx);
            assert.equal(firstDomainState.sources.length, 1);
            assert.equal(firstDomainState.documents.length, 1);
            assert.equal(
              firstDomainState.documents[0].value.content_sha256,
              document.contentSha256,
            );
            assert.equal(
              firstDomainState.documents[0].value.canonical_url,
              document.canonicalUrl,
            );
            assert.equal(firstDomainState.versions.length, 1);
            assert.equal(
              firstDomainState.versions[0].value.publication_status,
              "draft",
            );
            assert.equal(
              firstDomainState.versions[0].value.review_state,
              "review",
            );
            assert.deepEqual(
              firstDomainState.periods.map(({ value }) => [
                value.code,
                value.status,
              ]),
              [
                ["S1", "draft"],
                ["S2", "draft"],
              ],
            );
            assert.equal(firstDomainState.offerings.length, 1);
            assert.equal(firstDomainState.offerings[0].value.status, "draft");
            assert.equal(firstDomainState.sessions.length, 2);

            assert.deepEqual(
              firstDomainState.rules.map(({ rule, root_group, condition }) => ({
                conditionKind: condition.condition_kind,
                conditionReviewState: condition.review_state,
                conditionSourceText: condition.source_text,
                confidence: Number(rule.confidence),
                freeText: condition.free_text,
                groupOperator: root_group.operator,
                reviewState: rule.review_state,
                ruleKind: rule.rule_kind,
                sourceText: rule.source_text,
              })),
              [
                {
                  conditionKind: "other",
                  conditionReviewState: "review",
                  conditionSourceText: expectedIncompatibility,
                  confidence: 0,
                  freeText: expectedIncompatibility,
                  groupOperator: "all_of",
                  reviewState: "review",
                  ruleKind: "incompatibility",
                  sourceText: expectedIncompatibility,
                },
                {
                  conditionKind: "other",
                  conditionReviewState: "review",
                  conditionSourceText: expectedPrerequisite,
                  confidence: 0,
                  freeText: expectedPrerequisite,
                  groupOperator: "all_of",
                  reviewState: "review",
                  ruleKind: "prerequisite",
                  sourceText: expectedPrerequisite,
                },
              ],
            );

            const prerequisiteReferences = await tx`
              select referenced_courses.code, rule_references.review_state
              from public.course_rule_course_references as rule_references
              join public.course_rules as rules
                on rules.id = rule_references.course_rule_id
              join public.courses as referenced_courses
                on referenced_courses.id = rule_references.referenced_course_id
              where rules.course_version_id = ${firstDomainState.versions[0].value.id}
                and rules.rule_kind = 'prerequisite'
              order by referenced_courses.code
            `;
            assert.deepEqual(
              [...prerequisiteReferences],
              [
                { code: "COMP1110", review_state: "review" },
                { code: "COMP1140", review_state: "review" },
              ],
            );

            const firstItems = await tx`
            select
              items.outcome,
              items.source_document_id,
              items.target_key,
              items.target_kind,
              items.diagnostics
            from public.catalogue_import_items as items
            where items.run_id = ${first.runId}
          `;
            assert.equal(firstItems.length, 1);
            assert.equal(firstItems[0].outcome, "review");
            assert.equal(firstItems[0].target_key, courseCode);
            assert.equal(firstItems[0].target_kind, "course_version");
            assert.equal(firstItems[0].diagnostics.semanticOutcome, "created");

            const firstReviews = await tx`
            select reviews.issue_code, reviews.status, reviews.details
            from public.catalogue_review_items as reviews
            join public.catalogue_import_items as items
              on items.id = reviews.import_item_id
            where items.run_id = ${first.runId}
            order by reviews.issue_code, reviews.id
          `;
            assert.deepEqual(
              firstReviews.map(({ issue_code: issueCode }) => issueCode),
              [
                "ACADEMIC_PERIOD_DERIVED_FROM_CLASS_DATES",
                "ACADEMIC_PERIOD_DERIVED_FROM_CLASS_DATES",
                "COURSE_RULE_REQUIRES_REVIEW",
                "COURSE_RULE_REQUIRES_REVIEW",
                "UNSTRUCTURED_REQUISITE_TEXT",
              ],
            );
            for (const review of firstReviews) {
              assert.equal(review.status, "open");
              assert.equal(review.details.canonicalUrl, document.canonicalUrl);
              assert.equal(review.details.externalKey, courseCode);
            }

            const second = await importManifest(manifest);
            runIds.push(second.runId);
            assert.deepEqual(second, {
              counts: {
                added: 0,
                changed: 0,
                checked: 1,
                failed: 0,
                unchanged: 1,
              },
              runId: second.runId,
              status: "succeeded",
            });
            assert.notEqual(second.runId, first.runId);

            const secondDomainState = await domainState(tx);
            assert.deepEqual(secondDomainState, firstDomainState);

            const importItems = await tx`
            select run_id, source_document_id, diagnostics
            from public.catalogue_import_items
            where run_id in (${first.runId}, ${second.runId})
            order by created_at, id
          `;
            assert.equal(importItems.length, 2);
            assert.equal(
              importItems[0].source_document_id,
              importItems[1].source_document_id,
            );
            assert.deepEqual(
              importItems.map(({ diagnostics }) => diagnostics.semanticOutcome),
              ["created", "unchanged"],
            );

            const [rawPrerequisite] = await tx`
              select
                rules.id as rule_id,
                groups.id as group_id,
                conditions.id as condition_id
              from public.course_rules as rules
              join public.course_rule_groups as groups
                on groups.course_rule_id = rules.id
                and groups.parent_group_id is null
              join public.course_rule_conditions as conditions
                on conditions.course_rule_id = rules.id
                and conditions.group_id = groups.id
              where rules.course_version_id = ${firstDomainState.versions[0].value.id}
                and rules.rule_kind = 'prerequisite'
            `;
            await tx`
              update public.course_rules
              set
                source_text = ${expectedPrerequisite},
                source_document_id = ${firstItems[0].source_document_id},
                review_state = 'verified',
                confidence = 1
              where id = ${rawPrerequisite.rule_id}
            `;
            await tx`
              update public.course_rule_conditions
              set
                condition_kind = 'units_total',
                required_course_id = null,
                required_structure_id = null,
                minimum_units = 6,
                minimum_mark = null,
                subject_code = null,
                minimum_course_level = null,
                maximum_course_level = null,
                free_text = null,
                source_text = ${expectedPrerequisite},
                confidence = 1,
                review_state = 'verified'
              where id = ${rawPrerequisite.condition_id}
            `;
            await tx`
              update public.course_versions
              set publication_status = 'published', review_state = 'verified'
              where id = ${firstDomainState.versions[0].value.id}
            `;

            const [manuallyStructuredBefore] = await tx`
              select
                to_jsonb(rules) as rule,
                to_jsonb(groups) as root_group,
                to_jsonb(conditions) as condition
              from public.course_rules as rules
              join public.course_rule_groups as groups
                on groups.id = ${rawPrerequisite.group_id}
              join public.course_rule_conditions as conditions
                on conditions.id = ${rawPrerequisite.condition_id}
              where rules.id = ${rawPrerequisite.rule_id}
            `;
            const [publishedVersionBefore] = await tx`
              select to_jsonb(versions) as value
              from public.course_versions as versions
              where versions.id = ${firstDomainState.versions[0].value.id}
            `;

            const manuallyStructuredRerun = await importManifest(manifest);
            runIds.push(manuallyStructuredRerun.runId);
            assert.deepEqual(manuallyStructuredRerun, {
              counts: {
                added: 0,
                changed: 0,
                checked: 1,
                failed: 0,
                unchanged: 1,
              },
              runId: manuallyStructuredRerun.runId,
              status: "succeeded",
            });

            const [manuallyStructuredAfter] = await tx`
              select
                to_jsonb(rules) as rule,
                to_jsonb(groups) as root_group,
                to_jsonb(conditions) as condition
              from public.course_rules as rules
              join public.course_rule_groups as groups
                on groups.id = ${rawPrerequisite.group_id}
              join public.course_rule_conditions as conditions
                on conditions.id = ${rawPrerequisite.condition_id}
              where rules.id = ${rawPrerequisite.rule_id}
            `;
            const [publishedVersionAfter] = await tx`
              select to_jsonb(versions) as value
              from public.course_versions as versions
              where versions.id = ${firstDomainState.versions[0].value.id}
            `;
            assert.deepEqual(
              serialise(manuallyStructuredAfter),
              serialise(manuallyStructuredBefore),
            );
            assert.deepEqual(
              serialise(publishedVersionAfter),
              serialise(publishedVersionBefore),
            );
            assert.equal(manuallyStructuredAfter.rule.review_state, "verified");
            assert.equal(Number(manuallyStructuredAfter.rule.confidence), 1);
            assert.equal(
              manuallyStructuredAfter.rule.source_text,
              manifest.documents[0].course.requisites.rawRequisiteText,
            );
            assert.equal(
              String(manuallyStructuredAfter.rule.source_document_id),
              String(firstItems[0].source_document_id),
            );
            assert.equal(
              manuallyStructuredAfter.condition.condition_kind,
              "units_total",
            );
            assert.equal(
              manuallyStructuredAfter.condition.review_state,
              "verified",
            );
            assert.equal(
              publishedVersionAfter.value.publication_status,
              "published",
            );
            assert.equal(publishedVersionAfter.value.review_state, "verified");
            const [manuallyStructuredItem] = await tx`
              select source_document_id, diagnostics
              from public.catalogue_import_items
              where run_id = ${manuallyStructuredRerun.runId}
            `;
            assert.equal(
              manuallyStructuredItem.source_document_id,
              firstItems[0].source_document_id,
            );
            assert.equal(
              manuallyStructuredItem.diagnostics.semanticOutcome,
              "unchanged",
            );

            // Restore the prerequisite tree to the importer-owned raw shape so
            // the next regression can prove a changed raw rule republishes as a draft.
            await tx`
              update public.course_rules
              set review_state = 'review', confidence = 0
              where id = ${rawPrerequisite.rule_id}
            `;
            await tx`
              update public.course_rule_conditions
              set
                condition_kind = 'other',
                required_course_id = null,
                required_structure_id = null,
                minimum_units = null,
                minimum_mark = null,
                subject_code = null,
                minimum_course_level = null,
                maximum_course_level = null,
                free_text = ${expectedPrerequisite},
                source_text = ${expectedPrerequisite},
                confidence = 0,
                review_state = 'review'
              where id = ${rawPrerequisite.condition_id}
            `;

            await tx`
              update public.course_versions
              set publication_status = 'published', review_state = 'verified'
              where id = ${firstDomainState.versions[0].value.id}
            `;
            await tx`
              update public.course_offerings
              set status = 'published'
              where id = ${firstDomainState.offerings[0].value.id}
            `;

            const publicationRegression = await importManifest(
              publicationRegressionManifest,
            );
            runIds.push(publicationRegression.runId);
            assert.deepEqual(publicationRegression, {
              counts: {
                added: 0,
                changed: 1,
                checked: 1,
                failed: 0,
                unchanged: 0,
              },
              runId: publicationRegression.runId,
              status: "succeeded",
            });

            const publicationRegressionState = await domainState(tx);
            assert.equal(publicationRegressionState.documents.length, 1);
            assert.equal(
              publicationRegressionState.documents[0].value.content_sha256,
              document.contentSha256,
            );
            assert.equal(
              publicationRegressionState.versions[0].value.publication_status,
              "draft",
            );
            assert.equal(
              publicationRegressionState.versions[0].value.review_state,
              "review",
            );
            assert.equal(
              publicationRegressionState.offerings[0].value.status,
              "draft",
            );
            const changedSession = publicationRegressionState.sessions.find(
              ({ value }) => value.delivery_mode === "Hybrid",
            );
            assert.ok(changedSession);
            assert.equal(changedSession.value.location, "Acton");
            const changedRule = publicationRegressionState.rules.find(
              ({ rule }) => rule.rule_kind === "prerequisite",
            );
            assert.ok(changedRule);
            assert.equal(changedRule.rule.source_text, changedPrerequisite);
            assert.equal(changedRule.condition.free_text, changedPrerequisite);
            assert.equal(
              changedRule.condition.source_text,
              changedPrerequisite,
            );
            const [publicationItem] = await tx`
              select source_document_id, diagnostics
              from public.catalogue_import_items
              where run_id = ${publicationRegression.runId}
            `;
            assert.equal(
              publicationItem.source_document_id,
              firstItems[0].source_document_id,
            );
            assert.equal(
              publicationItem.diagnostics.semanticOutcome,
              "updated",
            );

            const unobserved = await importManifest(unobservedOfferingManifest);
            runIds.push(unobserved.runId);
            assert.deepEqual(unobserved, {
              counts: {
                added: 0,
                changed: 1,
                checked: 1,
                failed: 0,
                unchanged: 0,
              },
              runId: unobserved.runId,
              status: "succeeded",
            });
            const unobservedDomainState = await domainState(tx);
            assert.deepEqual(
              unobservedDomainState.offerings,
              publicationRegressionState.offerings,
            );
            assert.deepEqual(
              unobservedDomainState.sessions,
              publicationRegressionState.sessions,
            );
            const unobservedReviews = await tx`
            select reviews.issue_code
            from public.catalogue_review_items as reviews
            join public.catalogue_import_items as items
              on items.id = reviews.import_item_id
            where items.run_id = ${unobserved.runId}
            order by reviews.issue_code, reviews.id
          `;
            assert.ok(
              unobservedReviews.some(
                ({ issue_code: issueCode }) =>
                  issueCode === "OFFERING_SOURCE_REMOVAL_PRESERVED",
              ),
            );

            const unobservedRequisites = await importManifest(
              unobservedRequisiteManifest,
            );
            runIds.push(unobservedRequisites.runId);
            assert.deepEqual(unobservedRequisites, {
              counts: {
                added: 0,
                changed: 1,
                checked: 1,
                failed: 0,
                unchanged: 0,
              },
              runId: unobservedRequisites.runId,
              status: "succeeded",
            });
            const unobservedRequisiteDomainState = await domainState(tx);
            assert.deepEqual(
              unobservedRequisiteDomainState.rules,
              unobservedDomainState.rules,
            );
            const unobservedRequisiteReviews = await tx`
              select reviews.issue_code, reviews.status
              from public.catalogue_review_items as reviews
              join public.catalogue_import_items as items
                on items.id = reviews.import_item_id
              where items.run_id = ${unobservedRequisites.runId}
              order by reviews.issue_code, reviews.id
            `;
            assert.deepEqual(
              [...unobservedRequisiteReviews],
              [
                {
                  issue_code: "ACADEMIC_PERIOD_DERIVED_FROM_CLASS_DATES",
                  status: "open",
                },
                {
                  issue_code: "ACADEMIC_PERIOD_DERIVED_FROM_CLASS_DATES",
                  status: "open",
                },
                {
                  issue_code: "COURSE_RULE_RECONCILIATION_DEFERRED",
                  status: "open",
                },
                {
                  issue_code: "REQUISITE_SECTION_NOT_OBSERVED",
                  status: "open",
                },
              ],
            );

            const removed = await importManifest(removalManifest);
            runIds.push(removed.runId);
            assert.deepEqual(removed, {
              counts: {
                added: 0,
                changed: 1,
                checked: 1,
                failed: 0,
                unchanged: 0,
              },
              runId: removed.runId,
              status: "succeeded",
            });

            const removedDomainState = await domainState(tx);
            const removalDocument = removedDomainState.documents.find(
              ({ value }) =>
                value.content_sha256 ===
                removalManifest.documents[0].contentSha256,
            );
            assert.ok(removalDocument);
            assert.equal(removedDomainState.documents.length, 4);
            assert.equal(removedDomainState.versions.length, 1);
            assert.equal(
              removedDomainState.versions[0].value.publication_status,
              "draft",
            );
            assert.equal(
              removedDomainState.versions[0].value.review_state,
              "review",
            );
            assert.equal(removedDomainState.offerings.length, 1);
            assert.equal(
              removedDomainState.offerings[0].value.status,
              "cancelled",
            );
            assert.equal(
              removedDomainState.offerings[0].value.source_document_id,
              removalDocument.value.id,
            );
            assert.equal(removedDomainState.sessions.length, 0);
            assert.equal(removedDomainState.rules.length, 0);

            const verifiedSourceText =
              "Verified structured prerequisite retained by reconciliation";
            const [verifiedRule] = await tx`
            insert into public.course_rules (
              course_version_id,
              catalogue_year_id,
              rule_kind,
              hardness,
              source_text,
              review_state,
              confidence,
              source_document_id
            )
            values (
              ${removedDomainState.versions[0].value.id},
              ${removedDomainState.versions[0].value.catalogue_year_id},
              'prerequisite',
              'hard',
              ${verifiedSourceText},
              'verified',
              1,
              ${removalDocument.value.id}
            )
            returning id
          `;
            const [verifiedGroup] = await tx`
            insert into public.course_rule_groups (
              course_rule_id,
              parent_group_id,
              operator,
              position
            )
            values (${verifiedRule.id}, null, 'all_of', 0)
            returning id
          `;
            const [verifiedCondition] = await tx`
            insert into public.course_rule_conditions (
              course_rule_id,
              group_id,
              condition_kind,
              minimum_units,
              source_text,
              confidence,
              review_state,
              position
            )
            values (
              ${verifiedRule.id},
              ${verifiedGroup.id},
              'units_total',
              6,
              ${verifiedSourceText},
              1,
              'verified',
              0
            )
            returning id
          `;

            const preserved = await importManifest(
              structuredRulePreservationManifest,
            );
            runIds.push(preserved.runId);
            assert.deepEqual(preserved, {
              counts: {
                added: 0,
                changed: 1,
                checked: 1,
                failed: 0,
                unchanged: 0,
              },
              runId: preserved.runId,
              status: "succeeded",
            });

            const [preservedRule] = await tx`
            select
              rules.id,
              rules.source_text,
              rules.review_state,
              rules.confidence,
              groups.id as group_id,
              groups.operator,
              conditions.id as condition_id,
              conditions.condition_kind,
              conditions.minimum_units,
              conditions.source_text as condition_source_text,
              conditions.review_state as condition_review_state,
              conditions.confidence as condition_confidence
            from public.course_rules as rules
            join public.course_rule_groups as groups
              on groups.course_rule_id = rules.id and groups.parent_group_id is null
            join public.course_rule_conditions as conditions
              on conditions.course_rule_id = rules.id and conditions.group_id = groups.id
            where rules.id = ${verifiedRule.id}
          `;
            assert.deepEqual(
              {
                conditionConfidence: Number(preservedRule.condition_confidence),
                conditionId: preservedRule.condition_id,
                conditionKind: preservedRule.condition_kind,
                conditionReviewState: preservedRule.condition_review_state,
                conditionSourceText: preservedRule.condition_source_text,
                confidence: Number(preservedRule.confidence),
                groupId: preservedRule.group_id,
                minimumUnits: Number(preservedRule.minimum_units),
                operator: preservedRule.operator,
                reviewState: preservedRule.review_state,
                ruleId: preservedRule.id,
                sourceText: preservedRule.source_text,
              },
              {
                conditionConfidence: 1,
                conditionId: verifiedCondition.id,
                conditionKind: "units_total",
                conditionReviewState: "verified",
                conditionSourceText: verifiedSourceText,
                confidence: 1,
                groupId: verifiedGroup.id,
                minimumUnits: 6,
                operator: "all_of",
                reviewState: "verified",
                ruleId: verifiedRule.id,
                sourceText: verifiedSourceText,
              },
            );

            const preservationReviews = await tx`
            select reviews.issue_code, reviews.status
            from public.catalogue_review_items as reviews
            join public.catalogue_import_items as items
              on items.id = reviews.import_item_id
            where items.run_id = ${preserved.runId}
            order by reviews.issue_code
          `;
            assert.deepEqual(
              [...preservationReviews],
              [
                {
                  issue_code: "STRUCTURED_RULE_SOURCE_REMOVAL_PRESERVED",
                  status: "open",
                },
              ],
            );

            const preservedDomainState = await domainState(tx);
            assert.equal(
              preservedDomainState.offerings[0].value.status,
              "cancelled",
            );
            assert.equal(preservedDomainState.sessions.length, 0);
            assert.equal(preservedDomainState.rules.length, 1);

            const rejected = await importManifest(rejectedManifest);
            runIds.push(rejected.runId);
            assert.deepEqual(rejected, {
              counts: {
                added: 0,
                changed: 0,
                checked: 1,
                failed: 1,
                unchanged: 0,
              },
              runId: rejected.runId,
              status: "failed",
            });

            const rejectedState = await rejectedCourseState(tx);
            assert.equal(rejectedState.documents.length, 1);
            assert.equal(
              rejectedState.documents[0].value.content_sha256,
              rejectedManifest.documents[0].contentSha256,
            );
            assert.equal(rejectedState.courses.length, 0);
            assert.equal(rejectedState.versions.length, 0);
            const [rejectedItem] = await tx`
            select items.outcome, items.target_key, items.diagnostics
            from public.catalogue_import_items as items
            where items.run_id = ${rejected.runId}
          `;
            assert.equal(rejectedItem.outcome, "failed");
            assert.equal(rejectedItem.target_key, rejectedCourseCode);
            assert.equal(rejectedItem.diagnostics.semanticOutcome, "failed");
            const rejectedReviews = await tx`
            select reviews.issue_code, reviews.status, reviews.details
            from public.catalogue_review_items as reviews
            join public.catalogue_import_items as items
              on items.id = reviews.import_item_id
            where items.run_id = ${rejected.runId}
          `;
            assert.equal(rejectedReviews.length, 1);
            assert.equal(rejectedReviews[0].issue_code, "SOURCE_FACT_CONFLICT");
            assert.equal(rejectedReviews[0].status, "open");
            assert.equal(
              rejectedReviews[0].details.externalKey,
              rejectedCourseCode,
            );

            throw rollbackSignal;
          },
        ),
        (error) => error === rollbackSignal,
      );

      assert.equal(runIds.length, 9);
      for (const runId of runIds) {
        const [cleanup] = await sql`
          select
            not exists (
              select 1 from public.catalogue_import_runs where id = ${runId}
            ) as run_absent,
            not exists (
              select 1 from public.catalogue_import_items where run_id = ${runId}
            ) as items_absent
        `;
        assert.equal(cleanup.run_absent, true);
        assert.equal(cleanup.items_absent, true);
      }

      const after = await relevantDatabaseState(sql);
      assert.deepEqual(after, before);
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
);

test(
  "imports conflicting sessions and academic period definitions for review",
  { timeout: 60_000 },
  async () => {
    const sql = await createLocalDatabaseClient();
    const before = await conflictDatabaseState(sql);
    const runIds = [];

    try {
      await assert.rejects(
        withLocalCatalogueImportTransaction(
          sql,
          async ({ tx, importManifest }) => {
            const domainBefore = await conflictDomainState(tx);

            const sessionConflict = await importManifest(
              sessionConflictManifest,
            );
            runIds.push(sessionConflict.runId);
            assert.deepEqual(sessionConflict, {
              counts: {
                added: 1,
                changed: 0,
                checked: 1,
                failed: 0,
                unchanged: 0,
              },
              runId: sessionConflict.runId,
              status: "succeeded",
            });

            const [sessionItem] = await tx`
              select outcome, source_document_id, diagnostics
              from public.catalogue_import_items
              where run_id = ${sessionConflict.runId}
            `;
            assert.equal(sessionItem.outcome, "review");
            assert.equal(sessionItem.diagnostics.semanticOutcome, "created");
            const [sessionSnapshot] = await tx`
              select external_key, content_sha256
              from public.catalogue_source_documents
              where id = ${sessionItem.source_document_id}
            `;
            assert.equal(
              sessionSnapshot.external_key,
              sessionConflictCourseCode,
            );
            assert.equal(
              sessionSnapshot.content_sha256,
              sessionConflictManifest.documents[0].contentSha256,
            );
            const sessionConflictReviews = await tx`
              select reviews.issue_code, reviews.status, reviews.details
              from public.catalogue_review_items as reviews
              join public.catalogue_import_items as items
                on items.id = reviews.import_item_id
              where items.run_id = ${sessionConflict.runId}
                and reviews.issue_code = 'OFFERING_SESSION_CONFLICT'
            `;
            assert.equal(sessionConflictReviews.length, 1);
            assert.equal(sessionConflictReviews[0].status, "open");
            assert.equal(sessionConflictReviews[0].details.severity, "warning");
            assert.equal(
              sessionConflictReviews[0].details.field,
              "offering.sessions",
            );
            assert.notDeepEqual(await conflictDomainState(tx), domainBefore);

            const periodConflict = await importManifest(periodConflictManifest);
            runIds.push(periodConflict.runId);
            assert.deepEqual(periodConflict, {
              counts: {
                added: 2,
                changed: 0,
                checked: 2,
                failed: 0,
                unchanged: 0,
              },
              runId: periodConflict.runId,
              status: "succeeded",
            });
            const periodItems = await tx`
              select outcome, target_key, source_document_id, diagnostics
              from public.catalogue_import_items
              where run_id = ${periodConflict.runId}
              order by target_key
            `;
            assert.deepEqual(
              periodItems.map(({ outcome, target_key: targetKey }) => ({
                outcome,
                targetKey,
              })),
              periodConflictCourseCodes.map((targetKey) => ({
                outcome: "review",
                targetKey,
              })),
            );
            for (const item of periodItems) {
              assert.equal(item.diagnostics.semanticOutcome, "created");
            }
            const periodSnapshots = await tx`
              select documents.external_key, documents.content_sha256
              from public.catalogue_source_documents as documents
              where documents.id in ${tx(
                periodItems.map(({ source_document_id: id }) => id),
              )}
              order by documents.external_key
            `;
            assert.deepEqual(
              periodSnapshots.map(
                ({
                  content_sha256: contentSha256,
                  external_key: externalKey,
                }) => ({ contentSha256, externalKey }),
              ),
              periodConflictManifest.documents.map((conflictDocument) => ({
                contentSha256: conflictDocument.contentSha256,
                externalKey: conflictDocument.externalKey,
              })),
            );
            const periodConflictReviews = await tx`
              select items.target_key, reviews.issue_code, reviews.status, reviews.details
              from public.catalogue_review_items as reviews
              join public.catalogue_import_items as items
                on items.id = reviews.import_item_id
              where items.run_id = ${periodConflict.runId}
                and reviews.issue_code = 'ACADEMIC_PERIOD_CONFLICT'
              order by items.target_key
            `;
            assert.equal(periodConflictReviews.length, 2);
            for (const review of periodConflictReviews) {
              assert.equal(review.status, "open");
              assert.equal(review.details.severity, "warning");
              assert.equal(review.details.field, "periods");
            }
            assert.deepEqual(
              periodConflictReviews.map(({ target_key: code }) => code),
              periodConflictCourseCodes,
            );
            assert.notDeepEqual(await conflictDomainState(tx), domainBefore);

            throw conflictRollbackSignal;
          },
        ),
        (error) => error === conflictRollbackSignal,
      );

      for (const runId of runIds) {
        const [cleanup] = await sql`
          select
            not exists (
              select 1 from public.catalogue_import_runs where id = ${runId}
            ) as run_absent,
            not exists (
              select 1 from public.catalogue_import_items where run_id = ${runId}
            ) as items_absent
        `;
        assert.equal(cleanup.run_absent, true);
        assert.equal(cleanup.items_absent, true);
      }
      assert.equal(runIds.length, 2);
      assert.deepEqual(await conflictDatabaseState(sql), before);
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
);
