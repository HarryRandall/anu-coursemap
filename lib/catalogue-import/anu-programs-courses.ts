import { createHash } from "node:crypto";
import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import {
  parseCatalogueManifest,
  type CatalogueAcademicPeriod,
  type CatalogueCourseDocument,
  type CatalogueCourseRichDetails,
  type CatalogueDiagnostic,
  type CatalogueManifest,
  type CatalogueManifestSource,
  type CatalogueOfferingSession,
} from "./manifest.ts";
import { parseRequisiteSummary } from "../coursemap/requisite-summary.ts";
import { fetchSourceWithRetry } from "./source-http.ts";

export const ANU_COURSE_PARSER_VERSION = "anu-programs-courses-course-v2";

export const ANU_PROGRAMS_AND_COURSES_SOURCE = {
  name: "ANU Programs and Courses",
  kind: "anu_programs_courses_html",
  baseUrl: "https://programsandcourses.anu.edu.au",
} satisfies CatalogueManifestSource;

export const ANU_2026_COURSE_CODES = [
  "ARTH2181",
  "ASIA3032",
  "COMP1100",
  "COMP1110",
  "COMP1130",
  "COMP1140",
  "COMP1600",
  "COMP2100",
  "COMP2120",
  "COMP2300",
  "COMP2310",
  "COMP2400",
  "COMP2610",
  "COMP2700",
  "COMP3430",
  "COMP3500",
  "COMP3600",
  "COMP3610",
  "COMP3620",
  "COMP3670",
  "COMP3703",
  "COMP3900",
  "COMP4130",
  "DESN2010",
  "ENGN1211",
  "ENGN2300",
  "ENVS2015",
  "INFS2024",
  "INFS3002",
  "INFS3024",
  "INFS3059",
  "MATH1005",
  "MATH1013",
  "MATH1115",
  "MATH2222",
  "MATH2301",
  "MATH2307",
  "MGMT2009",
  "MUSI3309",
  "SCOM3029",
  "SOCY2038",
  "SOCY2166",
  "STAT1003",
  "STAT1008",
] as const;

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;
const MAX_SOURCE_BYTES = 2_000_000;
const MONTHS = new Map(
  [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ].map((month, index) => [month.toLowerCase(), index + 1]),
);

type ParseAnuCourseDocumentInput = {
  html: string;
  sourceUrl: string;
  expectedCourseCode: string;
  catalogueYear: number;
  fetchedAt: Date | string;
  httpEtag?: string | null;
  sourceLastModified?: string | null;
};

export type FetchAnuCourseManifestProgress = {
  courseCode: string;
  completed: number;
  total: number;
  ok: boolean;
};

export type FetchAnuCourseManifestOptions = {
  catalogueYear?: number;
  courseCodes?: readonly string[];
  concurrency?: number;
  requestTimeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  signal?: AbortSignal;
  onProgress?: (progress: FetchAnuCourseManifestProgress) => void;
};

type PeriodIdentity = {
  code: string;
  shortName: string;
  sortOrder: number;
  known: boolean;
};

function normaliseText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nullableText(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const normalised = normaliseText(value);
  return normalised || null;
}

function toIsoInstant(value: Date | string, field: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError(`${field} must be a valid date`);
  }
  return date.toISOString();
}

function normaliseSourceUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.origin !== ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl ||
    url.username ||
    url.password
  ) {
    throw new TypeError(
      "sourceUrl must be an official ANU Programs and Courses URL",
    );
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function createAnuCourseUrl(catalogueYear: number, courseCode: string) {
  if (
    !Number.isInteger(catalogueYear) ||
    catalogueYear < 2000 ||
    catalogueYear > 2200
  ) {
    throw new TypeError(
      "catalogueYear must be an integer between 2000 and 2200",
    );
  }
  const code = courseCode.trim().toUpperCase();
  if (!COURSE_CODE_PATTERN.test(code)) {
    throw new TypeError(`Invalid ANU course code: ${courseCode}`);
  }
  return `${ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl}/${catalogueYear}/course/${code}`;
}

function contentSha256(html: string) {
  return createHash("sha256").update(html, "utf8").digest("hex");
}

function metadata($: CheerioAPI, name: string) {
  return nullableText($(`meta[name="${name}"]`).first().attr("content"));
}

function descriptionFromMetadata(value: string | null) {
  if (!value) return null;
  return nullableText(load(value).root().text());
}

function summaryValues($: CheerioAPI, heading: string) {
  const primary = $(".degree-summary.hide-mobile").first();
  const root =
    primary.length > 0 ? primary : $(".degree-summary-inner").first();
  const values: string[] = [];

  root.find(".degree-summary__code").each((_, element) => {
    const item = $(element);
    const itemHeading = normaliseText(
      item.find(".degree-summary__code-heading").first().text(),
    ).toLowerCase();
    if (itemHeading !== heading.toLowerCase()) return;
    item.find(".degree-summary__code-text").each((__, value) => {
      const text = nullableText($(value).text());
      if (text && !values.includes(text)) values.push(text);
    });
  });

  return values;
}

function sectionText($: CheerioAPI, id: string) {
  const heading = $(`#${id}`).first();
  if (!heading.length) return null;
  const text = heading.nextUntil("h2").text();
  return nullableText(text);
}

function elementText($: CheerioAPI, element: Parameters<CheerioAPI>[0]) {
  return nullableText(
    $(element)
      .contents()
      .map((_, child) =>
        child.type === "text"
          ? normaliseText(child.data ?? "")
          : normaliseText($(child).text()),
      )
      .get()
      .filter(Boolean)
      .join(" "),
  );
}

function richCourseDetails($: CheerioAPI): CatalogueCourseRichDetails {
  const introduction = nullableText(
    $("#introduction")
      .first()
      .children()
      .map((_, element) => normaliseText($(element).text()))
      .get()
      .filter(Boolean)
      .join(" ") || $("#introduction").first().text(),
  );
  const learningOutcomes = $("#learning-outcomes")
    .first()
    .nextUntil("h2")
    .find("li")
    .map((_, element) => nullableText($(element).text()))
    .get()
    .filter((item): item is string => Boolean(item));
  const assessment = $("#indicative-assessment")
    .first()
    .nextUntil("h2")
    .find("li")
    .map((_, element) => {
      const text = elementText($, element);
      if (!text) return null;
      const outcomes = (
        /\[LO\s*([^\]]+)\]/i.exec(text)?.[1].match(/\d+/g) ?? []
      ).map(Number);
      const weight = /\((\d+(?:\.\d+)?)\)/.exec(text)?.[1];
      const title = nullableText(
        text
          .replace(/\s*\([^)]*\)/g, "")
          .replace(/\s*\[LO[^\]]*\]/gi, "")
          .replace(/([a-z])([A-Z][a-z])/g, "$1 $2"),
      );
      return title
        ? { title, weight: weight ? Number(weight) : null, outcomes }
        : null;
    })
    .get()
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const workload = sectionText($, "workload");
  const workloadHours = Number(
    /\b(\d{1,4})\s+hours?\b/i.exec(workload ?? "")?.[1],
  );
  const feesText = $("#fees").first().parent().text();
  const feeBand = Number(
    /Student Contribution Band:\s*(\d+)/i.exec(feesText)?.[1],
  );
  const domesticFee = Number(
    /\$([\d,]+(?:\.\d{2})?)/
      .exec($("#indicative-fees__domestic").first().text())?.[1]
      ?.replace(/,/g, ""),
  );
  const internationalFee = Number(
    /\$([\d,]+(?:\.\d{2})?)/
      .exec($("#indicative-fees__international").first().text())?.[1]
      ?.replace(/,/g, ""),
  );

  return {
    ...(introduction ? { introduction } : {}),
    ...(summaryValues($, "ANU College")[0]
      ? { college: summaryValues($, "ANU College")[0] }
      : {}),
    ...(summaryValues($, "Areas of interest").length > 0
      ? {
          areasOfInterest: summaryValues($, "Areas of interest").flatMap(
            (value) => value.split(",").map(normaliseText).filter(Boolean),
          ),
        }
      : {}),
    ...(summaryValues($, "Co-taught course").length > 0
      ? { coTaughtCourses: summaryValues($, "Co-taught course") }
      : {}),
    ...(learningOutcomes.length > 0 ? { learningOutcomes } : {}),
    ...(assessment.length > 0 ? { indicativeAssessment: assessment } : {}),
    ...(workload ? { workload } : {}),
    ...(Number.isFinite(workloadHours) ? { workloadHours } : {}),
    ...(Number.isFinite(feeBand) ? { feeBand } : {}),
    ...(Number.isFinite(domesticFee) ? { domesticFee } : {}),
    ...(Number.isFinite(internationalFee) ? { internationalFee } : {}),
  };
}

