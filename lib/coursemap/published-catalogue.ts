import "server-only";

import {
  courseByCode as demoCourseByCode,
  courses as demoCourses,
} from "@/lib/catalogue";
import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CatalogueCourse } from "./catalogue-types";

const ANU_SOURCE_BASE_URL = "https://programsandcourses.anu.edu.au";

type CourseVersionRow = {
  id: number;
  course_id: number;
  title: string;
  units: number;
  level: number;
  subject: string;
  school: string;
  convener: string | null;
  delivery_summary: string | null;
  description: string;
  publication_status: string;
  review_state: string;
  source_updated_at: string | null;
};

type CourseIdentityRow = { id: number; code: string };
type OfferingRow = {
  id: number;
  course_version_id: number;
  delivery_mode: string | null;
};
type OfferingSessionRow = {
  course_offering_id: number;
  academic_period_id: number;
  delivery_mode: string | null;
};
type AcademicPeriodRow = { id: number; name: string; short_name: string };
type CourseRuleRow = {
  id: number;
  course_version_id: number;
  rule_kind: string;
  source_text: string;
};
type CourseRuleConditionRow = {
  course_rule_id: number;
  condition_kind: string;
  required_course_id: number | null;
};
type CourseVersionIdentityRow = { id: number; course_id: number };

function demoCatalogue(): CatalogueCourse[] {
  return demoCourses.map((course) => ({
    accent: course.accent,
    code: course.code,
    name: course.name,
    year: course.year,
    units: course.units,
    level: course.level,
    subject: course.subject,
    school: course.school,
    convener: course.convener,
    sessions: course.sessions,
    delivery: course.delivery,
    description: course.description,
    prerequisiteText: course.prerequisiteText,
    prerequisiteCodes: course.prerequisiteCodes,
    prerequisiteEdges: demoPrerequisiteEdges(course.code),
    incompatibilityText: course.incompatibilities.join(", "),
    sourceUrl: course.sourceUrl,
    sourceUpdatedAt: null,
    publicationStatus: "published",
    reviewState:
      course.parseState === "Verified"
        ? "verified"
        : course.parseState === "Review"
          ? "review"
          : "automatic",
  }));
}

function demoPrerequisiteEdges(code: string) {
  const edges: { from: string; to: string }[] = [];
  const visited = new Set<string>();

  const visit = (courseCode: string) => {
    if (visited.has(courseCode)) return;
    visited.add(courseCode);
    const course = demoCourseByCode(courseCode);
    if (!course) return;
    for (const prerequisite of course.prerequisiteCodes) {
      edges.push({ from: prerequisite, to: courseCode });
      visit(prerequisite);
    }
  };

  visit(code);
  return edges;
}

function accentFor(code: string): CatalogueCourse["accent"] {
  const accents: CatalogueCourse["accent"][] = [
    "blue",
    "violet",
    "mint",
    "amber",
    "rose",
    "cyan",
  ];
  const sum = [...code].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return accents[sum % accents.length];
}

function sourceUrl(year: number, code: string) {
  return `${ANU_SOURCE_BASE_URL}/${year}/course/${code}`;
}

