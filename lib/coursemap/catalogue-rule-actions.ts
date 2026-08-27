"use server";

import { revalidatePath } from "next/cache";
import { canManageCatalogueImports, getAuthViewer } from "@/lib/auth/viewer";
import type { CoursemapActionResult } from "@/lib/coursemap/actions";
import {
  automaticExpressionFromSource,
  conditionSourceText,
  isEmptyReviewedTree,
  preservedRuleField,
  validateReviewedTree,
  type ReviewedConditionNode,
  type ReviewedRuleTree,
  type ReviewedTreeInput,
} from "@/lib/coursemap/requisite-conditions";
import type { RequisiteExpression } from "@/lib/coursemap/requisite-summary";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type SaveCourseRuleConditionsInput = {
  catalogueYear: number;
  code: string;
  ruleId: number;
  tree: ReviewedTreeInput;
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Coursemap could not save these conditions.";
}

async function canWriteCatalogue() {
  if (!(await canManageCatalogueImports())) {
    return {
      ok: false,
      message: "Catalogue import permission is required.",
    } satisfies CoursemapActionResult;
  }
  return null;
}

async function resolvePreservedRule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    catalogueYearId,
    code,
    ruleKind,
  }: { catalogueYearId: number; code: string; ruleKind: string },
) {
  const viewer = await getAuthViewer();
  const { error } = await supabase
    .from("catalogue_review_items")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: viewer?.id ?? null,
      status: "accepted",
    })
    .eq("catalogue_year_id", catalogueYearId)
    .eq("target_kind", "course_version")
    .eq("target_key", code)
    .eq("issue_code", "STRUCTURED_RULE_PRESERVED")
    .eq("field", preservedRuleField(ruleKind))
    .eq("status", "open");
  if (error) throw error;
}