function addMissingFieldDiagnostic(
  diagnostics: CatalogueDiagnostic[],
  field: string,
) {
  diagnostics.push({
    code: "MISSING_REQUIRED_COURSE_FIELD",
    severity: "error",
    message: `The official page did not provide ${field}.`,
    field,
  });
}

function parseUnits(value: string | null) {
  const match = value?.match(/(\d+(?:\.\d+)?)\s*units?/i);
  if (!match) return null;
  const units = Number(match[1]);
  return Number.isFinite(units) && units > 0 ? units : null;
}

function levelFromCourseCode(code: string | null) {
  if (!code || !COURSE_CODE_PATTERN.test(code)) return null;
  return Number(code.slice(4, 5)) * 1000;
}

function splitRequisiteText(rawText: string | null) {
  if (!rawText) {
    return { rawRequisiteText: null, rawIncompatibilityText: null };
  }

  const incompatibility =
    /\b(?:this course is incompatible with|incompatible with|incompatibl(?:e|ity):|you (?:are )?not able to enrol in this course if you have (?:successfully )?completed)/i;
  const match = incompatibility.exec(rawText);
  if (!match || match.index === undefined) {
    return { rawRequisiteText: rawText, rawIncompatibilityText: null };
  }

  return {
    rawRequisiteText: nullableText(rawText.slice(0, match.index)),
    rawIncompatibilityText: nullableText(rawText.slice(match.index)),
  };
}

/**
 * ANU wraps course codes in links, and a plain text() run glues the code to
 * the word that follows it, producing wording such as "ACST4031and be
 * enrolled". Links and block elements are separated before the text is read,
 * then punctuation is pulled back onto the preceding word.
 */
function readRequisiteText($: CheerioAPI, root: Cheerio<AnyNode>) {
  const clone = root.clone();
  clone.find("a, br, p, li, div").each((_, element) => {
    $(element).before(" ").after(" ");
  });
  return normaliseText(clone.text()).replace(/\s+([,.;:)])/gu, "$1");
}

function extractRequisites($: CheerioAPI, diagnostics: CatalogueDiagnostic[]) {
  const requisite = $("#incompatibility").nextAll(".requisite").first();
  const fallback = $(".requisite").first();
  const root = requisite.length > 0 ? requisite : fallback;
  const extractedText = nullableText(readRequisiteText($, root));
  const observed = extractedText !== null;
  const rawText =
    extractedText && !/^none\.?$/i.test(extractedText) ? extractedText : null;
  const linkedCourseCodes = new Set<string>();

  if (!observed) {
    diagnostics.push({
      code: "REQUISITE_SECTION_NOT_OBSERVED",
      severity: "warning",
      message:
        "The official requisite section could not be observed, so prior rules must not be removed automatically.",
      field: "course.requisites",
    });
  }

  root.find("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const hrefCode = href.match(/\/course\/([A-Z]{4}\d{4})(?:\/|$)/i)?.[1];
    const textCode = normaliseText($(element).text()).match(
      /\b[A-Z]{4}\d{4}\b/i,
    )?.[0];
    const code = (hrefCode ?? textCode)?.toUpperCase();
    if (code && COURSE_CODE_PATTERN.test(code)) linkedCourseCodes.add(code);
  });

  for (const code of rawText?.match(/\b[A-Z]{4}\d{4}\b/g) ?? []) {
    linkedCourseCodes.add(code.toUpperCase());
  }

  const splitText = splitRequisiteText(rawText);
  const structuredPrerequisite =
    splitText.rawRequisiteText !== null &&
    parseRequisiteSummary(splitText.rawRequisiteText) !== null;

  if (rawText && !structuredPrerequisite) {
    diagnostics.push({
      code: "UNSTRUCTURED_REQUISITE_TEXT",
      severity: "warning",
      message:
        "Requisite and incompatibility logic is preserved as source text and requires structured review.",
      field: "course.requisites.rawText",
      sourceFragment: rawText,
    });
  }

  return {
    observed,
    rawText,
    ...splitText,
    linkedCourseCodes: [...linkedCourseCodes].sort(),
  };
}

