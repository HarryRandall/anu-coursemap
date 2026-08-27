"use client";

import { createElement, type DragEvent, type ReactNode } from "react";
import {
  Ban,
  BookOpen,
  ChartNoAxesColumn,
  FileText,
  Gauge,
  GraduationCap,
  KeyRound,
  Layers,
  Split,
  SquareStack,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  conditionSummary,
  isConditionComplete,
  type ReviewedConditionKind,
  type ReviewedConditionNode,
  type ReviewedGroupNode,
  type ReviewedOperator,
} from "@/lib/coursemap/requisite-conditions";
import { ConditionInlineEditor } from "@/components/admin/requisite-condition-fields";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CONDITION_ICONS: Record<ReviewedConditionKind, LucideIcon> = {
  course: BookOpen,
  incompatible: Ban,
  admission: GraduationCap,
  units_total: Layers,
  subject_units: SquareStack,
  level_units: ChartNoAxesColumn,
  gpa: Gauge,
  permission: KeyRound,
  other: FileText,
};

const CONDITION_TILES: Record<ReviewedConditionKind, string> = {
  course: "bg-brand-100 text-brand-700",
  incompatible: "bg-rose-100 text-rose-700",
  admission: "bg-sky-100 text-sky-700",
  units_total: "bg-emerald-100 text-emerald-700",
  subject_units: "bg-emerald-100 text-emerald-700",
  level_units: "bg-emerald-100 text-emerald-700",
  gpa: "bg-amber-100 text-amber-700",
  permission: "bg-rose-100 text-rose-700",
  other: "bg-zinc-100 text-zinc-600",
};

/** Everything a single condition can do, wherever it is being shown. */
export type ConditionActions = {
  canNest: boolean;
  onAddCondition: (kind: ReviewedConditionKind) => void;
  onAddGroup: () => void;
  onChange: (next: ReviewedConditionNode) => void;
  onKindChange: (kind: ReviewedConditionKind) => void;
  onRemove: () => void;
};

export type ConditionDrag = {
  dragging: boolean;
  onDragEnd: () => void;
  onDragLeave: () => void;
  onDragOver: (event: DragEvent) => void;
  onDragStart: () => void;
  onDrop: (event: DragEvent) => void;
  over: boolean;
};

export function RemoveButton({
  className,
  label,
  onClick,
}: {
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-rose-600 transition-colors outline-none hover:bg-rose-50 hover:!text-rose-700 focus-visible:ring-3 focus-visible:ring-brand-500/20",
        className,
      )}
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      <Trash2 aria-hidden="true" size={16} />
    </button>
  );
}

export const GroupIcon = Split;

export function operatorChipClass(operator: ReviewedOperator) {
  if (operator === "any_of") {
    return "border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300 hover:bg-sky-100";
  }
  if (operator === "at_least") {
    return "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100";
  }
  return "border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-300 hover:bg-brand-100";
}

export function operatorTileClass(operator: ReviewedOperator) {
  if (operator === "any_of") return "bg-sky-100 text-sky-800";
  if (operator === "at_least") return "bg-amber-100 text-amber-800";
  return "bg-brand-100 text-brand-800";
}

export function ConditionIcon({
  className,
  kind,
  size = 14,
}: {
  className?: string;
  kind: ReviewedConditionKind;
  size?: number;
}) {
  return createElement(CONDITION_ICONS[kind] ?? FileText, {
    "aria-hidden": "true",
    className,
    size,
  });
}

export function conditionTile(kind: ReviewedConditionKind) {
  return CONDITION_TILES[kind] ?? CONDITION_TILES.other;
}

/**
 * A condition as three dropdowns on one line: type, how it matches, and value.
 */
