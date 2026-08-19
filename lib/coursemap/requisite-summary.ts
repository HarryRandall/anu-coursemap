export type RequisiteCondition =
  | {
      kind: "course";
      code: string;
    }
  | {
      kind: "subject_units";
      subject: string;
      units: number;
    }
  | {
      kind: "level_units";
      units: number;
      level: number;
      subject?: string;
    }
  | {
      kind: "units_total";
      units: number;
    };

export type RequisiteExpression =
  | RequisiteCondition
  | {
      kind: "group";
      operator: "all_of" | "any_of";
      conditions: RequisiteExpression[];
    };

export type CompletedRequisiteCourse = {
  code: string;
  units: number;
};

export type RequisiteProgress =
  | {
      kind: "course";
      code: string;
      satisfied: boolean;
    }
  | {
      completedUnits: number;
      kind: "subject_units";
      requiredUnits: number;
      satisfied: boolean;
      subject: string;
    }
  | {
      completedUnits: number;
      kind: "level_units";
      level: number;
      requiredUnits: number;
      satisfied: boolean;
      subject?: string;
    }
  | {
      completedUnits: number;
      kind: "units_total";
      requiredUnits: number;
      satisfied: boolean;
    }
  | {
      conditions: RequisiteProgress[];
      kind: "group";
      operator: "all_of" | "any_of";
      satisfied: boolean;
    };

type RequisiteToken =
  | {
      kind:
        | "and"
        | "clause_and"
        | "comma"
        | "left_parenthesis"
        | "or"
        | "right_parenthesis";
    }
  | { kind: "condition"; condition: RequisiteCondition };

const COURSE_LEVEL_PATTERN = /^[A-Z]{4}(\d)\d{3}$/u;

function normaliseSourceText(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

/**
 * Official enrolment preambles carry no rule content, so they are removed
 * before tokenising. Anything else left unrecognised still refuses to parse.
 */
function stripPreamble(value: string) {
  return value
    .replace(
      /^to enrol in (?:this|the) course,? (?:you|students) must have (?:successfully )?completed:?\s*(?:the following:?\s*)?/iu,
      "",
    )
    .replace(
      /^to enrol in [A-Z]{4}\d{4},? (?:you|students) must have (?:successfully )?completed:?\s*/iu,
      "",
    )
    .replace(/^either\s+/iu, "");
}

function tokenise(sourceText: string): RequisiteToken[] | null {
  const tokens: RequisiteToken[] = [];
  let remainder = sourceText;

  while (remainder) {
    remainder = remainder.replace(/^\s+/u, "");
    if (!remainder) break;

    const punctuation = remainder[0];
    if (punctuation === "(") {
      tokens.push({ kind: "left_parenthesis" });
      remainder = remainder.slice(1);
      continue;
    }
    if (punctuation === ")") {
      tokens.push({ kind: "right_parenthesis" });
      remainder = remainder.slice(1);
      continue;
    }
    if (punctuation === ",") {
      tokens.push({ kind: "comma" });
      remainder = remainder.slice(1);
      continue;
    }

    const clauseConjunction = /^as well as\b/iu.exec(remainder)?.[0];
    if (clauseConjunction) {
      tokens.push({ kind: "clause_and" });
      remainder = remainder.slice(clauseConjunction.length);
      continue;
    }

    const conjunction = /^(AND|OR)\b/iu.exec(remainder)?.[1];
    if (conjunction) {
      tokens.push({ kind: conjunction.toLowerCase() as "and" | "or" });
      remainder = remainder.slice(conjunction.length);
      continue;
    }

    const levelUnits =
      /^(?:at least\s+)?(\d+(?:\.\d+)?)\s+units?\s+of\s+(\d)000[-\s]level(?:\s+([A-Z]{4}))?(?:[-\s]coded)?(?:\s+courses?)?\b/iu.exec(
        remainder,
      );
    if (levelUnits) {
      tokens.push({
        kind: "condition",
        condition: {
          kind: "level_units",
          units: Number(levelUnits[1]),
          level: Number(levelUnits[2]) * 1000,
          ...(levelUnits[3] ? { subject: levelUnits[3].toUpperCase() } : {}),
        },
      });
      remainder = remainder.slice(levelUnits[0].length);
      continue;
    }

    const totalUnits =
      /^(?:at least\s+)?(\d+(?:\.\d+)?)\s+units?\s+of\s+(?:prior\s+)?(?:tertiary|university)\s+study\b/iu.exec(
        remainder,
      );
    if (totalUnits) {
      tokens.push({
        kind: "condition",
        condition: { kind: "units_total", units: Number(totalUnits[1]) },
      });
      remainder = remainder.slice(totalUnits[0].length);
      continue;
    }

    const subjectUnits =
      /^(?:at least\s+)?(\d+(?:\.\d+)?)\s+units?\s+of\s+([A-Z]{4})(?:[-\s]coded)?(?:\s+courses?)?\b/iu.exec(
        remainder,
      );
    if (subjectUnits) {
      tokens.push({
        kind: "condition",
        condition: {
          kind: "subject_units",
          subject: subjectUnits[2].toUpperCase(),
          units: Number(subjectUnits[1]),
        },
      });
      remainder = remainder.slice(subjectUnits[0].length);
      continue;
    }

    const course = /^([A-Z]{4}\d{4})\b/iu.exec(remainder)?.[1];
    if (course) {
      tokens.push({
        kind: "condition",
        condition: { kind: "course", code: course.toUpperCase() },
      });
      remainder = remainder.slice(course.length);
      continue;
    }

    return null;
  }

  return tokens.length > 0 ? tokens : null;
}

/**
 * Resolves commas without guessing. A comma directly before a conjunction is
 * an Oxford comma; ", as well as" separates whole clauses; and a plain list
 * comma adopts the run's terminating conjunction only when nothing but plain
 * conditions sit between them. Any other comma refuses to parse.
 */
function resolveCommas(tokens: RequisiteToken[]): RequisiteToken[] | null {
  const resolved: RequisiteToken[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "comma") {
      resolved.push(token);
      continue;
    }

    const next = tokens[index + 1];
    if (
      next?.kind === "and" ||
      next?.kind === "or" ||
      next?.kind === "clause_and"
    ) {
      continue;
    }

    let terminator: "and" | "clause_and" | "or" | null = null;
    for (let ahead = index + 1; ahead < tokens.length; ahead += 1) {
      const candidate = tokens[ahead].kind;
      if (candidate === "condition" || candidate === "comma") continue;
      if (
        candidate === "and" ||
        candidate === "or" ||
        candidate === "clause_and"
      ) {
        terminator = candidate;
      }
      break;
    }
    if (!terminator) return null;
    resolved.push({ kind: terminator });
  }

  return resolved;
}