function parseAnuDate(value: string | null) {
  if (!value) return null;
  const normalised = normaliseText(value);
  const named = normalised.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  const numeric = normalised.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const year = Number(named?.[3] ?? numeric?.[3]);
  const month = named
    ? MONTHS.get(named[2].toLowerCase())
    : Number(numeric?.[2]);
  const day = Number(named?.[1] ?? numeric?.[1]);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function periodIdentity(name: string): PeriodIdentity {
  const normalised = normaliseText(name).toLowerCase();
  const known = new Map<string, Omit<PeriodIdentity, "known">>([
    ["summer session", { code: "SUMMER", shortName: "Summer", sortOrder: 5 }],
    ["first semester", { code: "S1", shortName: "S1", sortOrder: 10 }],
    ["autumn session", { code: "AUTUMN", shortName: "Autumn", sortOrder: 15 }],
    ["winter session", { code: "WINTER", shortName: "Winter", sortOrder: 20 }],
    ["second semester", { code: "S2", shortName: "S2", sortOrder: 30 }],
    ["spring session", { code: "SPRING", shortName: "Spring", sortOrder: 35 }],
  ]).get(normalised);
  if (known) return { ...known, known: true };

  const code = normalised
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
  return {
    code: code || "UNKNOWN",
    shortName: normaliseText(name),
    sortOrder: 100,
    known: false,
  };
}

function classSummaryUrl(value: string | undefined, canonicalUrl: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value, canonicalUrl);
    if (url.origin !== ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl)
      return undefined;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function extractOfferings(
  $: CheerioAPI,
  catalogueYear: number,
  canonicalUrl: string,
  diagnostics: CatalogueDiagnostic[],
) {
  const yearAnchor = $(".course-tabs-menu a").filter((_, element) => {
    return normaliseText($(element).text()) === String(catalogueYear);
  });
  const target = yearAnchor.first().attr("href");
  if (!target || !/^#course-tab-\d+$/.test(target)) {
    diagnostics.push({
      code: "MISSING_CATALOGUE_YEAR_OFFERINGS",
      severity: "warning",
      message: `No ${catalogueYear} offering table was found.`,
      field: "offering.sessions",
    });
    return { observed: false, periods: [], sessions: [] };
  }

  const content = $(target).first();
  if (content.length === 0) {
    diagnostics.push({
      code: "MISSING_CATALOGUE_YEAR_OFFERINGS",
      severity: "warning",
      message: `The ${catalogueYear} offering navigation target was not observed.`,
      field: "offering.sessions",
    });
    return { observed: false, periods: [], sessions: [] };
  }
  const periods = new Map<string, CatalogueAcademicPeriod>();
  const sessions: CatalogueOfferingSession[] = [];
  const sessionCounts = new Map<string, number>();
  let recognisedTableCount = 0;

  content.children("h3").each((_, headingElement) => {
    const heading = $(headingElement);
    const name = nullableText(heading.text());
    const table = heading.next("table.table-terms").first();
    if (!name || table.length === 0) return;
    recognisedTableCount += 1;

    const identity = periodIdentity(name);
    if (!identity.known) {
      diagnostics.push({
        code: "UNKNOWN_ACADEMIC_PERIOD",
        severity: "warning",
        message: `The offering period '${name}' needs a reviewed internal code.`,
        field: "periods",
        sourceFragment: name,
      });
    }

    const headers = table
      .find("thead th")
      .toArray()
      .map((header) => normaliseText($(header).text()).toLowerCase());
    const column = (label: string) => headers.indexOf(label.toLowerCase());

    table.find("tbody tr").each((__, rowElement) => {
      const row = $(rowElement);
      const cells = row.find("td").toArray();
      const cellText = (label: string) => {
        const index = column(label);
        return index >= 0 ? nullableText($(cells[index]).text()) : null;
      };
      const classNumber = cellText("Class number") ?? undefined;
      const startsOn = parseAnuDate(cellText("Class start date"));
      const endsOn = parseAnuDate(cellText("Class end date"));
      const sourceFragment = normaliseText(row.text());

      if (!classNumber || !/^\d+$/.test(classNumber)) {
        diagnostics.push({
          code: "NON_CLASS_OFFERING_ROW_IGNORED",
          severity: "warning",
          message: `A non-class row in the ${name} offering table was ignored.`,
          field: "offering.sessions",
          sourceFragment,
        });
        return;
      }

      if (
        !startsOn ||
        !endsOn ||
        startsOn.slice(0, 4) !== String(catalogueYear)
      ) {
        diagnostics.push({
          code: "INVALID_OFFERING_DATES",
          severity: "warning",
          message: `The ${name} offering has missing, malformed or out-of-scope dates.`,
          field: "offering.sessions",
          sourceFragment,
        });
        return;
      }

      const period: CatalogueAcademicPeriod = {
        calendarYear: catalogueYear,
        code: identity.code,
        name,
        shortName: identity.shortName,
        startsOn,
        endsOn,
        sortOrder: identity.sortOrder,
      };
      const existing = periods.get(identity.code);
      if (
        existing &&
        (existing.startsOn !== period.startsOn ||
          existing.endsOn !== period.endsOn)
      ) {
        diagnostics.push({
          code: "CONFLICTING_ACADEMIC_PERIOD_DATES",
          severity: "warning",
          message: `${name} has conflicting date ranges on the same page.`,
          field: "periods",
          sourceFragment,
        });
      } else if (!existing) {
        periods.set(identity.code, period);
      }

      const deliveryMode = cellText("Mode Of Delivery") ?? undefined;
      const location = cellText("Location") ?? undefined;
      const summaryIndex = column("Class Summary");
      const summaryHref =
        summaryIndex >= 0
          ? $(cells[summaryIndex]).find("a[href]").attr("href")
          : undefined;
      const lastEnrolmentDate = parseAnuDate(cellText("Last day to enrol"));
      const censusDate = parseAnuDate(cellText("Census date"));
      const summaryUrl = classSummaryUrl(summaryHref, canonicalUrl);
      const session: CatalogueOfferingSession = {
        periodCode: identity.code,
        calendarYear: catalogueYear,
        startsOn,
        endsOn,
        ...(deliveryMode ? { deliveryMode } : {}),
        ...(location ? { location } : {}),
        ...(classNumber ? { classNumber } : {}),
        ...(lastEnrolmentDate ? { lastEnrolmentDate } : {}),
        ...(censusDate ? { censusDate } : {}),
        ...(summaryUrl ? { classSummaryUrl: summaryUrl } : {}),
        sourceFragment,
      };
      sessions.push(session);
      sessionCounts.set(
        identity.code,
        (sessionCounts.get(identity.code) ?? 0) + 1,
      );
    });
  });

  for (const [periodCode, count] of sessionCounts) {
    if (count > 1) {
      diagnostics.push({
        code: "MULTIPLE_CLASSES_IN_ACADEMIC_PERIOD",
        severity: "warning",
        message: `${count} classes share the ${periodCode} period and require offering review.`,
        field: "offering.sessions",
      });
    }
  }
  const observed = recognisedTableCount > 0;
  if (!observed) {
    diagnostics.push({
      code: "OFFERING_TABLES_NOT_OBSERVED",
      severity: "warning",
      message: `No recognised ${catalogueYear} offering tables were observed.`,
      field: "offering.sessions",
    });
  } else if (sessions.length === 0) {
    diagnostics.push({
      code: "NO_CURRENT_YEAR_OFFERINGS",
      severity: "warning",
      message: `No usable ${catalogueYear} offerings were found.`,
      field: "offering.sessions",
    });
  }

  return {
    observed,
    periods: [...periods.values()].sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.code.localeCompare(right.code),
    ),
    sessions,
  };
}

