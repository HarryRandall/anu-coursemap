import { parseCatalogueManifest } from "../../../lib/catalogue-import/manifest.ts";
import { parseRequisiteSummary } from "../../../lib/coursemap/requisite-summary.ts";
import { assertVerifiedCatalogueImportClient } from "./local-database.mjs";

const COURSE_CODE_PATTERN = /^[A-Z]{4}[0-9]{4}$/u;
const SUBJECT_PATTERN = /^[A-Z]{4}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const IMPORT_LOCK_NAMESPACE = "coursemap:catalogue-import";

function cleanText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanOptionalText(value) {
  return cleanText(value);
}

function cleanTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.valueOf()) ? null : timestamp.toISOString();
}

function cleanDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return null;
  }

  const timestamp = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(timestamp.valueOf()) ? null : value;
}

function serialisable(value) {
  return JSON.parse(JSON.stringify(value));
}

function diagnostic({ code, message, severity = "warning", ...details }) {
  return serialisable({ code, message, severity, ...details });
}

function combineActions(actions) {
  if (actions.includes("created")) {
    return "created";
  }

  if (actions.includes("updated")) {
    return "updated";
  }

  return "unchanged";
}

function appendUniqueDiagnostic(diagnostics, candidate) {
  const duplicate = diagnostics.some(
    (existing) =>
      existing.code === candidate.code &&
      existing.field === candidate.field &&
      existing.message === candidate.message &&
      existing.sourceFragment === candidate.sourceFragment,
  );

  if (!duplicate) {
    diagnostics.push(candidate);
  }
}

function validateCourseDocument(document, scopeCodes) {
  const issues = [];
  const course = document.course ?? {};
  const code = cleanText(course.code)?.toUpperCase() ?? null;
  const title = cleanText(course.title);
  const units = typeof course.units === "number" ? course.units : Number.NaN;
  const description = cleanText(course.description);
  const level = typeof course.level === "number" ? course.level : Number.NaN;
  const subject = cleanText(course.subject)?.toUpperCase() ?? null;
  const school = cleanText(course.school);
  const externalKey = cleanText(document.externalKey)?.toUpperCase() ?? null;

  const requiredText = [
    ["code", code],
    ["title", title],
    ["description", description],
    ["subject", subject],
    ["school", school],
  ];

  for (const [field, value] of requiredText) {
    if (!value) {
      issues.push(
        diagnostic({
          code: "REQUIRED_COURSE_FIELD_MISSING",
          field,
          message: `The course ${field} is required before domain data can be imported.`,
          severity: "error",
          sourceFragment: document.sourceFragment,
        }),
      );
    }
  }

  if (code && !COURSE_CODE_PATTERN.test(code)) {
    issues.push(
      diagnostic({
        code: "COURSE_CODE_INVALID",
        field: "code",
        message: "The extracted course code is not an ANU course code.",
        severity: "error",
        sourceFragment: document.sourceFragment,
      }),
    );
  }

  if (
    !Number.isFinite(units) ||
    units <= 0 ||
    units > 999.99 ||
    Number(units.toFixed(2)) !== units
  ) {
    issues.push(
      diagnostic({
        code: "COURSE_UNITS_INVALID",
        field: "units",
        message:
          "The extracted course units must fit the database's positive two-decimal unit range.",
        severity: "error",
        sourceFragment: document.sourceFragment,
      }),
    );
  }

  if (!Number.isInteger(level) || level < 0 || level > 9_999) {
    issues.push(
      diagnostic({
        code: "COURSE_LEVEL_INVALID",
        field: "level",
        message:
          "The extracted course level must be an integer from 0 to 9999.",
        severity: "error",
        sourceFragment: document.sourceFragment,
      }),
    );
  }

  if (subject && !SUBJECT_PATTERN.test(subject)) {
    issues.push(
      diagnostic({
        code: "COURSE_SUBJECT_INVALID",
        field: "subject",
        message: "The extracted subject must contain four uppercase letters.",
        severity: "error",
        sourceFragment: document.sourceFragment,
      }),
    );
  }

  if (code && externalKey && code !== externalKey) {
    issues.push(
      diagnostic({
        code: "COURSE_EXTERNAL_KEY_MISMATCH",
        field: "code",
        message:
          "The extracted course code does not match the source document key.",
        severity: "error",
        sourceFragment: document.sourceFragment,
      }),
    );
  }

  if (code && !scopeCodes.has(code)) {
    issues.push(
      diagnostic({
        code: "COURSE_OUTSIDE_SCOPE",
        field: "code",
        message: "The source document is outside this import run scope.",
        severity: "error",
        sourceFragment: document.sourceFragment,
      }),
    );
  }

  return {
    course: {
      code,
      convener: cleanOptionalText(course.convener),
      deliverySummary: cleanOptionalText(course.deliverySummary),
      description,
      level,
      school,
      sourceUpdatedAt: cleanTimestamp(course.sourceUpdatedAt),
      subject,
      title,
      units,
    },
    issues,
    valid: issues.length === 0,
  };
}

function normaliseRuleSources(requisites = {}) {
  const rawText = cleanText(requisites.rawText);
  const rawRequisiteText = cleanText(requisites.rawRequisiteText);
  const rawIncompatibilityText = cleanText(requisites.rawIncompatibilityText);
  const linkedCourseCodes = Array.isArray(requisites.linkedCourseCodes)
    ? requisites.linkedCourseCodes
    : [];
  const codesIn = (sourceText) => {
    const text = sourceText?.toUpperCase() ?? "";
    return linkedCourseCodes.filter((code) =>
      new RegExp(`\\b${code}\\b`, "u").test(text),
    );
  };
  const prerequisiteSections = [];

  if (rawRequisiteText) {
    prerequisiteSections.push(rawRequisiteText);
  } else if (!rawIncompatibilityText && rawText) {
    prerequisiteSections.push(rawText);
  }

  const rules = [];
  if (prerequisiteSections.length > 0) {
    const sourceText = prerequisiteSections.join("\n\n");
    rules.push({
      ruleKind: "prerequisite",
      sourceText,
      expression: parseRequisiteSummary(sourceText),
      referencedCourseCodes: codesIn(sourceText),
    });
  }

  if (rawIncompatibilityText) {
    rules.push({
      ruleKind: "incompatibility",
      sourceText: rawIncompatibilityText,
      referencedCourseCodes: codesIn(rawIncompatibilityText),
    });
  }

  return rules;
}

async function upsertSource(tx, source) {
  const name = cleanText(source.name);
  const kind = cleanText(source.kind);
  const baseUrl = cleanText(source.baseUrl);
  const inserted = await tx`
    insert into public.catalogue_sources (name, kind, base_url, is_active)
    values (${name}, ${kind}, ${baseUrl}, true)
    on conflict (kind, base_url) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const updated = await tx`
    update public.catalogue_sources
    set name = ${name}, is_active = true
    where kind = ${kind}
      and base_url = ${baseUrl}
      and (name, is_active) is distinct from (${name}, true)
    returning id
  `;

  if (updated.length > 0) {
    return { action: "updated", id: updated[0].id };
  }

  const [existing] = await tx`
    select id
    from public.catalogue_sources
    where kind = ${kind} and base_url = ${baseUrl}
  `;
  return { action: "unchanged", id: existing.id };
}

async function upsertCatalogueYear(tx, year) {
  const inserted = await tx`
    insert into public.catalogue_years (year, status)
    values (${year}, 'draft')
    on conflict (year) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const [existing] = await tx`
    select id from public.catalogue_years where year = ${year}
  `;
  return { action: "unchanged", id: existing.id };
}