/**
 * Official wording like "COMP1110 or COMP1140 AND 6 units of MATH" is
 * ambiguous without parentheses, so a clause mixing bare and/or at one
 * depth refuses to parse instead of guessing an operator precedence.
 */
function hasUnambiguousConjunctions(tokens: RequisiteToken[]) {
  const frames: Array<Set<"and" | "or">> = [new Set()];
  for (const token of tokens) {
    if (token.kind === "left_parenthesis") {
      frames.push(new Set());
    } else if (token.kind === "right_parenthesis") {
      if (frames.length === 1) return false;
      frames.pop();
    } else if (token.kind === "clause_and") {
      frames[frames.length - 1] = new Set();
    } else if (token.kind === "and" || token.kind === "or") {
      const frame = frames[frames.length - 1];
      frame.add(token.kind);
      if (frame.size > 1) return false;
    }
  }
  return true;
}

function group(
  operator: "all_of" | "any_of",
  left: RequisiteExpression,
  right: RequisiteExpression,
): RequisiteExpression {
  const conditions = [left, right];
  if (left.kind === "group" && left.operator === operator) {
    conditions.splice(0, 1, ...left.conditions);
  }
  if (right.kind === "group" && right.operator === operator) {
    conditions.splice(conditions.length - 1, 1, ...right.conditions);
  }
  return { kind: "group", operator, conditions };
}

/**
 * Parses only complete, unambiguous combinations of course codes and unit
 * conditions. Anything broader stays as official wording rather than
 * becoming an inferred eligibility rule. Inline AND binds tighter than OR;
 * clause separators such as ", as well as" bind loosest, matching how the
 * official wording groups whole requirements.
 */