function compactSourceFragment(
  courseCode: string,
  title: string | null,
  units: number | null,
  school: string | null,
  requisiteText: string | null,
  sessions: CatalogueOfferingSession[],
) {
  return [
    `${courseCode}${title ? ` ${title}` : ""}`,
    units === null ? null : `${units} units`,
    school,
    requisiteText,
    ...sessions.map((session) => session.sourceFragment ?? null),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

export function parseAnuCourseDocument({
  html,
  sourceUrl,
  expectedCourseCode,
  catalogueYear,
  fetchedAt,
  httpEtag,
  sourceLastModified,
}: ParseAnuCourseDocumentInput): CatalogueCourseDocument {
  if (!html.trim()) throw new TypeError("html must not be empty");
  const expectedCode = expectedCourseCode.trim().toUpperCase();
  const requestedUrl = normaliseSourceUrl(sourceUrl);
  createAnuCourseUrl(catalogueYear, expectedCode);
  const $ = load(html);
  const diagnostics: CatalogueDiagnostic[] = [];

  const metaCode = metadata($, "course-code")?.toUpperCase() ?? null;
  const fallbackCode =
    nullableText(
      $(".molecule__label a[href*='/course/']").first().text(),
    )?.toUpperCase() ?? null;
  const code = metaCode ?? fallbackCode;
  if (!metaCode && fallbackCode) {
    diagnostics.push({
      code: "FALLBACK_COURSE_CODE_SELECTOR",
      severity: "warning",
      message:
        "The course code was read from visible content because metadata was missing.",
      field: "course.code",
      sourceFragment: fallbackCode,
    });
  }
  if (!code || !COURSE_CODE_PATTERN.test(code)) {
    addMissingFieldDiagnostic(diagnostics, "course.code");
  } else if (code !== expectedCode) {
    diagnostics.push({
      code: "COURSE_CODE_MISMATCH",
      severity: "error",
      message: `Expected ${expectedCode}, but the official page identified ${code}.`,
      field: "course.code",
      sourceFragment: code,
    });
  }

  const parsedYear = Number(metadata($, "course-year"));
  if (parsedYear !== catalogueYear) {
    diagnostics.push({
      code: "CATALOGUE_YEAR_MISMATCH",
      severity: "error",
      message: `Expected catalogue year ${catalogueYear}, but found ${Number.isFinite(parsedYear) ? parsedYear : "none"}.`,
      field: "catalogueYear",
    });
  }

  const title =
    metadata($, "course-name") ??
    nullableText($(".intro__degree-title").first().text());
  const description =
    descriptionFromMetadata(metadata($, "course-description")) ??
    nullableText(
      $("#overview .body__inner").first().children("p").first().text(),
    );
  const unitsText = nullableText(
    $(".degree-summary.hide-mobile .degree-summary__requirements-units")
      .first()
      .text() || $(".degree-summary__requirements-units").first().text(),
  );
  const units = parseUnits(unitsText);
  const subjectNameValues = summaryValues($, "Course subject");
  const schoolValues = summaryValues($, "Offered by");
  const subject =
    code && COURSE_CODE_PATTERN.test(code) ? code.slice(0, 4) : null;
  const subjectName = subjectNameValues[0] ?? null;
  const school = schoolValues[0] ?? null;
  const level = levelFromCourseCode(code);

  if (!subjectName) {
    diagnostics.push({
      code: "MISSING_COURSE_SUBJECT_NAME",
      severity: "warning",
      message:
        "The official page did not provide its human-readable course subject.",
      field: "course.subjectName",
    });
  }

  for (const [field, value] of [
    ["course.title", title],
    ["course.description", description],
    ["course.units", units],
    ["course.level", level],
    ["course.subject", subject],
    ["course.school", school],
  ] as const) {
    if (value === null) addMissingFieldDiagnostic(diagnostics, field);
  }
  if (subjectNameValues.length > 1 || schoolValues.length > 1) {
    diagnostics.push({
      code: "CONFLICTING_COURSE_METADATA",
      severity: "error",
      message: "The page contains conflicting subject or school values.",
      field:
        subjectNameValues.length > 1 ? "course.subjectName" : "course.school",
      sourceFragment: [...subjectNameValues, ...schoolValues].join(" | "),
    });
  }

  const canonicalHref = $("link[rel='canonical']").first().attr("href");
  let canonicalUrl = requestedUrl;
  if (canonicalHref) {
    try {
      canonicalUrl = normaliseSourceUrl(
        new URL(canonicalHref, requestedUrl).toString(),
      );
    } catch {
      diagnostics.push({
        code: "INVALID_CANONICAL_URL",
        severity: "error",
        message: "The official page supplied an invalid canonical URL.",
        field: "canonicalUrl",
        sourceFragment: canonicalHref,
      });
    }
  } else {
    diagnostics.push({
      code: "MISSING_CANONICAL_URL",
      severity: "warning",
      message:
        "The page omitted its canonical link, so the requested official URL was retained.",
      field: "canonicalUrl",
    });
  }
  const canonical = new URL(canonicalUrl);
  const expectedPath = `/${catalogueYear}/course/${expectedCode}`.toLowerCase();
  if (canonical.pathname.replace(/\/$/, "").toLowerCase() !== expectedPath) {
    diagnostics.push({
      code: "CANONICAL_URL_MISMATCH",
      severity: "error",
      message:
        "The canonical URL does not match the scoped course and catalogue year.",
      field: "canonicalUrl",
      sourceFragment: canonicalUrl,
    });
  }

  const requisites = extractRequisites($, diagnostics);
  const {
    observed: offeringObserved,
    periods,
    sessions,
  } = extractOfferings($, catalogueYear, canonicalUrl, diagnostics);
  const deliveryModes = [
    ...new Set(
      sessions.flatMap((session) =>
        session.deliveryMode ? [session.deliveryMode] : [],
      ),
    ),
  ];
  let lastModified: string | undefined;
  if (sourceLastModified) {
    try {
      lastModified = toIsoInstant(sourceLastModified, "sourceLastModified");
    } catch {
      diagnostics.push({
        code: "INVALID_SOURCE_LAST_MODIFIED",
        severity: "warning",
        message:
          "The HTTP Last-Modified header was not a valid date and was omitted.",
        field: "sourceLastModified",
        sourceFragment: sourceLastModified,
      });
    }
  }
  const etag = nullableText(httpEtag);

  return {
    entityKind: "course",
    externalKey: expectedCode,
    canonicalUrl,
    fetchedAt: toIsoInstant(fetchedAt, "fetchedAt"),
    contentSha256: contentSha256(html),
    ...(etag ? { httpEtag: etag } : {}),
    ...(lastModified ? { sourceLastModified: lastModified } : {}),
    course: {
      code: code && COURSE_CODE_PATTERN.test(code) ? code : null,
      title,
      units,
      description,
      level,
      subject,
      ...(subjectName ? { subjectName } : {}),
      school,
      ...(summaryValues($, "Academic career")[0]
        ? { academicCareer: summaryValues($, "Academic career")[0] }
        : {}),
      ...(summaryValues($, "Course convener").length > 0
        ? { convener: summaryValues($, "Course convener").join("; ") }
        : {}),
      ...(summaryValues($, "Mode of delivery")[0]
        ? { deliverySummary: summaryValues($, "Mode of delivery")[0] }
        : {}),
      rich: richCourseDetails($),
      requisites,
    },
    offeringObserved,
    periods,
    ...(sessions.length > 0
      ? {
          offering: {
            ...(deliveryModes.length === 1
              ? { deliveryMode: deliveryModes[0] }
              : {}),
            sessions,
          },
        }
      : {}),
    diagnostics,
    sourceFragment: compactSourceFragment(
      expectedCode,
      title,
      units,
      school,
      requisites.rawText,
      sessions,
    ),
  };
}

function normaliseScope(courseCodes: readonly string[]) {
  const courseCodesInScope: string[] = [];
  const diagnostics: CatalogueDiagnostic[] = [];
  const seen = new Set<string>();

  for (const input of courseCodes) {
    const code = input.trim().toUpperCase();
    if (!COURSE_CODE_PATTERN.test(code)) {
      diagnostics.push({
        code: "INVALID_SCOPE_COURSE_CODE",
        severity: "error",
        message: `'${input}' is not a valid ANU course code and was not fetched.`,
        field: "scope.courseCodes",
        sourceFragment: input,
      });
    } else if (seen.has(code)) {
      diagnostics.push({
        code: "DUPLICATE_SCOPE_COURSE_CODE",
        severity: "warning",
        message: `${code} appeared more than once and was fetched once.`,
        field: "scope.courseCodes",
        sourceFragment: code,
      });
    } else {
      seen.add(code);
      courseCodesInScope.push(code);
    }
  }

  return { courseCodes: courseCodesInScope, diagnostics };
}

type FetchAnuCourseDocumentContext = {
  fetchImpl: typeof fetch;
  now: () => Date;
  signal?: AbortSignal;
  requestTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
};

async function fetchAnuCourseDocument(
  catalogueYear: number,
  courseCode: string,
  {
    fetchImpl,
    now,
    signal,
    requestTimeoutMs,
    retryAttempts,
    retryDelayMs,
  }: FetchAnuCourseDocumentContext,
) {
  const sourceUrl = createAnuCourseUrl(catalogueYear, courseCode);
  const response = await fetchSourceWithRetry(sourceUrl, {
    fetchImpl,
    signal,
    requestTimeoutMs,
    retryAttempts,
    retryDelayMs,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.toLowerCase().includes("text/html")) {
    throw new Error(`Unexpected content type ${contentType}`);
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SOURCE_BYTES) {
    throw new Error(`Source exceeded ${MAX_SOURCE_BYTES} bytes`);
  }
  const html = await response.text();
  if (Buffer.byteLength(html, "utf8") > MAX_SOURCE_BYTES) {
    throw new Error(`Source exceeded ${MAX_SOURCE_BYTES} bytes`);
  }

  return parseAnuCourseDocument({
    html,
    sourceUrl,
    expectedCourseCode: courseCode,
    catalogueYear,
    fetchedAt: now(),
    httpEtag: response.headers.get("etag"),
    sourceLastModified: response.headers.get("last-modified"),
  });
}

export async function fetchAnuCourseManifest({
  catalogueYear = 2026,
  courseCodes = ANU_2026_COURSE_CODES,
  concurrency = 4,
  requestTimeoutMs = 30_000,
  retryAttempts = 3,
  retryDelayMs = 500,
  fetchImpl = fetch,
  now = () => new Date(),
  signal,
  onProgress,
}: FetchAnuCourseManifestOptions = {}): Promise<CatalogueManifest> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new TypeError("concurrency must be an integer between 1 and 8");
  }
  createAnuCourseUrl(catalogueYear, "COMP0000");
  const scope = normaliseScope(courseCodes);
  const documents = new Array<CatalogueCourseDocument | undefined>(
    scope.courseCodes.length,
  );
  const diagnostics = [...scope.diagnostics];
  const context: FetchAnuCourseDocumentContext = {
    fetchImpl,
    now,
    signal,
    requestTimeoutMs,
    retryAttempts,
    retryDelayMs,
  };
  let nextIndex = 0;
  let completed = 0;

  const worker = async () => {
    while (nextIndex < scope.courseCodes.length) {
      const index = nextIndex;
      nextIndex += 1;
      const courseCode = scope.courseCodes[index];
      let ok = true;
      try {
        documents[index] = await fetchAnuCourseDocument(
          catalogueYear,
          courseCode,
          context,
        );
      } catch (error) {
        ok = false;
        diagnostics.push({
          code: "SOURCE_FETCH_FAILED",
          severity: "error",
          message: `${courseCode} could not be fetched: ${error instanceof Error ? error.message : "unknown error"}`,
          field: `documents.${courseCode}`,
          sourceFragment: createAnuCourseUrl(catalogueYear, courseCode),
        });
      }
      completed += 1;
      onProgress?.({
        courseCode,
        completed,
        total: scope.courseCodes.length,
        ok,
      });
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, scope.courseCodes.length) },
      () => worker(),
    ),
  );

  return parseCatalogueManifest({
    schemaVersion: 1,
    parserVersion: ANU_COURSE_PARSER_VERSION,
    catalogueYear,
    source: { ...ANU_PROGRAMS_AND_COURSES_SOURCE },
    scope: { kind: "course_codes", courseCodes: scope.courseCodes },
    documents: documents.filter(
      (document): document is CatalogueCourseDocument => Boolean(document),
    ),
    diagnostics,
  });
}
