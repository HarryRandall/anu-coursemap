export type RequisiteCondition =
  | {
      kind: "course";
      code: string;
    }
  | {
      kind: "subject_units";
      subject: string;
      units: number;
    };

export type RequisiteExpression =
  | RequisiteCondition
  | {
      kind: "group";
      operator: "all_of" | "any_of";
      conditions: RequisiteExpression[];
    };

type RequisiteToken =
  | { kind: "and" | "left_parenthesis" | "or" | "right_parenthesis" }
  | { kind: "condition"; condition: RequisiteCondition };

function normaliseSourceText(value: string) {
  return value.replace(/\s+/gu, " ").trim();
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

    const conjunction = /^(AND|OR)\b/iu.exec(remainder)?.[1];
    if (conjunction) {
      tokens.push({ kind: conjunction.toLowerCase() as "and" | "or" });
      remainder = remainder.slice(conjunction.length);
      continue;
    }

    const subjectUnits =
      /^(\d+(?:\.\d+)?)\s+units?\s+of\s+([A-Z]{4})(?:\s+coded)?(?:\s+courses?)?\b/iu.exec(
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
 * Parses only complete, unambiguous combinations of course codes and subject
 * unit conditions. Anything broader stays as official wording rather than
 * becoming an inferred eligibility rule.
 */
export function parseRequisiteSummary(
  sourceText: string,
): RequisiteExpression | null {
  const normalised = normaliseSourceText(sourceText);
  const expression = normalised
    .replace(
      /^to enrol in this course you must have completed the following:\s*/iu,
      "",
    )
    .replace(/[.]$/u, "");
  const tokens = tokenise(expression);
  if (!tokens) return null;

  let position = 0;
  const current = () => tokens[position];
  const take = () => tokens[position++];

  const parsePrimary = (): RequisiteExpression | null => {
    const token = take();
    if (!token) return null;
    if (token.kind === "condition") return token.condition;
    if (token.kind !== "left_parenthesis") return null;
    const nested = parseOr();
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

  const parsed = parseOr();
  return parsed && position === tokens.length ? parsed : null;
}