async function upsertSourceDocument(
  tx,
  { catalogueYearId, document, sourceId },
) {
  const sourceLastModified = cleanTimestamp(document.sourceLastModified);
  const inserted = await tx`
    insert into public.catalogue_source_documents (
      source_id,
      catalogue_year_id,
      entity_kind,
      external_key,
      canonical_url,
      content_sha256,
      http_etag,
      source_last_modified,
      fetched_at
    )
    values (
      ${sourceId},
      ${catalogueYearId},
      ${document.entityKind},
      ${document.externalKey},
      ${document.canonicalUrl},
      ${document.contentSha256},
      ${cleanOptionalText(document.httpEtag)},
      ${sourceLastModified},
      ${document.fetchedAt}
    )
    on conflict (
      source_id,
      catalogue_year_id,
      entity_kind,
      external_key,
      content_sha256
    ) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const [existing] = await tx`
    select id
    from public.catalogue_source_documents
    where source_id = ${sourceId}
      and catalogue_year_id = ${catalogueYearId}
      and entity_kind = ${document.entityKind}
      and external_key = ${document.externalKey}
      and content_sha256 = ${document.contentSha256}
  `;
  return { action: "unchanged", id: existing.id };
}

async function upsertCourse(tx, code) {
  const inserted = await tx`
    insert into public.courses (code)
    values (${code})
    on conflict (code) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const [existing] = await tx`
    select id from public.courses where code = ${code}
  `;
  return { action: "unchanged", id: existing.id };
}

async function upsertCourseVersion(
  tx,
  { catalogueYearId, course, courseId, reviewState, sourceDocumentId },
) {
  const inserted = await tx`
    insert into public.course_versions (
      course_id,
      catalogue_year_id,
      title,
      units,
      level,
      subject,
      school,
      convener,
      delivery_summary,
      description,
      publication_status,
      review_state,
      source_document_id,
      source_updated_at
    )
    values (
      ${courseId},
      ${catalogueYearId},
      ${course.title},
      ${course.units},
      ${course.level},
      ${course.subject},
      ${course.school},
      ${course.convener},
      ${course.deliverySummary},
      ${course.description},
      'draft',
      ${reviewState},
      ${sourceDocumentId},
      ${course.sourceUpdatedAt}
    )
    on conflict (course_id, catalogue_year_id) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const updated = await tx`
    update public.course_versions
    set
      title = ${course.title},
      units = ${course.units},
      level = ${course.level},
      subject = ${course.subject},
      school = ${course.school},
      convener = ${course.convener},
      delivery_summary = ${course.deliverySummary},
      description = ${course.description},
      publication_status = 'draft',
      review_state = ${reviewState},
      source_document_id = ${sourceDocumentId},
      source_updated_at = ${course.sourceUpdatedAt}
    where course_id = ${courseId}
      and catalogue_year_id = ${catalogueYearId}
      and (
        (
          title,
          units,
          level,
          subject,
          school,
          convener,
          delivery_summary,
          description,
          source_document_id,
          source_updated_at
        ) is distinct from (
          ${course.title},
          ${course.units},
          ${course.level},
          ${course.subject},
          ${course.school},
          ${course.convener},
          ${course.deliverySummary},
          ${course.description},
          ${sourceDocumentId},
          ${course.sourceUpdatedAt}
        )
        or (
          review_state <> 'verified'
          and review_state is distinct from ${reviewState}
        )
      )
    returning id
  `;

  if (updated.length > 0) {
    return { action: "updated", id: updated[0].id };
  }

  const [existing] = await tx`
    select id
    from public.course_versions
    where course_id = ${courseId} and catalogue_year_id = ${catalogueYearId}
  `;
  return { action: "unchanged", id: existing.id };
}

async function markCourseVersionForRuleReview(tx, courseVersionId) {
  const updated = await tx`
    update public.course_versions
    set publication_status = 'draft', review_state = 'review'
    where id = ${courseVersionId}
      and (publication_status, review_state) is distinct from ('draft', 'review')
    returning id
  `;
  return updated.length > 0 ? "updated" : "unchanged";
}

async function upsertAcademicPeriod(tx, period) {
  const inserted = await tx`
    insert into public.academic_periods (
      calendar_year,
      code,
      name,
      short_name,
      starts_on,
      ends_on,
      sort_order,
      status
    )
    values (
      ${period.calendarYear},
      ${period.code},
      ${period.name},
      ${period.shortName},
      ${period.startsOn},
      ${period.endsOn},
      ${period.sortOrder},
      'draft'
    )
    on conflict (calendar_year, code) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  // Course pages expose class dates, not an authoritative University Calendar
  // definition. Keep the first imported period instead of changing it whenever
  // another course has a different class window.
  const [existing] = await tx`
    select id
    from public.academic_periods
    where calendar_year = ${period.calendarYear} and code = ${period.code}
  `;
  return { action: "unchanged", id: existing.id };
}

async function upsertOffering(
  tx,
  { catalogueYearId, courseVersionId, offering, sourceDocumentId },
) {
  const deliveryMode = cleanOptionalText(offering.deliveryMode);
  const location = cleanOptionalText(offering.location);
  const inserted = await tx`
    insert into public.course_offerings (
      course_version_id,
      catalogue_year_id,
      delivery_mode,
      location,
      source_document_id,
      status
    )
    values (
      ${courseVersionId},
      ${catalogueYearId},
      ${deliveryMode},
      ${location},
      ${sourceDocumentId},
      'draft'
    )
    on conflict (course_version_id) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const updated = await tx`
    update public.course_offerings
    set
      delivery_mode = ${deliveryMode},
      location = ${location},
      source_document_id = ${sourceDocumentId},
      status = 'draft'
    where course_version_id = ${courseVersionId}
      and (delivery_mode, location, source_document_id) is distinct from (
        ${deliveryMode},
        ${location},
        ${sourceDocumentId}
      )
    returning id
  `;

  if (updated.length > 0) {
    return { action: "updated", id: updated[0].id };
  }

  const [existing] = await tx`
    select id
    from public.course_offerings
    where course_version_id = ${courseVersionId}
  `;
  return { action: "unchanged", id: existing.id };
}

async function upsertOfferingSession(
  tx,
  {
    academicPeriodId,
    catalogueYearId,
    courseOfferingId,
    session,
    sourceDocumentId,
  },
) {
  const deliveryMode = cleanOptionalText(session.deliveryMode);
  const location = cleanOptionalText(session.location);
  const inserted = await tx`
    insert into public.offering_sessions (
      course_offering_id,
      catalogue_year_id,
      academic_period_id,
      delivery_mode,
      location,
      source_document_id
    )
    values (
      ${courseOfferingId},
      ${catalogueYearId},
      ${academicPeriodId},
      ${deliveryMode},
      ${location},
      ${sourceDocumentId}
    )
    on conflict (course_offering_id, academic_period_id) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const updated = await tx`
    update public.offering_sessions
    set
      delivery_mode = ${deliveryMode},
      location = ${location},
      source_document_id = ${sourceDocumentId}
    where course_offering_id = ${courseOfferingId}
      and academic_period_id = ${academicPeriodId}
      and (delivery_mode, location, source_document_id) is distinct from (
        ${deliveryMode},
        ${location},
        ${sourceDocumentId}
      )
    returning id
  `;

  if (updated.length > 0) {
    return { action: "updated", id: updated[0].id };
  }

  const [existing] = await tx`
    select id
    from public.offering_sessions
    where course_offering_id = ${courseOfferingId}
      and academic_period_id = ${academicPeriodId}
  `;
  return { action: "unchanged", id: existing.id };
}

