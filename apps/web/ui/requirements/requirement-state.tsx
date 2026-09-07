"use client";
import { Badge } from "@coursemap/ui/components/badge";
import { cn } from "@/lib/cn";
import {
  type RequirementNodeProgress,
  type RequirementNodeState,
} from "@/lib/coursemap/requirement-progress";
import { badgeVariantForTone } from "@/lib/ui";
import {
  stateLabel,
  stateMeta,
} from "@/ui/requirements/requirement-presentation";

export function StateIcon({
  state,
  className,
}: {
  state: RequirementNodeState;
  className?: string;
}) {
  const Icon = stateMeta[state].icon;
  const colour =
    state === "satisfied"
      ? "text-success"
      : state === "in_progress"
        ? "text-primary"
        : state === "over_limit"
          ? "text-destructive"
          : "text-muted-foreground/70";
  return (
    <Icon
      aria-hidden="true"
      className={cn("shrink-0", colour, className)}
      size={18}
      strokeWidth={2}
    />
  );
}

/**
 * Completed and planned units stacked against a target so the two kinds of
 * progress read at a glance. Falls back to a plain line when the rule has
 * nothing to measure against.
 */
export function StateBadge({
  progress,
}: {
  progress: RequirementNodeProgress | undefined;
}) {
  const state = progress?.state ?? "unmeasured";
  const meta = stateMeta[state];
  const Icon = meta.icon;
  return (
    <Badge variant={badgeVariantForTone[meta.tone]}>
      <Icon aria-hidden="true" />
      {stateLabel(progress)}
    </Badge>
  );
}
