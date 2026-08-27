"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  addChild,
  addJoinedCondition,
  addNestedSection,
  addSibling,
  childIndex,
  createConditionNode,
  createGroupNode,
  deleteFromTree,
  findParentId,
  groupDepth,
  groupSentence,
  MAX_REVIEWED_GROUP_DEPTH,
  moveInTree,
  operatorJoiner,
  setGroupOperator,
  updateTree,
  type ReviewedConditionKind,
  type ReviewedConditionNode,
  type ReviewedGroupNode,
  type ReviewedRuleTree,
} from "@/lib/coursemap/requisite-conditions";
import {
  AddJoinMenu,
  ConditionChip,
  GroupOperatorMenu,
  operatorChipClass,
  RemoveButton,
  type ConditionActions,
} from "@/components/admin/requisite-rule-controls";

type DragController = {
  activeId: string | null;
  cancel: () => void;
  dropOnChip: (chipId: string) => void;
  dropOnGroup: (groupId: string) => void;
  overId: string | null;
  setOver: (id: string | null) => void;
  start: (id: string) => void;
};

export function RequisiteRuleTree({
  canEdit,
  onChange,
  tree,
}: {
  canEdit: boolean;
  onChange: (tree: ReviewedRuleTree) => void;
  tree: ReviewedRuleTree;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function cancel() {
    setActiveId(null);
    setOverId(null);
  }

  const drag: DragController = {
    activeId,
    cancel,
    overId,
    setOver: setOverId,
    start: setActiveId,
    dropOnChip: (chipId) => {
      const moving = activeId;
      cancel();
      if (!moving || moving === chipId) return;
      const parentId = findParentId(tree, chipId);
      if (!parentId) return;
      let index = childIndex(tree, chipId) ?? 0;
      const fromIndex = childIndex(tree, moving);
      // Removing the node first shifts anything after it one place left.
      if (findParentId(tree, moving) === parentId && (fromIndex ?? 0) < index) {
        index -= 1;
      }
      onChange(moveInTree(tree, moving, parentId, index));
    },
    dropOnGroup: (groupId) => {
      const moving = activeId;
      cancel();
      if (!moving) return;
      onChange(moveInTree(tree, moving, groupId));
    },
  };

  return (
    <GroupBlock
      canEdit={canEdit}
      canRemove={false}
      drag={drag}
      group={tree}
      onChange={onChange}
      tree={tree}
    />
  );
}

function OperatorControl({
  canEdit,
  group,
  onChange,
  tree,
}: {
  canEdit: boolean;
  group: ReviewedGroupNode;
  onChange: (tree: ReviewedRuleTree) => void;
  tree: ReviewedRuleTree;
}) {
  const label = operatorJoiner(group);
  const chip = cn(
    "inline-flex min-h-7 min-w-[4.5rem] cursor-pointer items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-semibold tracking-wide uppercase transition-colors outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20",
    operatorChipClass(group.operator),
  );

  if (!canEdit) {
    return <span className={chip}>{label}</span>;
  }

  return (
    <GroupOperatorMenu
      group={group}
      onOperator={(operator, minimumCount) =>
        onChange(setGroupOperator(tree, group.id, operator, minimumCount))
      }
    >
      <button aria-label={`Join with ${label}`} className={chip} type="button">
        {label}
        <ChevronDown aria-hidden="true" className="size-3 opacity-70" />
      </button>
    </GroupOperatorMenu>
  );
}

function WhereLabel() {
  return (
    <span className="inline-flex min-h-7 min-w-[4.5rem] shrink-0 items-center text-sm text-zinc-500">
      Where
    </span>
  );
}

function GroupBlock({
  canEdit,
  canRemove,
  drag,
  group,
  onChange,
  tree,
}: {
  canEdit: boolean;
  canRemove: boolean;
  drag: DragController;
  group: ReviewedGroupNode;
  onChange: (tree: ReviewedRuleTree) => void;
  tree: ReviewedRuleTree;
}) {
  const depth = groupDepth(tree, group.id) ?? 1;
  const canNest = canEdit && depth < MAX_REVIEWED_GROUP_DEPTH;
  const dropping = drag.overId === group.id;
  const empty = group.children.length === 0;
  const isRoot = depth === 1;

  function conditionActions(childId: string): ConditionActions {
    return {
      canNest,
      onAddCondition: (kind: ReviewedConditionKind) =>
        onChange(addSibling(tree, childId, createConditionNode(kind))),
      onAddGroup: () =>
        onChange(addSibling(tree, childId, createGroupNode("all_of"))),
      onChange: (next: ReviewedConditionNode) =>
        onChange(updateTree(tree, childId, () => next)),
      onKindChange: (kind: ReviewedConditionKind) =>
        onChange(
          updateTree(tree, childId, () => ({
            type: "condition" as const,
            id: childId,
            kind,
          })),
        ),
      onRemove: () => onChange(deleteFromTree(tree, childId)),
    };
  }

  function addControl(compact: boolean) {
    if (!canEdit) return null;

    const trigger = compact ? (
      <button
        aria-label="Add to this group"
        className="grid size-8 cursor-pointer place-items-center rounded-md text-zinc-500 transition-colors outline-none hover:bg-white hover:text-zinc-900 focus-visible:ring-3 focus-visible:ring-brand-500/20"
        type="button"
      >
        <Plus aria-hidden="true" size={14} />
      </button>
    ) : (
      <button
        className="inline-flex min-h-9 w-fit shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-sm text-zinc-500 transition-colors outline-none hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-3 focus-visible:ring-brand-500/20"
        type="button"
      >
        <Plus aria-hidden="true" size={14} />
        Add
      </button>
    );

    return (
      <AddJoinMenu
        canNest={canNest}
        onAnd={() => onChange(addJoinedCondition(tree, group.id, "all_of"))}
        onNewSection={() => onChange(addNestedSection(tree, group.id))}
        onOr={() => onChange(addJoinedCondition(tree, group.id, "any_of"))}
      >
        {trigger}
      </AddJoinMenu>
    );
  }

  const emptyPrompt = (
    <EmptyGroupPrompt
      canEdit={canEdit}
      onAdd={() =>
        onChange(addChild(tree, group.id, createConditionNode("course")))
      }
    />
  );

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        isRoot && "min-h-[30rem] p-3",
        isRoot && empty && "flex items-center justify-center",
        !isRoot && "w-fit max-w-full bg-zinc-50 p-3",
        isRoot ? "border-zinc-200 bg-white" : "border-zinc-200",
        dropping && "border-brand-300 bg-brand-50/40",
      )}
      onDragLeave={(event) => {
        event.stopPropagation();
        if (drag.overId === group.id) drag.setOver(null);
      }}
      onDragOver={(event: DragEvent) => {
        if (!drag.activeId) return;
        event.preventDefault();
        event.stopPropagation();
        drag.setOver(group.id);
      }}
      onDrop={(event: DragEvent) => {
        if (!drag.activeId) return;
        event.preventDefault();
        event.stopPropagation();
        drag.dropOnGroup(group.id);
      }}
    >
      {isRoot ? null : (
        <NestedGroupHeader
          addControl={addControl(true)}
          canEdit={canEdit}
          canRemove={canRemove}
          group={group}
          onChange={onChange}
          tree={tree}
        />
      )}
      {empty ? (
        isRoot || !canEdit ? (
          emptyPrompt
        ) : null
      ) : (
        <div className="flex flex-col items-start gap-1.5">
          {group.children.map((child, index) => {
            const isLast = index === group.children.length - 1;
            const prefix =
              index === 0 ? (
                child.type === "condition" ? (
                  <WhereLabel />
                ) : null
              ) : (
                <span className={cn(child.type === "group" && "pt-1")}>
                  <OperatorControl
                    canEdit={canEdit}
                    group={group}
                    onChange={onChange}
                    tree={tree}
                  />
                </span>
              );

            return (
              <div
                className={cn(
                  "flex w-fit max-w-full gap-2",
                  child.type === "group" ? "items-start" : "items-center",
                )}
                key={child.id}
              >
                {prefix}
                {child.type === "group" ? (
                  <GroupBlock
                    canEdit={canEdit}
                    canRemove
                    drag={drag}
                    group={child}
                    onChange={onChange}
                    tree={tree}
                  />
                ) : (
                  <ConditionChip
                    actions={conditionActions(child.id)}
                    canEdit={canEdit}
                    condition={child}
                    drag={
                      canEdit
                        ? {
                            dragging: drag.activeId === child.id,
                            onDragEnd: drag.cancel,
                            onDragLeave: () => {
                              if (drag.overId === child.id) drag.setOver(null);
                            },
                            onDragOver: (event) => {
                              if (!drag.activeId) return;
                              event.preventDefault();
                              event.stopPropagation();
                              drag.setOver(child.id);
                            },
                            onDragStart: () => drag.start(child.id),
                            onDrop: (event) => {
                              if (!drag.activeId) return;
                              event.preventDefault();
                              event.stopPropagation();
                              drag.dropOnChip(child.id);
                            },
                            over:
                              drag.overId === child.id &&
                              drag.activeId !== child.id,
                          }
                        : undefined
                    }
                  />
                )}
                {isRoot && isLast ? addControl(false) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NestedGroupHeader({
  addControl,
  canEdit,
  canRemove,
  group,
  onChange,
  tree,
}: {
  addControl: ReactNode;
  canEdit: boolean;
  canRemove: boolean;
  group: ReviewedGroupNode;
  onChange: (tree: ReviewedRuleTree) => void;
  tree: ReviewedRuleTree;
}) {
  const sentence = groupSentence(group);
  const title = canEdit ? (
    <GroupOperatorMenu
      group={group}
      onOperator={(operator, minimumCount) =>
        onChange(setGroupOperator(tree, group.id, operator, minimumCount))
      }
    >
      <button
        aria-label={`Change this group: ${sentence}`}
        className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-md px-1.5 text-left text-sm text-zinc-600 transition-colors outline-none hover:bg-white hover:text-zinc-950 focus-visible:ring-3 focus-visible:ring-brand-500/20"
        type="button"
      >
        {sentence}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 opacity-70"
        />
      </button>
    </GroupOperatorMenu>
  ) : (
    <span className="text-sm text-zinc-600">{sentence}</span>
  );

  return (
    <div className="mb-2 flex items-center gap-1">
      {title}
      <span className="ml-auto flex items-center">
        {addControl}
        {canEdit && canRemove ? (
          <RemoveButton
            className="size-8"
            label="Remove group"
            onClick={() => onChange(deleteFromTree(tree, group.id))}
          />
        ) : null}
      </span>
    </div>
  );
}

function EmptyGroupPrompt({
  canEdit,
  onAdd,
}: {
  canEdit: boolean;
  onAdd: () => void;
}) {
  if (!canEdit) {
    return <span className="text-sm text-zinc-500">No conditions yet.</span>;
  }

  return (
    <button
      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-medium text-zinc-600 transition-colors outline-none hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-3 focus-visible:ring-brand-500/20"
      onClick={onAdd}
      type="button"
    >
      <Plus aria-hidden="true" size={14} />
      Add condition
    </button>
  );
}
