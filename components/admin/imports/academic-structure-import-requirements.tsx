import { Alert, AlertDescription } from "@reui/components/alert";
import { Badge } from "@reui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@reui/ui/card";
import { CircleAlert } from "lucide-react";
import type { AcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";
import { readableImportValue as readable } from "./academic-structure-import-summary";

export function AcademicStructureImportRequirementTree({
  detail,
}: {
  detail: AcademicStructureImportTargetDetail;
}) {
  const groups = detail.relationalData.academic_structure_requirement_groups;
  const conditions =
    detail.relationalData.academic_structure_requirement_conditions;
  const options = detail.relationalData.academic_structure_requirement_options;
  const childrenByParent = new Map<number | null, typeof groups>();
  for (const group of groups) {
    childrenByParent.set(group.parent_group_id, [
      ...(childrenByParent.get(group.parent_group_id) ?? []),
      group,
    ]);
  }
  const conditionsByGroup = new Map<number, typeof conditions>();
  for (const condition of conditions) {
    conditionsByGroup.set(condition.requirement_group_id, [
      ...(conditionsByGroup.get(condition.requirement_group_id) ?? []),
      condition,
    ]);
  }
  const optionsByCondition = new Map<number, typeof options>();
  for (const option of options) {
    optionsByCondition.set(option.requirement_condition_id, [
      ...(optionsByCondition.get(option.requirement_condition_id) ?? []),
      option,
    ]);
  }

  function conditionSummary(condition: (typeof conditions)[number]): string {
    if (condition.condition_kind === "unit_total") {
      return `${condition.minimum_units ?? 0}${
        condition.maximum_units !== null &&
        condition.maximum_units !== condition.minimum_units
          ? ` to ${condition.maximum_units}`
          : ""
      } units`;
    }
    if (condition.condition_kind === "level") {
      return `Course level ${condition.minimum_level ?? "any"}${
        condition.maximum_level !== null
          ? ` to ${condition.maximum_level}`
          : " or above"
      }`;
    }
    if (condition.condition_kind === "subject") {
      return `${condition.subject_code ?? "Any"} subject courses`;
    }
    if (condition.condition_kind === "tag") {
      return condition.tag ?? "Tagged courses";
    }
    if (condition.condition_kind === "free_text") {
      return condition.free_text ?? "Unmodelled condition";
    }
    if (condition.condition_kind === "unrestricted") {
      return "Unrestricted electives";
    }
    return readable(condition.condition_kind);
  }

  function conditionUnits(condition: (typeof conditions)[number]) {
    if (
      condition.condition_kind === "unit_total" ||
      (condition.minimum_units === null && condition.maximum_units === null)
    ) {
      return null;
    }
    if (condition.minimum_units === condition.maximum_units) {
      return `${condition.minimum_units} units`;
    }
    if (condition.minimum_units !== null && condition.maximum_units !== null) {
      return `${condition.minimum_units} to ${condition.maximum_units} units`;
    }
    if (condition.minimum_units !== null) {
      return `At least ${condition.minimum_units} units`;
    }
    return `Up to ${condition.maximum_units} units`;
  }

  function Group({
    group,
    visited,
  }: {
    group: (typeof groups)[number];
    visited: ReadonlySet<number>;
  }) {
    if (visited.has(group.id)) {
      return (
        <Alert variant={"destructive"}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            The saved requirement groups contain a cycle at {group.group_key}.
          </AlertDescription>
        </Alert>
      );
    }
    const nextVisited = new Set(visited).add(group.id);
    const childGroups = childrenByParent.get(group.id) ?? [];
    const groupConditions = conditionsByGroup.get(group.id) ?? [];
    const operator =
      group.operator === "all_of"
        ? "Complete all"
        : group.operator === "any_of"
          ? "Complete any one"
          : `Complete at least ${group.minimum_count ?? "the stated number"}`;

    return (
      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle>
            <h2>{group.title ?? "Requirement group"}</h2>
          </CardTitle>
          {group.description && (
            <CardDescription>{group.description}</CardDescription>
          )}
          <CardAction>
            <Badge variant="outline">{operator}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {groupConditions.map((condition) => {
            const conditionOptions = optionsByCondition.get(condition.id) ?? [];
            const units = conditionUnits(condition);
            return (
              <div
                className="rounded-lg border border-border bg-muted/30 p-3"
                key={condition.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={"primary-light"}>
                    {readable(condition.condition_kind)}
                  </Badge>
                  <p className="text-xs font-medium text-foreground">
                    {conditionSummary(condition)}
                  </p>
                  {condition.minimum_courses ? (
                    <Badge variant={"outline"}>
                      At least {condition.minimum_courses} courses
                    </Badge>
                  ) : null}
                  {units ? <Badge variant={"outline"}>{units}</Badge> : null}
                </div>
                {conditionOptions.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {conditionOptions.map((option) => (
                      <Badge key={option.id} variant={"outline"}>
                        <span className="font-mono">{option.option_code}</span>
                        {option.structure_kind
                          ? ` · ${readable(option.structure_kind)}`
                          : ""}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="min-h-8 cursor-pointer py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    Source wording
                  </summary>
                  <blockquote className="border-l-2 border-input pl-3 leading-5 whitespace-pre-wrap">
                    {condition.source_text}
                  </blockquote>
                  <p className="mt-1 font-mono text-[10px]">
                    {condition.source_locator}
                  </p>
                </details>
              </div>
            );
          })}
          {childGroups.map((child) => (
            <Group group={child} key={child.id} visited={nextVisited} />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Retain malformed imported trees in the preview so their evidence is visible.
  const groupIds = new Set(groups.map((group) => group.id));
  const roots = groups.filter(
    (group) =>
      group.parent_group_id === null || !groupIds.has(group.parent_group_id),
  );
  if (roots.length === 0 && groups.length > 0) roots.push(groups[0]);
  const unmodelled =
    detail.relationalData.academic_structure_unmodelled_requirements;
  if (roots.length === 0 && unmodelled.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {roots.map((root) => (
        <Group group={root} key={root.id} visited={new Set()} />
      ))}
      {unmodelled.length ? (
        <Alert variant={"warning"}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            <p className="font-medium">Additional requirement wording</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {unmodelled.map((item) => (
                <li key={item.id}>{item.source_text}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