async function isImporterOwnedRawRule(tx, existing) {
  const [tree] = await tx`
    select
      (select count(*) from public.course_rule_groups
        where course_rule_id = ${existing.id}) as group_count,
      (select count(*) from public.course_rule_conditions
        where course_rule_id = ${existing.id}) as condition_count,
      groups.id as group_id,
      groups.parent_group_id,
      groups.operator,
      groups.minimum_count,
      groups.position as group_position,
      conditions.condition_kind,
      conditions.free_text,
      conditions.source_text as condition_source_text,
      conditions.confidence as condition_confidence,
      conditions.review_state as condition_review_state,
      conditions.position as condition_position
    from public.course_rule_groups as groups
    left join public.course_rule_conditions as conditions
      on conditions.group_id = groups.id
      and conditions.course_rule_id = groups.course_rule_id
    where groups.course_rule_id = ${existing.id}
      and groups.parent_group_id is null
    order by conditions.position
    limit 1
  `;

  return (
    existing.review_state === "review" &&
    Number(existing.confidence) === 0 &&
    Number(tree?.group_count) === 1 &&
    Number(tree?.condition_count) === 1 &&
    tree?.parent_group_id === null &&
    tree?.operator === "all_of" &&
    tree?.minimum_count === null &&
    Number(tree?.group_position) === 0 &&
    tree?.condition_kind === "other" &&
    tree?.free_text === existing.source_text &&
    tree?.condition_source_text === existing.source_text &&
    Number(tree?.condition_confidence) === 0 &&
    tree?.condition_review_state === "review" &&
    Number(tree?.condition_position) === 0
  );
}

async function upsertCourseRule(
  tx,
  { catalogueYearId, courseVersionId, rule, sourceDocumentId },
) {
  if (rule.expression) {
    return upsertStructuredCourseRule(tx, {
      catalogueYearId,
      courseVersionId,
      rule,
      sourceDocumentId,
    });
  }

  const inserted = await tx`
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
      ${courseVersionId},
      ${catalogueYearId},
      ${rule.ruleKind},
      'hard',
      ${rule.sourceText},
      'review',
      0,
      ${sourceDocumentId}
    )
    on conflict (course_version_id, rule_kind) do nothing
    returning id
  `;

  let action = "created";
  let ruleId = inserted[0]?.id;

  if (!ruleId) {
    const [existing] = await tx`
      select id, review_state, confidence, source_text, source_document_id
      from public.course_rules
      where course_version_id = ${courseVersionId}
        and rule_kind = ${rule.ruleKind}
    `;
    ruleId = existing.id;

    const importerOwnedTree = await isImporterOwnedRawRule(tx, existing);

    if (!importerOwnedTree) {
      const sourceMismatch =
        existing.source_text !== rule.sourceText ||
        String(existing.source_document_id) !== String(sourceDocumentId);
      return {
        action: "unchanged",
        id: ruleId,
        preserved: sourceMismatch,
      };
    }

    const updated = await tx`
      update public.course_rules
      set
        source_text = ${rule.sourceText},
        review_state = 'review',
        confidence = 0,
        source_document_id = ${sourceDocumentId}
      where id = ${ruleId}
        and (source_text, review_state, confidence, source_document_id)
          is distinct from (${rule.sourceText}, 'review', 0, ${sourceDocumentId})
      returning id
    `;

    if (updated.length > 0) {
      action = "updated";
      ruleId = updated[0].id;
    } else {
      action = "unchanged";
    }
  }

  const group = await upsertRuleRootGroup(tx, ruleId);
  const condition = await upsertRuleOtherCondition(
    tx,
    ruleId,
    group.id,
    rule.sourceText,
  );

  return {
    action: combineActions([action, group.action, condition.action]),
    id: ruleId,
  };
}

function expressionSourceText(expression) {
  if (expression.kind === "course") return expression.code;
  if (expression.kind === "subject_units") {
    return `${expression.units} units of ${expression.subject} coded courses`;
  }
  return expression.conditions.map(expressionSourceText).join(" ");
}

function isImporterOwnedStructuredRule(existing) {
  return (
    existing.review_state === "automatic" && Number(existing.confidence) === 1
  );
}

async function isImporterOwnedRule(tx, existing) {
  return (
    isImporterOwnedStructuredRule(existing) ||
    (await isImporterOwnedRawRule(tx, existing))
  );
}

async function insertStructuredRuleTree(tx, courseRuleId, expression) {
  const actions = [];

  async function insertExpression(value, parentGroupId, position) {
    if (value.kind === "group") {
      const [group] = await tx`
        insert into public.course_rule_groups (
          course_rule_id,
          parent_group_id,
          operator,
          minimum_count,
          position
        )
        values (
          ${courseRuleId},
          ${parentGroupId},
          ${value.operator},
          null,
          ${position}
        )
        returning id
      `;
      actions.push("created");
      for (const [childPosition, child] of value.conditions.entries()) {
        await insertExpression(child, group.id, childPosition);
      }
      return;
    }

    if (value.kind === "course") {
      const course = await upsertCourse(tx, value.code);
      actions.push(course.action);
      await tx`
        insert into public.course_rule_conditions (
          course_rule_id,
          group_id,
          condition_kind,
          required_course_id,
          source_text,
          confidence,
          review_state,
          position
        )
        values (
          ${courseRuleId},
          ${parentGroupId},
          'course',
          ${course.id},
          ${expressionSourceText(value)},
          1,
          'automatic',
          ${position}
        )
      `;
      actions.push("created");
      return;
    }

    await tx`
      insert into public.course_rule_conditions (
        course_rule_id,
        group_id,
        condition_kind,
        minimum_units,
        subject_code,
        source_text,
        confidence,
        review_state,
        position
      )
      values (
        ${courseRuleId},
        ${parentGroupId},
        'subject_units',
        ${value.units},
        ${value.subject},
        ${expressionSourceText(value)},
        1,
        'automatic',
        ${position}
      )
    `;
    actions.push("created");
  }

  const root =
    expression.kind === "group"
      ? expression
      : { kind: "group", operator: "all_of", conditions: [expression] };
  await insertExpression(root, null, 0);
  return combineActions(actions);
}