export function ConditionChip({
  actions,
  canEdit,
  condition,
  drag,
}: {
  actions: ConditionActions;
  canEdit: boolean;
  condition: ReviewedConditionNode;
  drag?: ConditionDrag;
}) {
  const summary = conditionSummary(condition);
  const complete = isConditionComplete(condition);
  const shell = cn(
    "inline-flex min-h-10 w-fit max-w-full items-start rounded-md border bg-white transition-colors",
    complete ? "border-zinc-200" : "border-amber-300",
    drag?.dragging && "opacity-40",
  );

  if (!canEdit) {
    return (
      <span className={cn(shell, "max-w-md gap-2 px-3 py-1.5 text-sm")}>
        <ConditionIcon
          className="shrink-0 opacity-70"
          kind={condition.kind}
          size={16}
        />
        <span className="leading-snug whitespace-normal">{summary}</span>
      </span>
    );
  }

  return (
    <span className="relative inline-flex w-fit max-w-full items-center">
      {drag?.over ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -left-1.5 w-0.5 rounded-full bg-brand-500"
        />
      ) : null}
      <span
        className={cn(shell, "items-start gap-1 p-1 hover:border-zinc-300")}
        onDragLeave={drag?.onDragLeave}
        onDragOver={drag?.onDragOver}
        onDrop={drag?.onDrop}
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 cursor-grab place-items-center rounded-md text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
          draggable={Boolean(drag)}
          onDragEnd={drag?.onDragEnd}
          onDragStart={drag?.onDragStart}
          title="Drag to move this condition"
        >
          <ConditionIcon kind={condition.kind} size={16} />
        </span>
        <ConditionInlineEditor
          condition={condition}
          onChange={actions.onChange}
          onKindChange={actions.onKindChange}
        />
        <RemoveButton
          label={`Remove condition: ${summary}`}
          onClick={actions.onRemove}
        />
      </span>
    </span>
  );
}

/**
 * Choosing "at least N" needs the number as well as the operator, so the
 * counts are offered as menu items instead of a separate spin control.
 */
export function GroupOperatorMenu({
  children,
  group,
  onOperator,
  onRemove,
}: {
  children: ReactNode;
  group: ReviewedGroupNode;
  onOperator: (operator: ReviewedOperator, minimumCount?: number) => void;
  onRemove?: () => void;
}) {
  const current = group.minimumCount ?? 1;
  const counts = Array.from(
    { length: group.children.length },
    (_, index) => index + 1,
  );
  if (group.operator === "at_least" && !counts.includes(current)) {
    counts.push(current);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56 p-1.5">
        <DropdownMenuLabel>Join with</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={(next) => {
            if (next.startsWith("at_least:")) {
              onOperator("at_least", Number(next.slice("at_least:".length)));
              return;
            }
            onOperator(next as ReviewedOperator);
          }}
          value={
            group.operator === "at_least"
              ? `at_least:${current}`
              : group.operator
          }
        >
          <DropdownMenuRadioItem value="all_of">And</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="any_of">Or</DropdownMenuRadioItem>
          {counts.length > 1
            ? counts.map((count) => (
                <DropdownMenuRadioItem key={count} value={`at_least:${count}`}>
                  At least {count}
                </DropdownMenuRadioItem>
              ))
            : null}
        </DropdownMenuRadioGroup>
        {onRemove ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-700 [&>svg]:text-rose-500"
              onSelect={onRemove}
            >
              <Trash2 aria-hidden="true" />
              Remove group
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * After the first condition, Add asks how the next item should join.
 */
export function AddJoinMenu({
  align = "start",
  canNest,
  children,
  onAnd,
  onNewSection,
  onOr,
}: {
  align?: "start" | "center" | "end";
  canNest: boolean;
  children: ReactNode;
  onAnd: () => void;
  onNewSection: () => void;
  onOr: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-52 p-1.5">
        <DropdownMenuItem onSelect={onAnd}>And</DropdownMenuItem>
        <DropdownMenuItem onSelect={onOr}>Or</DropdownMenuItem>
        <DropdownMenuItem disabled={!canNest} onSelect={onNewSection}>
          New section
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