async function publishedYearId() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogue_years")
    .select("id,year")
    .eq("status", "published")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function loadOfferings(courseVersionIds: readonly number[]) {
  if (courseVersionIds.length === 0) return new Map<number, OfferingRow[]>();

  const supabase = await createClient();
  const { data: offerings, error: offeringsError } = await supabase
    .from("course_offerings")
    .select("id,course_version_id,delivery_mode")
    .in("course_version_id", [...courseVersionIds]);
  if (offeringsError) throw offeringsError;

  const offeringRows = (offerings ?? []) as OfferingRow[];
  const offeringIds = offeringRows.map((offering) => offering.id);
  if (offeringIds.length === 0) return new Map<number, OfferingRow[]>();

  const { data: sessions, error: sessionsError } = await supabase
    .from("offering_sessions")
    .select("course_offering_id,academic_period_id,delivery_mode")
    .in("course_offering_id", offeringIds);
  if (sessionsError) throw sessionsError;

  const sessionRows = (sessions ?? []) as OfferingSessionRow[];
  const periodIds = [
    ...new Set(sessionRows.map((session) => session.academic_period_id)),
  ];
  const { data: periods, error: periodsError } = periodIds.length
    ? await supabase
        .from("academic_periods")
        .select("id,name,short_name")
        .in("id", periodIds)
    : { data: [], error: null };
  if (periodsError) throw periodsError;

  const periodsById = new Map(
    ((periods ?? []) as AcademicPeriodRow[]).map((period) => [
      period.id,
      period,
    ]),
  );
  const sessionsByOffering = new Map<number, OfferingSessionRow[]>();
  for (const session of sessionRows) {
    const existing = sessionsByOffering.get(session.course_offering_id) ?? [];
    existing.push(session);
    sessionsByOffering.set(session.course_offering_id, existing);
  }

  const byCourseVersion = new Map<number, OfferingRow[]>();
  for (const offering of offeringRows) {
    const sessionsForOffering = sessionsByOffering.get(offering.id) ?? [];
    const periodNames = sessionsForOffering
      .map((session) => periodsById.get(session.academic_period_id)?.name)
      .filter((name): name is string => Boolean(name));
    const enriched = {
      ...offering,
      periodNames,
      sessionDeliveryModes: sessionsForOffering
        .map((session) => session.delivery_mode)
        .filter((mode): mode is string => Boolean(mode)),
    };
    const existing = byCourseVersion.get(offering.course_version_id) ?? [];
    existing.push(enriched);
    byCourseVersion.set(offering.course_version_id, existing);
  }

  return byCourseVersion;
}

async function loadPrerequisiteEdges({
  catalogueYearId,
  rootVersion,
  rootCode,
  includeDrafts,
}: {
  catalogueYearId: number;
  rootVersion: CourseVersionIdentityRow;
  rootCode: string;
  includeDrafts: boolean;
}) {
  const supabase = await createClient();
  const codesByCourseId = new Map<number, string>([
    [rootVersion.course_id, rootCode],
  ]);
  const versionsById = new Map<number, CourseVersionIdentityRow>([
    [rootVersion.id, rootVersion],
  ]);
  const seenVersionIds = new Set<number>();
  const edges = new Map<string, { from: string; to: string }>();
  let frontier = [rootVersion];

  while (frontier.length > 0) {
    const current = frontier.filter(
      (version) => !seenVersionIds.has(version.id),
    );
    if (current.length === 0) break;
    current.forEach((version) => seenVersionIds.add(version.id));

    const { data: rules, error: rulesError } = await supabase
      .from("course_rules")
      .select("id,course_version_id,rule_kind,source_text")
      .in(
        "course_version_id",
        current.map((version) => version.id),
      )
      .eq("rule_kind", "prerequisite");
    if (rulesError) throw rulesError;

    const ruleRows = (rules ?? []) as CourseRuleRow[];
    if (ruleRows.length === 0) {
      frontier = [];
      continue;
    }

    const { data: conditions, error: conditionsError } = await supabase
      .from("course_rule_conditions")
      .select("course_rule_id,condition_kind,required_course_id")
      .in(
        "course_rule_id",
        ruleRows.map((rule) => rule.id),
      );
    if (conditionsError) throw conditionsError;

    const conditionsByRule = new Map<number, CourseRuleConditionRow[]>();
    for (const condition of (conditions ?? []) as CourseRuleConditionRow[]) {
      const existing = conditionsByRule.get(condition.course_rule_id) ?? [];
      existing.push(condition);
      conditionsByRule.set(condition.course_rule_id, existing);
    }

    const requiredCourseIds = [
      ...new Set(
        ruleRows.flatMap((rule) =>
          (conditionsByRule.get(rule.id) ?? []).flatMap((condition) =>
            condition.condition_kind === "course" &&
            condition.required_course_id
              ? [condition.required_course_id]
              : [],
          ),
        ),
      ),
    ];
    if (requiredCourseIds.length === 0) {
      frontier = [];
      continue;
    }

    const { data: identities, error: identitiesError } = await supabase
      .from("courses")
      .select("id,code")
      .in("id", requiredCourseIds);
    if (identitiesError) throw identitiesError;
    for (const identity of (identities ?? []) as CourseIdentityRow[]) {
      codesByCourseId.set(identity.id, identity.code);
    }

    for (const rule of ruleRows) {
      const targetVersion = versionsById.get(rule.course_version_id);
      const targetCode = targetVersion
        ? codesByCourseId.get(targetVersion.course_id)
        : undefined;
      if (!targetCode) continue;
      for (const condition of conditionsByRule.get(rule.id) ?? []) {
        if (
          condition.condition_kind !== "course" ||
          !condition.required_course_id
        ) {
          continue;
        }
        const prerequisiteCode = codesByCourseId.get(
          condition.required_course_id,
        );
        if (prerequisiteCode) {
          edges.set(`${prerequisiteCode}:${targetCode}`, {
            from: prerequisiteCode,
            to: targetCode,
          });
        }
      }
    }

    let nextVersionsQuery = supabase
      .from("course_versions")
      .select("id,course_id")
      .eq("catalogue_year_id", catalogueYearId)
      .in("course_id", requiredCourseIds);
    if (!includeDrafts) {
      nextVersionsQuery = nextVersionsQuery.eq(
        "publication_status",
        "published",
      );
    }
    const { data: nextVersions, error: nextVersionsError } =
      await nextVersionsQuery;
    if (nextVersionsError) throw nextVersionsError;

    frontier = (nextVersions ?? []) as CourseVersionIdentityRow[];
    for (const version of frontier) versionsById.set(version.id, version);
  }

  return [...edges.values()];
}