async function upsertStructuredCourseRule(
  tx,
  { catalogueYearId, courseVersionId, rule, sourceDocumentId },
) {
  const inserted = await tx`
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
      ${courseVersionId},
      ${catalogueYearId},
      ${rule.ruleKind},
      'hard',
      ${rule.sourceText},
      'automatic',
      1,
      ${sourceDocumentId}
    )
    on conflict (course_version_id, rule_kind) do nothing
    returning id
  `;

  let action = "created";
  let ruleId = inserted[0]?.id;
  let replaceTree = inserted.length > 0;

  if (!ruleId) {
    const [existing] = await tx`
      select id, review_state, confidence, source_text, source_document_id
      from public.course_rules
      where course_version_id = ${courseVersionId}
        and rule_kind = ${rule.ruleKind}
    `;
    ruleId = existing.id;
    const importerOwned =
      isImporterOwnedStructuredRule(existing) ||
      (await isImporterOwnedRawRule(tx, existing));

    if (!importerOwned) {
      const sourceMismatch =
        existing.source_text !== rule.sourceText ||
        String(existing.source_document_id) !== String(sourceDocumentId);
      return {
        action: "unchanged",
        id: ruleId,
        preserved: sourceMismatch,
      };
    }

    const sourceChanged =
      existing.source_text !== rule.sourceText ||
      String(existing.source_document_id) !== String(sourceDocumentId) ||
      !isImporterOwnedStructuredRule(existing);
    if (!sourceChanged) {
      return { action: "unchanged", id: ruleId };
    }

    const updated = await tx`
      update public.course_rules
      set
        source_text = ${rule.sourceText},
        review_state = 'automatic',
        confidence = 1,
        source_document_id = ${sourceDocumentId}
      where id = ${ruleId}
      returning id
    `;
    action = updated.length > 0 ? "updated" : "unchanged";
    replaceTree = updated.length > 0;
  }

  if (!replaceTree) return { action, id: ruleId };

  await tx`
    delete from public.course_rule_groups
    where course_rule_id = ${ruleId}
  `;
  const treeAction = await insertStructuredRuleTree(
    tx,
    ruleId,
    rule.expression,
  );
  return { action: combineActions([action, treeAction]), id: ruleId };
}

async function syncCourseRuleCourseReferences(
  tx,
  { courseRuleId, referencedCourseCodes },
) {
  const wantedCodes = [
    ...new Set(
      (referencedCourseCodes ?? [])
        .map((code) => cleanText(code)?.toUpperCase())
        .filter((code) => /^[A-Z]{4}\d{4}$/u.test(code)),
    ),
  ].sort();
  const actions = [];

  for (const code of wantedCodes) {
    const course = await upsertCourse(tx, code);
    actions.push(course.action);
    const inserted = await tx`
      insert into public.course_rule_course_references (
        course_rule_id,
        referenced_course_id,
        source_text,
        confidence,
        review_state
      )
      values (${courseRuleId}, ${course.id}, ${code}, 0, 'review')
      on conflict (course_rule_id, referenced_course_id) do nothing
      returning id
    `;
    actions.push(inserted.length > 0 ? "created" : "unchanged");
  }

  const existing = await tx`
    select rule_references.id, courses.code
    from public.course_rule_course_references as rule_references
    join public.courses as courses on courses.id = rule_references.referenced_course_id
    where rule_references.course_rule_id = ${courseRuleId}
  `;
  for (const reference of existing) {
    if (wantedCodes.includes(reference.code)) continue;
    await tx`delete from public.course_rule_course_references where id = ${reference.id}`;
    actions.push("updated");
  }

  return combineActions(actions);
}

async function reconcileMissingCourseRules(
  tx,
  {
    courseVersionId,
    diagnostics,
    observed,
    presentRuleKinds,
    sourceDocumentId,
    sourceId,
  },
) {
  const actions = [];
  let requiresParentReview = false;
  const sourceIsComplete = !diagnostics.some(
    (issue) =>
      issue.severity === "error" &&
      typeof issue.field === "string" &&
      issue.field.startsWith("course.requisites"),
  );

  if (!observed || !sourceIsComplete) {
    const existingRules = await tx`
      select id, review_state, confidence, source_text, source_document_id
      from public.course_rules
      where course_version_id = ${courseVersionId}
        and rule_kind in ('prerequisite', 'incompatibility')
    `;
    let hasUnreconciledRules = false;
    for (const existing of existingRules) {
      const importerOwned = await isImporterOwnedRule(tx, existing);
      hasUnreconciledRules ||=
        importerOwned ||
        String(existing.source_document_id) !== String(sourceDocumentId);
    }
    if (hasUnreconciledRules) {
      appendUniqueDiagnostic(
        diagnostics,
        diagnostic({
          code: "COURSE_RULE_RECONCILIATION_DEFERRED",
          field: "course.requisites",
          message:
            "Existing course rules were preserved because the source requisite section is incomplete.",
          severity: "warning",
        }),
      );
      requiresParentReview = true;
    }
    return { actions, requiresParentReview };
  }

  for (const ruleKind of ["prerequisite", "incompatibility"]) {
    if (presentRuleKinds.has(ruleKind)) {
      continue;
    }

    const [existing] = await tx`
      select
        rules.id,
        rules.review_state,
        rules.confidence,
        rules.source_text,
        rules.source_document_id,
        documents.source_id
      from public.course_rules as rules
      join public.catalogue_source_documents as documents
        on documents.id = rules.source_document_id
      where rules.course_version_id = ${courseVersionId}
        and rules.rule_kind = ${ruleKind}
    `;
    if (!existing) {
      continue;
    }

    const importerOwned = await isImporterOwnedRule(tx, existing);
    if (String(existing.source_id) === String(sourceId) && importerOwned) {
      await tx`delete from public.course_rules where id = ${existing.id}`;
      actions.push("updated");
      requiresParentReview = true;
      continue;
    }

    if (
      !importerOwned &&
      String(existing.source_document_id) === String(sourceDocumentId)
    ) {
      continue;
    }

    appendUniqueDiagnostic(
      diagnostics,
      diagnostic({
        code: "STRUCTURED_RULE_SOURCE_REMOVAL_PRESERVED",
        field: `course.requisites.${ruleKind}`,
        message: `An existing ${ruleKind} rule was preserved after it disappeared from this source and requires manual reconciliation.`,
        severity: "warning",
        sourceFragment: existing.source_text,
      }),
    );
    requiresParentReview = true;
  }

  return { actions, requiresParentReview };
}

