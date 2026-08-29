import { createHash } from "node:crypto";
import { load } from "cheerio";
import { ANU_PROGRAMS_AND_COURSES_SOURCE } from "./anu-programs-courses";
import { assertSupportedCatalogueYear } from "./catalogue-years";

const PROGRAMME_CODE_PATTERN = /^[A-Z0-9-]+$/;
const COURSE_CODE_PATTERN = /\b[A-Z]{4}\d{4}[A-Z]?\b/g;

export type AnuProgrammeDocument = {
  canonicalUrl: string;
  catalogueYear: number;
  code: string;
  contentSha256: string;
  description: string;
  fetchedAt: string;
  name: string;
  requirementText: string;
  courseCodes: string[];
  units: number;
};

function normaliseText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meta($: ReturnType<typeof load>, name: string) {
  const value = $('meta[name="' + name + '"]')
    .first()
    .attr("content");
  return value ? normaliseText(value) : null;
}

function programmeUrl(catalogueYear: number, programmeCode: string) {
  assertSupportedCatalogueYear(catalogueYear);
  const code = programmeCode.trim().toUpperCase();
  if (!PROGRAMME_CODE_PATTERN.test(code)) {
    throw new TypeError("Choose a valid ANU programme code.");
  }
  return `${ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl}/${catalogueYear}/program/${code}`;
}

function requirementTextFrom($: ReturnType<typeof load>) {
  const heading = $("#program-requirements").first();
  const parts: string[] = [];
  let current = heading.next();

  while (
    current.length > 0 &&
    current.prop("tagName")?.toLowerCase() !== "h2"
  ) {
    const text = normaliseText(current.text());
    if (text) parts.push(text);
    current = current.next();
  }

  return parts.join("\n\n");
}

function unitsFrom($: ReturnType<typeof load>) {
  const text = $(".degree-summary").text();
  const match = text.match(/Minimum\s+(\d+(?:\.\d+)?)\s+units/i);
  return match ? Number(match[1]) : null;
}

export async function fetchAnuProgrammeDocument({
  catalogueYear,
  programmeCode,
  fetchImpl = fetch,
}: {
  catalogueYear: number;
  programmeCode: string;
  fetchImpl?: typeof fetch;
}): Promise<AnuProgrammeDocument> {
  const sourceUrl = programmeUrl(catalogueYear, programmeCode);
  const response = await fetchImpl(sourceUrl, {
    headers: { accept: "text/html" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`ANU programme ${programmeCode} could not be fetched.`);
  }

  const html = await response.text();
  const $ = load(html);
  const code = meta($, "program-code")?.toUpperCase() ?? null;
  const name = meta($, "program-name");
  const description = meta($, "program-description");
  const requirementText = requirementTextFrom($);
  const units = unitsFrom($);

  if (
    !code ||
    !PROGRAMME_CODE_PATTERN.test(code) ||
    !name ||
    !description ||
    !requirementText ||
    !units
  ) {
    throw new Error(
      "The ANU programme page is missing required catalogue details.",
    );
  }

  const courseCodes = [
    ...new Set(requirementText.match(COURSE_CODE_PATTERN) ?? []),
  ];
  return {
    canonicalUrl: sourceUrl,
    catalogueYear,
    code,
    contentSha256: createHash("sha256").update(html, "utf8").digest("hex"),
    courseCodes,
    description,
    fetchedAt: new Date().toISOString(),
    name,
    requirementText,
    units,
  };
}