function asCatalogueCourse({
  year,
  version,
  code,
  offerings,
  prerequisiteText = "No prerequisite information is available.",
  prerequisiteCodes = [],
  prerequisiteEdges = prerequisiteCodes.map((from) => ({ from, to: code })),
  incompatibilityText = "",
}: {
  year: number;
  version: CourseVersionRow;
  code: string;
  offerings: Array<
    OfferingRow & { periodNames?: string[]; sessionDeliveryModes?: string[] }
  >;
  prerequisiteText?: string;
  prerequisiteCodes?: string[];
  prerequisiteEdges?: { from: string; to: string }[];
  incompatibilityText?: string;
}): CatalogueCourse {
  const sessions = [
    ...new Set(offerings.flatMap((offering) => offering.periodNames ?? [])),
  ].sort();
  const delivery =
    offerings
      .flatMap((offering) => [
        offering.delivery_mode,
        ...(offering.sessionDeliveryModes ?? []),
      ])
      .find((mode): mode is string => Boolean(mode)) ??
    version.delivery_summary ??
    "Not listed";

  return {
    accent: accentFor(code),
    code,
    name: version.title,
    year,
    units: version.units,
    level: version.level,
    subject: version.subject,
    school: version.school,
    convener: version.convener ?? "Not listed",
    sessions,
    delivery,
    description: version.description,
    prerequisiteText,
    prerequisiteCodes,
    prerequisiteEdges,
    incompatibilityText,
    sourceUrl: sourceUrl(year, code),
    sourceUpdatedAt: version.source_updated_at,
    publicationStatus:
      version.publication_status === "published" ? "published" : "draft",
    reviewState:
      version.review_state === "verified"
        ? "verified"
        : version.review_state === "review"
          ? "review"
          : "automatic",
  };
}

export async function loadPublishedCourses(): Promise<CatalogueCourse[]> {
  if (isDemoMode()) return demoCatalogue();

  // Draft rows remain protected by RLS. Only an authenticated user with the
  // catalogue-import permission may see them in this live catalogue view.
  const includeDrafts = await canManageCatalogueImports();

  const year = await publishedYearId();
  if (!year) return [];

  const supabase = await createClient();
  let versionsQuery = supabase
    .from("course_versions")
    .select(
      "id,course_id,title,units,level,subject,school,convener,delivery_summary,description,publication_status,review_state,source_updated_at",
    )
    .eq("catalogue_year_id", year.id)
    .order("subject")
    .order("title");
  if (!includeDrafts) {
    versionsQuery = versionsQuery.eq("publication_status", "published");
  }
  const { data: versions, error: versionsError } = await versionsQuery;
  if (versionsError) throw versionsError;

  const versionRows = (versions ?? []) as CourseVersionRow[];
  const courseIds = [
    ...new Set(versionRows.map((version) => version.course_id)),
  ];
  const { data: courseIdentities, error: identitiesError } = courseIds.length
    ? await supabase.from("courses").select("id,code").in("id", courseIds)
    : { data: [], error: null };
  if (identitiesError) throw identitiesError;

  const codesById = new Map(
    ((courseIdentities ?? []) as CourseIdentityRow[]).map((course) => [
      course.id,
      course.code,
    ]),
  );
  const offeringsByVersion = await loadOfferings(
    versionRows.map((row) => row.id),
  );

  return versionRows.flatMap((version) => {
    const code = codesById.get(version.course_id);
    if (!code) return [];
    return [
      asCatalogueCourse({
        year: year.year,
        version,
        code,
        offerings: offeringsByVersion.get(version.id) ?? [],
      }),
    ];
  });
}