async function upsertRuleRootGroup(tx, courseRuleId) {
  const inserted = await tx`
    insert into public.course_rule_groups (
      course_rule_id,
      parent_group_id,
      operator,
      minimum_count,
      position
    )
    values (${courseRuleId}, null, 'all_of', null, 0)
    on conflict (course_rule_id) where parent_group_id is null do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const updated = await tx`
    update public.course_rule_groups
    set operator = 'all_of', minimum_count = null, position = 0
    where course_rule_id = ${courseRuleId}
      and parent_group_id is null
      and (operator, minimum_count, position) is distinct from ('all_of', null, 0)
    returning id
  `;

  if (updated.length > 0) {
    return { action: "updated", id: updated[0].id };
  }

  const [existing] = await tx`
    select id
    from public.course_rule_groups
    where course_rule_id = ${courseRuleId} and parent_group_id is null
  `;
  return { action: "unchanged", id: existing.id };
}

async function upsertRuleOtherCondition(tx, courseRuleId, groupId, sourceText) {
  const inserted = await tx`
    insert into public.course_rule_conditions (
      course_rule_id,
      group_id,
      condition_kind,
      free_text,
      source_text,
      confidence,
      review_state,
      position
    )
    values (
      ${courseRuleId},
      ${groupId},
      'other',
      ${sourceText},
      ${sourceText},
      0,
      'review',
      0
    )
    on conflict (group_id, position) do nothing
    returning id
  `;

  if (inserted.length > 0) {
    return { action: "created", id: inserted[0].id };
  }

  const updated = await tx`
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
      free_text = ${sourceText},
      source_text = ${sourceText},
      confidence = 0,
      review_state = 'review'
    where group_id = ${groupId}
      and position = 0
      and (
        condition_kind,
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        source_text,
        confidence,
        review_state
      ) is distinct from (
        'other',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        ${sourceText},
        ${sourceText},
        0,
        'review'
      )
    returning id
  `;

  if (updated.length > 0) {
    return { action: "updated", id: updated[0].id };
  }

  const [existing] = await tx`
    select id
    from public.course_rule_conditions
    where group_id = ${groupId} and position = 0
  `;
  return { action: "unchanged", id: existing.id };
}

function normalisePeriod(period) {
  const calendarYear = Number(period.calendarYear);
  const startsOn = cleanDate(period.startsOn);
  const endsOn = cleanDate(period.endsOn);
  const sortOrder = Number(period.sortOrder);
  const code = cleanText(period.code);
  const name = cleanText(period.name);
  const shortName = cleanText(period.shortName);

  if (
    !Number.isInteger(calendarYear) ||
    calendarYear < 2_000 ||
    calendarYear > 2_200 ||
    !code ||
    !name ||
    !shortName ||
    !startsOn ||
    !endsOn ||
    endsOn < startsOn ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0
  ) {
    return null;
  }

  return { calendarYear, code, endsOn, name, shortName, sortOrder, startsOn };
}

function detectAcademicPeriodConflicts(documents) {
  const definitions = new Map();
  const conflictingPeriodKeys = new Set();

  for (const document of documents) {
    for (const sourcePeriod of document.periods ?? []) {
      const period = normalisePeriod(sourcePeriod);
      if (!period) {
        continue;
      }

      const key = `${period.calendarYear}:${period.code}`;
      const signature = JSON.stringify({
        endsOn: period.endsOn,
        name: period.name,
        shortName: period.shortName,
        sortOrder: period.sortOrder,
        startsOn: period.startsOn,
      });
      const existing = definitions.get(key);
      if (existing && existing !== signature) {
        conflictingPeriodKeys.add(key);
      } else if (!existing) {
        definitions.set(key, signature);
      }
    }
  }

  return {
    conflictingPeriodKeys,
    diagnostics: [...conflictingPeriodKeys].sort().map((key) =>
      diagnostic({
        code: "ACADEMIC_PERIOD_CONFLICT",
        field: "documents.periods",
        message: `Source documents disagree on the definition of academic period ${key}.`,
        severity: "warning",
      }),
    ),
  };
}

async function importPeriods(tx, document, diagnostics, conflictingPeriodKeys) {
  const actions = [];
  const periodsByKey = new Map();
  const periods = Array.isArray(document.periods) ? document.periods : [];

  for (const period of periods) {
    const normalised = normalisePeriod(period);
    if (!normalised) {
      appendUniqueDiagnostic(
        diagnostics,
        diagnostic({
          code: "ACADEMIC_PERIOD_INVALID",
          field: "periods",
          message:
            "An offering period was incomplete or invalid and was not imported.",
          severity: "warning",
          sourceFragment: period?.sourceFragment ?? document.sourceFragment,
        }),
      );
      continue;
    }

    const periodKey = `${normalised.calendarYear}:${normalised.code}`;
    if (conflictingPeriodKeys.has(periodKey)) {
      appendUniqueDiagnostic(
        diagnostics,
        diagnostic({
          code: "ACADEMIC_PERIOD_CONFLICT",
          field: "periods",
          message: `Conflicting definitions of academic period ${periodKey} were not imported.`,
          severity: "warning",
          sourceFragment: period?.sourceFragment ?? document.sourceFragment,
        }),
      );
      continue;
    }

    const result = await upsertAcademicPeriod(tx, normalised);
    appendUniqueDiagnostic(
      diagnostics,
      diagnostic({
        code: "ACADEMIC_PERIOD_DERIVED_FROM_CLASS_DATES",
        field: "periods",
        message: `Academic period ${periodKey} was derived from course class dates and requires University Calendar verification.`,
        severity: "warning",
        sourceFragment: `${normalised.startsOn} to ${normalised.endsOn}`,
      }),
    );
    periodsByKey.set(periodKey, result.id);
    actions.push(result.action);
  }

  return { actions, periodsByKey };
}

async function reconcileAbsentOffering(
  tx,
  { courseVersionId, diagnostics, document, sourceDocumentId, sourceId },
) {
  const [existing] = await tx`
    select
      offerings.id,
      offerings.status,
      offerings.source_document_id,
      documents.source_id
    from public.course_offerings as offerings
    join public.catalogue_source_documents as documents
      on documents.id = offerings.source_document_id
    where offerings.course_version_id = ${courseVersionId}
  `;
  if (!existing) {
    return [];
  }

  const sourceIsComplete =
    document.offeringObserved === true &&
    !(document.diagnostics ?? []).some(
      (issue) =>
        issue.severity === "error" &&
        typeof issue.field === "string" &&
        (issue.field.startsWith("offering") ||
          issue.field.startsWith("periods")),
    );
  if (!sourceIsComplete || String(existing.source_id) !== String(sourceId)) {
    appendUniqueDiagnostic(
      diagnostics,
      diagnostic({
        code: "OFFERING_SOURCE_REMOVAL_PRESERVED",
        field: "offering",
        message:
          "An existing offering was preserved after it disappeared from this source and requires manual reconciliation.",
        severity: "warning",
        sourceFragment: document.sourceFragment,
      }),
    );
    return [];
  }

  const deletedSessions = await tx`
    delete from public.offering_sessions as sessions
    using public.catalogue_source_documents as documents
    where sessions.course_offering_id = ${existing.id}
      and documents.id = sessions.source_document_id
      and documents.source_id = ${sourceId}
    returning sessions.id
  `;
  const updatedOffering = await tx`
    update public.course_offerings
    set status = 'cancelled', source_document_id = ${sourceDocumentId}
    where id = ${existing.id}
      and (status, source_document_id)
        is distinct from ('cancelled', ${sourceDocumentId})
    returning id
  `;

  return deletedSessions.length > 0 || updatedOffering.length > 0
    ? ["updated"]
    : [];
}

async function importOffering(
  tx,
  {
    catalogueYearId,
    courseVersionId,
    diagnostics,
    document,
    periodsByKey,
    sourceDocumentId,
    sourceId,
  },
) {
  if (!document.offering) {
    return reconcileAbsentOffering(tx, {
      courseVersionId,
      diagnostics,
      document,
      sourceDocumentId,
      sourceId,
    });
  }

  const actions = [];
  const offering = await upsertOffering(tx, {
    catalogueYearId,
    courseVersionId,
    offering: document.offering,
    sourceDocumentId,
  });
  actions.push(offering.action);

  const sessions = Array.isArray(document.offering.sessions)
    ? document.offering.sessions
    : [];
  const sessionsByPeriod = new Map();
  const importedAcademicPeriodIds = new Set();
  let safeToReconcileSessions = true;
  let sessionsChanged = false;
  for (const session of sessions) {
    const key = `${Number(session.calendarYear)}:${cleanText(session.periodCode)}`;
    const existing = sessionsByPeriod.get(key) ?? [];
    existing.push(session);
    sessionsByPeriod.set(key, existing);
  }

  for (const [key, periodSessions] of [...sessionsByPeriod.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const deliveryDefinitions = new Set(
      periodSessions.map((session) =>
        JSON.stringify({
          deliveryMode: cleanOptionalText(session.deliveryMode),
          location: cleanOptionalText(session.location),
        }),
      ),
    );

    if (deliveryDefinitions.size > 1) {
      safeToReconcileSessions = false;
      appendUniqueDiagnostic(
        diagnostics,
        diagnostic({
          code: "OFFERING_SESSION_CONFLICT",
          field: "offering.sessions",
          message: `Classes in ${key} disagree on delivery mode or location and were not collapsed.`,
          severity: "warning",
          sourceFragment:
            periodSessions
              .map((session) => session.sourceFragment)
              .find(Boolean) ?? document.sourceFragment,
        }),
      );
      continue;
    }

    if (periodSessions.length > 1) {
      appendUniqueDiagnostic(
        diagnostics,
        diagnostic({
          code: "MULTIPLE_CLASSES_COLLAPSED",
          field: "offering.sessions",
          message: `Multiple classes in ${key} share one offering-session record; class facts remain in import diagnostics.`,
          severity: "warning",
          sourceFragment:
            periodSessions
              .map((session) => session.sourceFragment)
              .find(Boolean) ?? document.sourceFragment,
        }),
      );
    }

    const session = periodSessions[0];
    const academicPeriodId = periodsByKey.get(key);
    if (!academicPeriodId) {
      safeToReconcileSessions = false;
      appendUniqueDiagnostic(
        diagnostics,
        diagnostic({
          code: "OFFERING_PERIOD_UNRESOLVED",
          field: "offering.sessions",
          message: "An offering session did not match a valid academic period.",
          severity: "warning",
          sourceFragment: session.sourceFragment ?? document.sourceFragment,
        }),
      );
      continue;
    }

    const result = await upsertOfferingSession(tx, {
      academicPeriodId,
      catalogueYearId,
      courseOfferingId: offering.id,
      session,
      sourceDocumentId,
    });
    actions.push(result.action);
    sessionsChanged ||= result.action !== "unchanged";
    importedAcademicPeriodIds.add(academicPeriodId);
  }

  if (safeToReconcileSessions) {
    const periodIds = [...importedAcademicPeriodIds];
    const deletedSessions =
      periodIds.length > 0
        ? await tx`
            delete from public.offering_sessions as sessions
            using public.catalogue_source_documents as documents
            where sessions.course_offering_id = ${offering.id}
              and documents.id = sessions.source_document_id
              and documents.source_id = ${sourceId}
              and sessions.academic_period_id not in ${tx(periodIds)}
            returning sessions.id
          `
        : await tx`
            delete from public.offering_sessions as sessions
            using public.catalogue_source_documents as documents
            where sessions.course_offering_id = ${offering.id}
              and documents.id = sessions.source_document_id
              and documents.source_id = ${sourceId}
            returning sessions.id
          `;
    if (deletedSessions.length > 0) {
      actions.push("updated");
      sessionsChanged = true;
    }
  } else {
    appendUniqueDiagnostic(
      diagnostics,
      diagnostic({
        code: "OFFERING_SESSION_RECONCILIATION_DEFERRED",
        field: "offering.sessions",
        message:
          "Existing offering sessions were preserved because the current source sessions are ambiguous.",
        severity: "warning",
        sourceFragment: document.sourceFragment,
      }),
    );
  }

  if (sessionsChanged) {
    const draftedOffering = await tx`
      update public.course_offerings
      set status = 'draft'
      where id = ${offering.id} and status <> 'draft'
      returning id
    `;
    if (draftedOffering.length > 0) {
      actions.push("updated");
    }
  }

  return actions;
}

function collectUnmodelledSessionFacts(document) {
  const sessions = document.offering?.sessions ?? [];
  return sessions
    .map((session) =>
      serialisable({
        censusDate: cleanDate(session.censusDate),
        classNumber: cleanText(session.classNumber),
        classSummaryUrl: cleanText(session.classSummaryUrl),
        endsOn: cleanDate(session.endsOn),
        lastEnrolmentDate: cleanDate(session.lastEnrolmentDate),
        periodCode: cleanText(session.periodCode),
        startsOn: cleanDate(session.startsOn),
      }),
    )
    .filter((session) =>
      [
        session.censusDate,
        session.classNumber,
        session.classSummaryUrl,
        session.endsOn,
        session.lastEnrolmentDate,
        session.startsOn,
      ].some(Boolean),
    );
}

async function insertImportItem(
  tx,
  {
    catalogueYearId,
    diagnostics,
    outcome,
    runId,
    semanticOutcome,
    sourceDocumentId,
    sourceId,
    targetKey,
    targetKind,
    unmodelledSessions,
  },
) {
  const details = serialisable({
    issues: diagnostics,
    semanticOutcome,
    unmodelledSessions,
  });
  const [item] = await tx`
    insert into public.catalogue_import_items (
      run_id,
      source_document_id,
      source_id,
      catalogue_year_id,
      outcome,
      target_kind,
      target_key,
      diagnostics
    )
    values (
      ${runId},
      ${sourceDocumentId},
      ${sourceId},
      ${catalogueYearId},
      ${outcome},
      ${targetKind},
      ${targetKey},
      ${tx.json(details)}
    )
    returning id
  `;
  return item.id;
}

async function insertReviewItems(
  tx,
  { canonicalUrl, diagnostics, externalKey, importItemId },
) {
  for (const issue of diagnostics) {
    const details = serialisable({
      canonicalUrl,
      externalKey,
      field: issue.field,
      severity: issue.severity,
      sourceFragment: issue.sourceFragment,
    });
    await tx`
      insert into public.catalogue_review_items (
        import_item_id,
        issue_code,
        summary,
        details,
        status
      )
      values (
        ${importItemId},
        ${issue.code},
        ${issue.message},
        ${tx.json(details)},
        'open'
      )
    `;
  }
}

async function importDocument(
  tx,
  {
    catalogueYearId,
    conflictingPeriodKeys,
    document,
    runId,
    scopeCodes,
    sourceId,
  },
) {
  const snapshot = await upsertSourceDocument(tx, {
    catalogueYearId,
    document,
    sourceId,
  });
  const diagnostics = (document.diagnostics ?? []).map((issue) =>
    serialisable(issue),
  );
  const validation = validateCourseDocument(document, scopeCodes);
  validation.issues.forEach((issue) =>
    appendUniqueDiagnostic(diagnostics, issue),
  );
  const sourceErrors = diagnostics.filter(
    (issue) => issue.severity === "error",
  );

  const unmodelledSessions = collectUnmodelledSessionFacts(document);

  if (!validation.valid || sourceErrors.length > 0) {
    const itemId = await insertImportItem(tx, {
      catalogueYearId,
      diagnostics,
      outcome: "failed",
      runId,
      semanticOutcome: "failed",
      sourceDocumentId: snapshot.id,
      sourceId,
      targetKey: cleanText(document.externalKey),
      targetKind: "course_version",
      unmodelledSessions,
    });
    await insertReviewItems(tx, {
      canonicalUrl: document.canonicalUrl,
      diagnostics,
      externalKey: document.externalKey,
      importItemId: itemId,
    });
    return { semanticOutcome: "failed" };
  }

  const rawRules = normaliseRuleSources(document.course.requisites);
  let ruleChangeRequiresParentReview = false;
  for (const rule of rawRules) {
    if (rule.expression) continue;
    appendUniqueDiagnostic(
      diagnostics,
      diagnostic({
        code: "COURSE_RULE_REQUIRES_REVIEW",
        field: `course.requisites.${rule.ruleKind}`,
        message: `The raw ${rule.ruleKind} rule was preserved but requires structured review.`,
        severity: "warning",
        sourceFragment: rule.sourceText,
      }),
    );
  }

  const reviewState = diagnostics.length > 0 ? "review" : "automatic";
  const actions = [];
  const course = await upsertCourse(tx, validation.course.code);
  actions.push(course.action);
  const version = await upsertCourseVersion(tx, {
    catalogueYearId,
    course: validation.course,
    courseId: course.id,
    reviewState,
    sourceDocumentId: snapshot.id,
  });
  actions.push(version.action);

  const importedPeriods = await importPeriods(
    tx,
    document,
    diagnostics,
    conflictingPeriodKeys,
  );
  actions.push(...importedPeriods.actions);
  actions.push(
    ...(await importOffering(tx, {
      catalogueYearId,
      courseVersionId: version.id,
      diagnostics,
      document,
      periodsByKey: importedPeriods.periodsByKey,
      sourceDocumentId: snapshot.id,
      sourceId,
    })),
  );

  for (const rule of rawRules) {
    const result = await upsertCourseRule(tx, {
      catalogueYearId,
      courseVersionId: version.id,
      rule,
      sourceDocumentId: snapshot.id,
    });
    actions.push(result.action);
    if (rule.ruleKind === "prerequisite") {
      actions.push(
        await syncCourseRuleCourseReferences(tx, {
          courseRuleId: result.id,
          referencedCourseCodes: rule.referencedCourseCodes,
        }),
      );
    }
    ruleChangeRequiresParentReview ||=
      result.action !== "unchanged" || result.preserved === true;
    if (result.preserved) {
      appendUniqueDiagnostic(
        diagnostics,
        diagnostic({
          code: "STRUCTURED_RULE_PRESERVED",
          field: `course.requisites.${rule.ruleKind}`,
          message: `An existing structured ${rule.ruleKind} rule was preserved; the new raw source requires manual reconciliation.`,
          severity: "warning",
          sourceFragment: rule.sourceText,
        }),
      );
    }
  }

  const ruleReconciliation = await reconcileMissingCourseRules(tx, {
    courseVersionId: version.id,
    diagnostics,
    observed: document.course.requisites.observed,
    presentRuleKinds: new Set(rawRules.map((rule) => rule.ruleKind)),
    sourceDocumentId: snapshot.id,
    sourceId,
  });
  actions.push(...ruleReconciliation.actions);
  ruleChangeRequiresParentReview ||= ruleReconciliation.requiresParentReview;

  if (ruleChangeRequiresParentReview) {
    actions.push(await markCourseVersionForRuleReview(tx, version.id));
  }

  if (reviewState === "automatic" && diagnostics.length > 0) {
    const reviewedVersion = await upsertCourseVersion(tx, {
      catalogueYearId,
      course: validation.course,
      courseId: course.id,
      reviewState: "review",
      sourceDocumentId: snapshot.id,
    });
    actions.push(reviewedVersion.action);
  }

  const semanticOutcome = combineActions(actions);
  const outcome = diagnostics.length > 0 ? "review" : semanticOutcome;
  const itemId = await insertImportItem(tx, {
    catalogueYearId,
    diagnostics,
    outcome,
    runId,
    semanticOutcome,
    sourceDocumentId: snapshot.id,
    sourceId,
    targetKey: validation.course.code,
    targetKind: "course_version",
    unmodelledSessions,
  });

  if (diagnostics.length > 0) {
    await insertReviewItems(tx, {
      canonicalUrl: document.canonicalUrl,
      diagnostics,
      externalKey: document.externalKey,
      importItemId: itemId,
    });
  }

  return { semanticOutcome };
}

function validateImportEnvelope(manifest) {
  const catalogueYear = Number(manifest.catalogueYear);
  const scopeCodes = (manifest.scope?.courseCodes ?? [])
    .map((code) => cleanText(code)?.toUpperCase())
    .filter(Boolean)
    .sort();

  if (
    !Number.isInteger(catalogueYear) ||
    catalogueYear < 2_000 ||
    catalogueYear > 2_200
  ) {
    throw new Error("The catalogue manifest year is invalid.");
  }

  if (manifest.scope?.kind !== "course_codes" || scopeCodes.length === 0) {
    throw new Error("The catalogue manifest must contain a course-code scope.");
  }

  if (scopeCodes.some((code) => !COURSE_CODE_PATTERN.test(code))) {
    throw new Error(
      "The catalogue manifest scope contains an invalid course code.",
    );
  }

  if (new Set(scopeCodes).size !== scopeCodes.length) {
    throw new Error(
      "The catalogue manifest scope contains duplicate course codes.",
    );
  }

  if (
    !cleanText(manifest.parserVersion) ||
    !cleanText(manifest.source?.name) ||
    !cleanText(manifest.source?.kind) ||
    !cleanText(manifest.source?.baseUrl)
  ) {
    throw new Error("The catalogue manifest source metadata is incomplete.");
  }

  if (
    !Array.isArray(manifest.documents) ||
    !Array.isArray(manifest.diagnostics)
  ) {
    throw new Error(
      "The catalogue manifest diagnostics and documents are required.",
    );
  }

  const sourceBaseUrl = new URL(manifest.source.baseUrl);
  const sourceBasePath = sourceBaseUrl.pathname.replace(/\/+$/u, "");

  for (const document of manifest.documents) {
    if (
      document.entityKind !== "course" ||
      !cleanText(document.externalKey) ||
      !cleanText(document.canonicalUrl) ||
      !SHA256_PATTERN.test(document.contentSha256 ?? "") ||
      !cleanTimestamp(document.fetchedAt)
    ) {
      throw new Error(
        "A catalogue source document has invalid provenance metadata.",
      );
    }

    const canonicalUrl = new URL(document.canonicalUrl);
    const withinSource =
      canonicalUrl.origin === sourceBaseUrl.origin &&
      (!sourceBasePath ||
        canonicalUrl.pathname === sourceBasePath ||
        canonicalUrl.pathname.startsWith(`${sourceBasePath}/`));
    if (!withinSource) {
      throw new Error(
        "A catalogue source document URL is outside the declared source.",
      );
    }

    if (manifest.source.kind === "anu_programs_courses_html") {
      const expectedPath = `/${catalogueYear}/course/${document.externalKey}`;
      const canonicalPath = canonicalUrl.pathname.replace(/\/+$/u, "");
      if (
        sourceBaseUrl.origin !== "https://programsandcourses.anu.edu.au" ||
        sourceBasePath !== "" ||
        canonicalPath.toLowerCase() !== expectedPath.toLowerCase() ||
        canonicalUrl.search ||
        canonicalUrl.hash
      ) {
        throw new Error(
          "An ANU catalogue document does not have canonical official provenance.",
        );
      }
    }
  }

  const periodConflicts = detectAcademicPeriodConflicts(manifest.documents);
  return {
    catalogueYear,
    conflictingPeriodKeys: periodConflicts.conflictingPeriodKeys,
    preflightDiagnostics: periodConflicts.diagnostics,
    scopeCodes,
  };
}

function prepareManifest(value) {
  const manifest = parseCatalogueManifest(value);
  return { manifest, ...validateImportEnvelope(manifest) };
}

async function importPreparedCatalogueManifest(tx, prepared) {
  const {
    catalogueYear,
    conflictingPeriodKeys,
    manifest,
    preflightDiagnostics,
    scopeCodes,
  } = prepared;
  const scopeCodeSet = new Set(scopeCodes);
  const scope = `course_codes:${scopeCodes.join(",")}`;
  const lockKey = `${IMPORT_LOCK_NAMESPACE}:${cleanText(manifest.source.kind)}:${cleanText(manifest.source.baseUrl)}:${catalogueYear}`;

  await tx`select pg_advisory_xact_lock(hashtext(${lockKey}))`;
  const source = await upsertSource(tx, manifest.source);
  const year = await upsertCatalogueYear(tx, catalogueYear);

  const [run] = await tx`
    insert into public.catalogue_import_runs (
      source_id,
      catalogue_year_id,
      scope,
      trigger_kind,
      parser_version,
      status
    )
    values (
      ${source.id},
      ${year.id},
      ${scope},
      'cli',
      ${manifest.parserVersion},
      'running'
    )
    returning id
  `;

  const topLevelDiagnostics = [
    ...manifest.diagnostics.map((issue) => serialisable(issue)),
    ...preflightDiagnostics,
  ];
  const documentsByKey = new Map();
  for (const document of manifest.documents) {
    const key = cleanText(document.externalKey)?.toUpperCase();
    if (!documentsByKey.has(key)) {
      documentsByKey.set(key, document);
    } else {
      topLevelDiagnostics.push(
        diagnostic({
          code: "DUPLICATE_SOURCE_DOCUMENT",
          field: "documents",
          message: `More than one source document was captured for ${key}.`,
          severity: "error",
        }),
      );
    }
  }

  for (const code of scopeCodes) {
    if (!documentsByKey.has(code)) {
      topLevelDiagnostics.push(
        diagnostic({
          code: "SCOPED_DOCUMENT_MISSING",
          field: "documents",
          message: `No source document was captured for scoped course ${code}.`,
          severity: "error",
        }),
      );
    }
  }

  const counts = {
    added: 0,
    changed: 0,
    failed: scopeCodes.filter((code) => !documentsByKey.has(code)).length,
    unchanged: 0,
  };

  for (const code of scopeCodes) {
    const document = documentsByKey.get(code);
    if (!document) {
      continue;
    }

    const result = await importDocument(tx, {
      catalogueYearId: year.id,
      conflictingPeriodKeys,
      document,
      runId: run.id,
      scopeCodes: scopeCodeSet,
      sourceId: source.id,
    });

    if (result.semanticOutcome === "created") {
      counts.added += 1;
    } else if (result.semanticOutcome === "updated") {
      counts.changed += 1;
    } else if (result.semanticOutcome === "failed") {
      counts.failed += 1;
    } else {
      counts.unchanged += 1;
    }
  }

  const hasTopLevelErrors = topLevelDiagnostics.some(
    (issue) => issue.severity === "error",
  );
  const status =
    hasTopLevelErrors || counts.failed > 0 ? "failed" : "succeeded";
  const errorSummary =
    topLevelDiagnostics.length > 0
      ? JSON.stringify({ issues: topLevelDiagnostics })
      : null;

  await tx`
    update public.catalogue_import_runs
    set
      status = ${status},
      checked_count = ${scopeCodes.length},
      added_count = ${counts.added},
      changed_count = ${counts.changed},
      unchanged_count = ${counts.unchanged},
      failed_count = ${counts.failed},
      error_summary = ${errorSummary},
      completed_at = now()
    where id = ${run.id}
  `;

  return {
    counts: {
      added: counts.added,
      changed: counts.changed,
      checked: scopeCodes.length,
      failed: counts.failed,
      unchanged: counts.unchanged,
    },
    runId: run.id,
    status,
  };
}

export async function importCatalogueManifest(sql, value) {
  const prepared = prepareManifest(value);
  assertVerifiedCatalogueImportClient(sql);
  return sql.begin("read write", async (tx) => {
    await tx`set local statement_timeout = '30s'`;
    await tx`set local lock_timeout = '5s'`;
    return importPreparedCatalogueManifest(tx, prepared);
  });
}

export async function withLocalCatalogueImportTransaction(sql, callback) {
  assertVerifiedCatalogueImportClient(sql);
  if (typeof callback !== "function") {
    throw new TypeError(
      "A local catalogue import transaction callback is required.",
    );
  }

  return sql.begin("read write", async (tx) => {
    await tx`set local statement_timeout = '30s'`;
    await tx`set local lock_timeout = '5s'`;
    return callback({
      importManifest: async (value) => {
        const prepared = prepareManifest(value);
        return importPreparedCatalogueManifest(tx, prepared);
      },
      tx,
    });
  });
}