export function parseRequisiteSummary(
  sourceText: string,
): RequisiteExpression | null {
  const normalised = normaliseSourceText(sourceText);
  const expression = stripPreamble(normalised).replace(/[.]$/u, "");
  const rawTokens = tokenise(expression);
  if (!rawTokens) return null;
  const tokens = resolveCommas(rawTokens);
  if (!tokens || tokens.length === 0) return null;
  if (!hasUnambiguousConjunctions(tokens)) return null;

  let position = 0;
  const current = () => tokens[position];
  const take = () => tokens[position++];

  const parsePrimary = (): RequisiteExpression | null => {
    const token = take();
    if (!token) return null;
    if (token.kind === "condition") return token.condition;
    if (token.kind !== "left_parenthesis") return null;
    const nested = parseClause();
    if (current()?.kind !== "right_parenthesis") return null;
    take();
    return nested;
  };

  const parseAnd = (): RequisiteExpression | null => {
    let left = parsePrimary();
    while (left && current()?.kind === "and") {
      take();
      const right = parsePrimary();
      if (!right) return null;
      left = group("all_of", left, right);
    }
    return left;
  };

  const parseOr = (): RequisiteExpression | null => {
    let left = parseAnd();
    while (left && current()?.kind === "or") {
      take();
      const right = parseAnd();
      if (!right) return null;
      left = group("any_of", left, right);
    }
    return left;
  };

  const parseClause = (): RequisiteExpression | null => {
    let left = parseOr();
    while (left && current()?.kind === "clause_and") {
      take();
      const right = parseOr();
      if (!right) return null;
      left = group("all_of", left, right);
    }
    return left;
  };

  const parsed = parseClause();
  return parsed && position === tokens.length ? parsed : null;
}

function courseLevel(code: string) {
  const digit = COURSE_LEVEL_PATTERN.exec(code.toUpperCase())?.[1];
  return digit === undefined ? null : Number(digit) * 1000;
}

/**
 * Evaluates only completed course attempts. Planned and enrolled courses are
 * deliberately excluded because the ANU wording requires completed study.
 */
export function evaluateRequisiteExpression(
  expression: RequisiteExpression,
  completedCourses: readonly CompletedRequisiteCourse[],
): RequisiteProgress {
  if (expression.kind === "course") {
    return {
      kind: "course",
      code: expression.code,
      satisfied: completedCourses.some(
        (course) => course.code.toUpperCase() === expression.code,
      ),
    };
  }

  if (expression.kind === "subject_units") {
    const completedUnits = completedCourses.reduce((total, course) => {
      const subject = course.code.slice(0, 4).toUpperCase();
      return subject === expression.subject && Number.isFinite(course.units)
        ? total + course.units
        : total;
    }, 0);
    return {
      kind: "subject_units",
      subject: expression.subject,
      requiredUnits: expression.units,
      completedUnits,
      satisfied: completedUnits >= expression.units,
    };
  }

  if (expression.kind === "level_units") {
    const completedUnits = completedCourses.reduce((total, course) => {
      const subject = course.code.slice(0, 4).toUpperCase();
      const level = courseLevel(course.code);
      const subjectMatches =
        expression.subject === undefined || subject === expression.subject;
      return subjectMatches &&
        level === expression.level &&
        Number.isFinite(course.units)
        ? total + course.units
        : total;
    }, 0);
    return {
      kind: "level_units",
      level: expression.level,
      ...(expression.subject !== undefined
        ? { subject: expression.subject }
        : {}),
      requiredUnits: expression.units,
      completedUnits,
      satisfied: completedUnits >= expression.units,
    };
  }

  if (expression.kind === "units_total") {
    const completedUnits = completedCourses.reduce(
      (total, course) =>
        Number.isFinite(course.units) ? total + course.units : total,
      0,
    );
    return {
      kind: "units_total",
      requiredUnits: expression.units,
      completedUnits,
      satisfied: completedUnits >= expression.units,
    };
  }

  const conditions = expression.conditions.map((condition) =>
    evaluateRequisiteExpression(condition, completedCourses),
  );
  return {
    kind: "group",
    operator: expression.operator,
    conditions,
    satisfied:
      expression.operator === "all_of"
        ? conditions.every((condition) => condition.satisfied)
        : conditions.some((condition) => condition.satisfied),
  };
}