export async function loadPublishedCourse(
  code: string,
): Promise<CatalogueCourse | null> {
  const normalisedCode = code.trim().toUpperCase();
  if (!/^[A-Z]{4}\d{4}$/.test(normalisedCode)) return null;

  if (isDemoMode()) {
    return (
      demoCatalogue().find((course) => course.code === normalisedCode) ?? null
    );
  }

  const includeDrafts = await canManageCatalogueImports();

  const year = await publishedYearId();
  if (!year) return null;

  const supabase = await createClient();
  const { data: identity, error: identityError } = await supabase
    .from("courses")
    .select("id,code")
    .eq("code", normalisedCode)
    .maybeSingle();
  if (identityError) throw identityError;
  if (!identity) return null;

  let versionQuery = supabase
    .from("course_versions")
    .select(
      "id,course_id,title,units,level,subject,school,convener,delivery_summary,description,publication_status,review_state,source_updated_at",
    )
    .eq("catalogue_year_id", year.id)
    .eq("course_id", identity.id);
  if (!includeDrafts) {
    versionQuery = versionQuery.eq("publication_status", "published");
  }
  const { data: version, error: versionError } =
    await versionQuery.maybeSingle();
  if (versionError) throw versionError;
  if (!version) return null;

  const versionRow = version as CourseVersionRow;
  const [
    { data: rules, error: rulesError },
    offeringsByVersion,
    prerequisiteEdges,
  ] = await Promise.all([
    supabase
      .from("course_rules")
      .select("id,course_version_id,rule_kind,source_text")
      .eq("course_version_id", versionRow.id),
    loadOfferings([versionRow.id]),
    loadPrerequisiteEdges({
      catalogueYearId: year.id,
      rootVersion: versionRow,
      rootCode: identity.code,
      includeDrafts,
    }),
  ]);
  if (rulesError) throw rulesError;

  const ruleRows = (rules ?? []) as CourseRuleRow[];
  const prerequisiteRules = ruleRows.filter(
    (rule) => rule.rule_kind === "prerequisite",
  );
  const incompatibilityRules = ruleRows.filter(
    (rule) => rule.rule_kind === "incompatibility",
  );
  const prerequisiteRuleIds = prerequisiteRules.map((rule) => rule.id);
  const { data: conditions, error: conditionsError } =
    prerequisiteRuleIds.length
      ? await supabase
          .from("course_rule_conditions")
          .select("course_rule_id,condition_kind,required_course_id")
          .in("course_rule_id", prerequisiteRuleIds)
      : { data: [], error: null };
  if (conditionsError) throw conditionsError;

  const conditionRows = (conditions ?? []) as CourseRuleConditionRow[];
  const prerequisiteIds = [
    ...new Set(
      conditionRows.flatMap((condition) =>
        condition.condition_kind === "course" && condition.required_course_id
          ? [condition.required_course_id]
          : [],
      ),
    ),
  ];
  const { data: prerequisiteCourses, error: prerequisiteCoursesError } =
    prerequisiteIds.length
      ? await supabase
          .from("courses")
          .select("id,code")
          .in("id", prerequisiteIds)
      : { data: [], error: null };
  if (prerequisiteCoursesError) throw prerequisiteCoursesError;

  const prerequisiteCodes = ((prerequisiteCourses ?? []) as CourseIdentityRow[])
    .map((course) => course.code)
    .sort();

  return asCatalogueCourse({
    year: year.year,
    version: versionRow,
    code: identity.code,
    offerings: offeringsByVersion.get(versionRow.id) ?? [],
    prerequisiteText:
      prerequisiteRules.map((rule) => rule.source_text).join("\n\n") ||
      "No prerequisites listed.",
    prerequisiteCodes,
    prerequisiteEdges,
    incompatibilityText: incompatibilityRules
      .map((rule) => rule.source_text)
      .join("\n\n"),
  });
}
