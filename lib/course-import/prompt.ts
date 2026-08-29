import {
  COURSE_EXTRACTION_SCHEMA_VERSION,
  type CourseExtraction,
} from "./contract.ts";

export const COURSE_IMPORT_PARSER_VERSION = "coursemap-course-parser.v1";
export const COURSE_IMPORT_PROMPT_VERSION = "coursemap-course-prompt.v1";
export const COURSE_SNAPSHOT_SCHEMA_VERSION = "course-snapshot.v1";

/**
 * This prompt asks for inspectable structured judgements, not hidden reasoning.
 * The strict JSON Schema supplied with the request is the shape authority.
 */
export function buildCourseExtractionSystemPrompt() {
  return `You parse one year-specific ANU Programs and Courses page for Coursemap.

Return exactly one JSON object matching the supplied ${COURSE_EXTRACTION_SCHEMA_VERSION} JSON Schema. Return no prose or markdown fences.

Source rules:
1. Use only facts literally supported by the supplied model input. Never invent a course code, programme code, amount, class, date, session or requirement.
2. Treat front matter code and year as authoritative. Course level comes from the numeric part of the course code.
3. Include offerings and classes only when their calendar year matches the selected course year. Ignore indicative future-year offerings because Coursemap imports each year separately.
4. Preserve variable or ranged unit values. Do not collapse them to one number.
5. Preserve fees with their printed fee year, audience, basis and source wording. Do not assume the fee year equals the selected course year.
6. Preserve learning outcomes, assessment items, outcome links, workload, inherent requirements, prescribed texts, areas of interest, STEM status and graduate attributes when present.
7. Separate hard incompatibilities from discretionary or soft incompatibilities.

Requisite interpretation:
- completed X -> completed
- completed or concurrently enrolled in X -> completed_or_concurrent
- explicit AND -> all_of
- explicit OR -> one_of
- a total unit gate with no level -> min_units_total
- units at a stated level -> min_units_at_level
- units from a stated subject -> min_units_from_subject
- units from an explicit course list -> min_units_from_courses
- programme enrolment requires a literal programme code; otherwise keep the prose in unmodelledText
- permission requirements -> permission
- year standing and GPA/WAM gates use their dedicated rule forms
- ambiguous commas or mixed AND/OR must produce a specific review item
- external accreditation or any unsupported condition stays verbatim in unmodelledText and produces a review item

Evidence and review:
- Every model-interpreted field must have concise evidence whose excerpt occurs verbatim in the supplied input.
- Confidence is about source support, not how plausible a fact seems.
- Use null or [] when source information is absent.
- Add specific actionable review items for ambiguity, unsupported prose, conflicts, malformed references or missing evidence.
- Do not include chain-of-thought, hidden reasoning, commentary or self-evaluation. Only return the schema fields.`;
}

export function buildCourseExtractionUserPrompt({
  expectedCode,
  academicYear,
  modelInput,
}: {
  expectedCode: string;
  academicYear: number;
  modelInput: string;
}) {
  return `Expected course: ${expectedCode.toUpperCase()}\nSelected academic year: ${academicYear}\n\n${modelInput}`;
}

export function emptyCourseExtractionReview(): Pick<
  CourseExtraction,
  "evidence" | "reviewItems" | "overallConfidence"
> {
  return { evidence: [], reviewItems: [], overallConfidence: null };
}