async function requireDraftRule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { catalogueYear: number; code: string; ruleId: number },
) {
  const { data: year, error: yearError } = await supabase
    .from("catalogue_years")
    .select("id")
    .eq("year", input.catalogueYear)
    .maybeSingle();
  if (yearError) throw yearError;
  if (!year) {
    return { ok: false as const, error: "The catalogue year was not found." };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,code")
    .eq("code", input.code)
    .maybeSingle();
  if (courseError) throw courseError;
  if (!course) {
    return { ok: false as const, error: "The course record was not found." };
  }

  const { data: version, error: versionError } = await supabase
    .from("course_versions")
    .select("id,publication_status")
    .eq("catalogue_year_id", year.id)
    .eq("course_id", course.id)
    .maybeSingle();
  if (versionError) throw versionError;
  if (!version) {
    return { ok: false as const, error: "The course version was not found." };
  }
  if (version.publication_status !== "draft") {
    return {
      ok: false as const,
      error: "Only a draft course version can be changed here.",
    };
  }

  const { data: rule, error: ruleError } = await supabase
    .from("course_rules")
    .select("id,review_state,rule_kind,source_text")
    .eq("id", input.ruleId)
    .eq("course_version_id", version.id)
    .maybeSingle();
  if (ruleError) throw ruleError;
  if (!rule)
    return { ok: false as const, error: "The requisite rule was not found." };

  return {
    ok: true as const,
    catalogueYearId: year.id,
    code: course.code,
    rule,
  };
}

async function ensureCourseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("courses")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("courses")
    .insert({ code })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

async function findStructureId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
) {
  const { data, error } = await supabase
    .from("academic_structures")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function clearRuleTree(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ruleId: number,
) {
  const { error } = await supabase
    .from("course_rule_groups")
    .delete()
    .eq("course_rule_id", ruleId);
  if (error) throw error;
}

async function insertReviewedTree(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ruleId: number,
  tree: ReviewedRuleTree,
  parentGroupId: number | null,
  position: number,
) {
  const { data: group, error: groupError } = await supabase
    .from("course_rule_groups")
    .insert({
      course_rule_id: ruleId,
      minimum_count: tree.minimumCount,
      operator: tree.operator,
      parent_group_id: parentGroupId,
      position,
    })
    .select("id")
    .single();
  if (groupError) throw groupError;

  for (const [childPosition, child] of tree.children.entries()) {
    if (child.type === "group") {
      await insertReviewedTree(
        supabase,
        ruleId,
        child,
        group.id,
        childPosition,
      );
      continue;
    }
    await insertReviewedCondition(
      supabase,
      ruleId,
      group.id,
      child,
      childPosition,
    );
  }
}

async function insertReviewedCondition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ruleId: number,
  groupId: number,
  condition: ReviewedConditionNode,
  position: number,
) {
  const sourceText = conditionSourceText(condition);
  if (
    (condition.kind === "course" || condition.kind === "incompatible") &&
    condition.courseCode
  ) {
    const courseId = await ensureCourseId(supabase, condition.courseCode);
    const { error } = await supabase.from("course_rule_conditions").insert({
      condition_kind: condition.kind,
      confidence: 1,
      course_rule_id: ruleId,
      group_id: groupId,
      minimum_mark:
        condition.kind === "course" ? (condition.mark ?? null) : null,
      position,
      required_course_id: courseId,
      review_state: "review",
      source_text: sourceText,
    });
    if (error) throw error;
    return;
  }
  if (condition.kind === "admission") {
    const structureId = condition.structureCode
      ? await findStructureId(supabase, condition.structureCode)
      : null;
    if (condition.structureCode && !structureId) {
      throw new TypeError(
        `${condition.structureCode} is not in the catalogue yet. Import that programme first.`,
      );
    }
    const { error } = await supabase.from("course_rule_conditions").insert({
      condition_kind: "admission",
      confidence: 1,
      course_rule_id: ruleId,
      free_text: structureId ? null : (condition.freeText ?? null),
      group_id: groupId,
      position,
      required_structure_id: structureId,
      review_state: "review",
      source_text: sourceText,
    });
    if (error) throw error;
    return;
  }
  if (condition.kind === "gpa") {
    const { error } = await supabase.from("course_rule_conditions").insert({
      condition_kind: "gpa",
      confidence: 1,
      course_rule_id: ruleId,
      group_id: groupId,
      minimum_gpa: condition.gpa,
      position,
      review_state: "review",
      source_text: sourceText,
    });
    if (error) throw error;
    return;
  }
  if (condition.kind === "permission" || condition.kind === "other") {
    const { error } = await supabase.from("course_rule_conditions").insert({
      condition_kind: condition.kind,
      confidence: 1,
      course_rule_id: ruleId,
      free_text: condition.freeText,
      group_id: groupId,
      position,
      review_state: "review",
      source_text: sourceText,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("course_rule_conditions").insert({
    condition_kind: condition.kind,
    confidence: 1,
    course_rule_id: ruleId,
    group_id: groupId,
    maximum_course_level:
      condition.kind === "level_units" && condition.level != null
        ? condition.level + 999
        : null,
    minimum_course_level:
      condition.kind === "level_units" ? (condition.level ?? null) : null,
    minimum_units: condition.units,
    position,
    review_state: "review",
    source_text: sourceText,
    subject_code:
      condition.kind === "subject_units" || condition.kind === "level_units"
        ? (condition.subjectCode ?? null)
        : null,
  });
  if (error) throw error;
}

async function insertAutomaticExpression(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ruleId: number,
  parentGroupId: number | null,
  expression: RequisiteExpression,
  position: number,
) {
  if (expression.kind === "group") {
    const { data: group, error } = await supabase
      .from("course_rule_groups")
      .insert({
        course_rule_id: ruleId,
        minimum_count: null,
        operator: expression.operator,
        parent_group_id: parentGroupId,
        position,
      })
      .select("id")
      .single();
    if (error) throw error;
    for (const [childPosition, child] of expression.conditions.entries()) {
      await insertAutomaticExpression(
        supabase,
        ruleId,
        group.id,
        child,
        childPosition,
      );
    }
    return;
  }

  if (parentGroupId == null) {
    throw new TypeError("A condition must belong to a group.");
  }

  if (expression.kind === "course") {
    const courseId = await ensureCourseId(supabase, expression.code);
    const { error } = await supabase.from("course_rule_conditions").insert({
      condition_kind: "course",
      confidence: 1,
      course_rule_id: ruleId,
      group_id: parentGroupId,
      position,
      required_course_id: courseId,
      review_state: "automatic",
      source_text: expression.code,
    });
    if (error) throw error;
    return;
  }

  if (expression.kind === "programme_enrolment") {
    const structureId = await findStructureId(supabase, expression.code);
    const { error } = await supabase.from("course_rule_conditions").insert({
      condition_kind: "admission",
      confidence: 1,
      course_rule_id: ruleId,
      free_text: structureId ? null : `${expression.name} (${expression.code})`,
      group_id: parentGroupId,
      position,
      required_structure_id: structureId,
      review_state: "automatic",
      source_text: `${expression.name} (${expression.code})`,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("course_rule_conditions").insert({
    condition_kind: expression.kind,
    confidence: 1,
    course_rule_id: ruleId,
    group_id: parentGroupId,
    maximum_course_level:
      expression.kind === "level_units" ? expression.level + 999 : null,
    minimum_course_level:
      expression.kind === "level_units" ? expression.level : null,
    minimum_units: expression.units,
    position,
    review_state: "automatic",
    source_text:
      expression.kind === "subject_units"
        ? `${expression.units} units of ${expression.subject}`
        : expression.kind === "level_units"
          ? `${expression.units} units at ${expression.level}-level`
          : `${expression.units} units of tertiary study`,
    subject_code:
      expression.kind === "subject_units"
        ? expression.subject
        : expression.kind === "level_units"
          ? (expression.subject ?? null)
          : null,
  });
  if (error) throw error;
}

/**
 * Replaces the structured tree for one draft course rule. An empty tree
 * restores the automatic mapping from the ANU wording. A saved tree is
 * human-owned, so a later sync with the same quote will not overwrite it.
 */
export async function saveCourseRuleConditions(
  input: SaveCourseRuleConditionsInput,
): Promise<CoursemapActionResult> {
  const denied = await canWriteCatalogue();
  if (denied) return denied;

  const code = input.code.trim().toUpperCase();
  const validated = validateReviewedTree(input.tree);
  if ("message" in validated) {
    return { ok: false, message: validated.message };
  }
  const empty = isEmptyReviewedTree(validated.tree);
  const savedMessage = empty
    ? "Reviewed conditions were cleared. Students will use the automatic mapping."
    : "Reviewed conditions were saved.";

  if (isDemoMode()) {
    return { ok: true, message: savedMessage };
  }

  try {
    const supabase = await createClient();
    const loaded = await requireDraftRule(supabase, {
      catalogueYear: input.catalogueYear,
      code,
      ruleId: input.ruleId,
    });
    if (!loaded.ok) return { ok: false, message: loaded.error };

    if (empty) {
      const expression = automaticExpressionFromSource(loaded.rule.source_text);
      await clearRuleTree(supabase, loaded.rule.id);
      if (expression) {
        await insertAutomaticExpression(
          supabase,
          loaded.rule.id,
          null,
          expression.kind === "group"
            ? expression
            : { kind: "group", operator: "all_of", conditions: [expression] },
          0,
        );
        const { error: updateError } = await supabase
          .from("course_rules")
          .update({ confidence: 1, review_state: "automatic" })
          .eq("id", loaded.rule.id);
        if (updateError) throw updateError;
      } else {
        await insertReviewedTree(
          supabase,
          loaded.rule.id,
          {
            type: "group",
            id: "root",
            operator: "all_of",
            minimumCount: null,
            children: [
              {
                type: "condition",
                id: "raw",
                kind: "other",
                freeText: loaded.rule.source_text,
              },
            ],
          },
          null,
          0,
        );
        const { error: rawError } = await supabase
          .from("course_rule_conditions")
          .update({ confidence: 0 })
          .eq("course_rule_id", loaded.rule.id);
        if (rawError) throw rawError;
        const { error: updateError } = await supabase
          .from("course_rules")
          .update({ confidence: 0, review_state: "review" })
          .eq("id", loaded.rule.id);
        if (updateError) throw updateError;
      }
    } else {
      await clearRuleTree(supabase, loaded.rule.id);
      await insertReviewedTree(
        supabase,
        loaded.rule.id,
        validated.tree,
        null,
        0,
      );
      const { error: updateError } = await supabase
        .from("course_rules")
        .update({
          confidence: 1,
          review_state:
            loaded.rule.review_state === "verified" ? "verified" : "review",
        })
        .eq("id", loaded.rule.id);
      if (updateError) throw updateError;
    }

    await resolvePreservedRule(supabase, {
      catalogueYearId: loaded.catalogueYearId,
      code: loaded.code,
      ruleKind: loaded.rule.rule_kind,
    });

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${loaded.code}`);
    return { ok: true, message: savedMessage };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function confirmCourseRuleSource(input: {
  catalogueYear: number;
  code: string;
  ruleId: number;
}): Promise<CoursemapActionResult> {
  const denied = await canWriteCatalogue();
  if (denied) return denied;

  const code = input.code.trim().toUpperCase();
  if (isDemoMode()) {
    return { ok: true, message: "The saved conditions still match." };
  }

  try {
    const supabase = await createClient();
    const loaded = await requireDraftRule(supabase, {
      catalogueYear: input.catalogueYear,
      code,
      ruleId: input.ruleId,
    });
    if (!loaded.ok) return { ok: false, message: loaded.error };

    await resolvePreservedRule(supabase, {
      catalogueYearId: loaded.catalogueYearId,
      code: loaded.code,
      ruleKind: loaded.rule.rule_kind,
    });
    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${loaded.code}`);
    return { ok: true, message: "The saved conditions still match." };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
