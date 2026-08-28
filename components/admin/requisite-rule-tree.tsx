"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDown, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  addChild,
  addNestedSection,
  addSibling,
  childIndex,
  conditionSummary,
  createConditionNode,
  createGroupNode,
  deleteFromTree,
  findInTree,
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
  ConditionChip,
  ConditionIcon,
  GroupOperatorMenu,
  RemoveButton,
  type ConditionActions,
} from "@/components/admin/requisite-rule-controls";

type DropTarget = { groupId: string; id: string; index: number };
type DragPointer = {
  initialX: number;
  initialY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

type DragController = {
  activeCondition: ReviewedConditionNode | null;
  activeId: string | null;
  cancel: () => void;
  dragPointer: DragPointer | null;
  dropAt: (movingId: string, groupId: string, index: number) => void;
  overSlot: string | null;
  start: (id: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
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
  const [overSlot, setOverSlot] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<DragPointer | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const floatingCardRef = useRef<HTMLDivElement | null>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      pointerCleanupRef.current?.();
    },
    [],
  );

  function cancel() {
    pointerCleanupRef.current?.();
    pointerCleanupRef.current = null;
    dropTargetRef.current = null;
    setActiveId(null);
    setOverSlot(null);
    setDragPointer(null);
  }

  function dropAt(moving: string, groupId: string, requestedIndex: number) {
    let index = requestedIndex;
    const fromIndex = childIndex(tree, moving);
    if (
      findParentId(tree, moving) === groupId &&
      fromIndex != null &&
      fromIndex < index
    ) {
      index -= 1;
    }
    onChange(moveInTree(tree, moving, groupId, index));
  }

  function previewDrop(movingId: string, target: DropTarget | null) {
    const parentId = findParentId(tree, movingId);
    const index = childIndex(tree, movingId);
    const next =
      target &&
      !(
        target.groupId === parentId &&
        index != null &&
        (target.index === index || target.index === index + 1)
      )
        ? target
        : null;
    dropTargetRef.current = next;
    setOverSlot((current) =>
      current === next?.id ? current : (next?.id ?? null),
    );
  }

  function finishPointerDrag(movingId: string, cancelled = false) {
    const target = dropTargetRef.current;
    cancel();
    if (!cancelled && target) {
      dropAt(movingId, target.groupId, target.index);
    }
  }

  function startPointerDrag(
    movingId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (!event.isPrimary || event.button !== 0 || pointerCleanupRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();

    const card = event.currentTarget.closest<HTMLElement>(
      "[data-requisite-condition]",
    );
    if (!card) return;
    const rect = card.getBoundingClientRect();
    setActiveId(movingId);
    previewDrop(movingId, null);
    setDragPointer({
      height: rect.height,
      initialX: event.clientX,
      initialY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
    });

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      moveEvent.preventDefault();
      if (floatingCardRef.current) {
        floatingCardRef.current.style.transform = `translate3d(${moveEvent.clientX - (event.clientX - rect.left)}px, ${moveEvent.clientY - (event.clientY - rect.top)}px, 0)`;
      }
      if (moveEvent.clientY < 72) {
        window.scrollBy({ top: -12, behavior: "auto" });
      }
      if (moveEvent.clientY > window.innerHeight - 72) {
        window.scrollBy({ top: 12, behavior: "auto" });
      }
      previewDrop(
        movingId,
        dropTargetAtPoint(moveEvent.clientX, moveEvent.clientY),
      );
    };
    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === event.pointerId) {
        finishPointerDrag(movingId);
      }
    };
    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === event.pointerId) {
        finishPointerDrag(movingId, true);
      }
    };
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") finishPointerDrag(movingId, true);
    };

    pointerCleanupRef.current = cleanup;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("keydown", handleKeyDown);
  }

  const activeNode = activeId ? findInTree(tree, activeId) : null;
  const activeCondition = activeNode?.type === "condition" ? activeNode : null;

  const drag: DragController = {
    activeCondition,
    activeId,
    cancel,
    dragPointer,
    overSlot,
    start: startPointerDrag,
    dropAt,
  };

  return (
    <>
      <GroupBlock
        canEdit={canEdit}
        canRemove={false}
        drag={drag}
        group={tree}
        onChange={onChange}
        tree={tree}
      />
      {dragPointer && activeCondition ? (
        <div className="pointer-events-none fixed inset-0 z-[120] cursor-grabbing select-none">
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 rounded-md bg-white opacity-95 shadow-xl ring-1 ring-zinc-200 will-change-transform"
            inert
            ref={floatingCardRef}
            style={{
              transform: `translate3d(${dragPointer.initialX - dragPointer.offsetX}px, ${dragPointer.initialY - dragPointer.offsetY}px, 0)`,
              width: dragPointer.width,
            }}
          >
            <ConditionChip
              actions={DRAG_PREVIEW_ACTIONS}
              canEdit
              condition={activeCondition}
              drag={DRAG_PREVIEW_HANDLE}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

const DRAG_PREVIEW_ACTIONS: ConditionActions = {
  canNest: false,
  onAddCondition: () => undefined,
  onAddGroup: () => undefined,
  onChange: () => undefined,
  onKindChange: () => undefined,
  onRemove: () => undefined,
};

const DRAG_PREVIEW_HANDLE = {
  dragging: false,
  onKeyDown: () => undefined,
  onPointerDown: () => undefined,
};

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
    "inline-flex min-h-8 min-w-[3.75rem] cursor-pointer items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-semibold tracking-wide text-zinc-600 uppercase shadow-xs transition-colors outline-none hover:border-zinc-300 hover:text-zinc-950 focus-visible:ring-3 focus-visible:ring-brand-500/20 max-md:min-w-[3.5rem] max-md:px-1.5",
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
    <span className="relative z-10 inline-flex min-h-8 items-center text-xs font-medium text-zinc-500">
      Where
    </span>
  );
}

function dropTargetAtPoint(clientX: number, clientY: number) {
  const target = document.elementFromPoint(clientX, clientY);
  const preview = target?.closest<HTMLElement>("[data-requisite-drop-preview]");
  const child = target?.closest<HTMLElement>("[data-requisite-child]");
  const group = target?.closest<HTMLElement>("[data-requisite-group]");
  const groupIsCloser = Boolean(group && (!child || child.contains(group)));
  const groupId =
    preview?.dataset.groupId ??
    (groupIsCloser ? group?.dataset.groupId : child?.dataset.parentGroupId);
  if (!groupId) return null;

  let index: number;
  if (preview) {
    index = Number(preview.dataset.index);
  } else if (child && !groupIsCloser) {
    const childIndex = Number(child.dataset.childIndex);
    const rect = child.getBoundingClientRect();
    index = childIndex + Number(clientY > rect.top + rect.height / 2);
  } else if (group) {
    const children = Array.from(
      group.querySelectorAll<HTMLElement>("[data-requisite-child]"),
    ).filter((item) => item.dataset.parentGroupId === groupId);
    index = children.findIndex((item) => {
      const rect = item.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    if (index < 0) index = children.length;
  } else {
    return null;
  }
  if (!Number.isInteger(index)) return null;
  return { groupId, id: `${groupId}:${index}`, index };
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
        "transition-colors",
        !isRoot && "w-full max-w-full",
        isRoot
          ? "rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 max-md:p-2"
          : "rounded-xl border border-zinc-200 bg-white p-4 shadow-xs max-md:p-2",
      )}
      data-group-id={group.id}
      data-requisite-group=""
    >
      {isRoot ? null : (
        <NestedGroupHeader
          canEdit={canEdit}
          canRemove={canRemove}
          group={group}
          onChange={onChange}
          tree={tree}
        />
      )}
      <div className="flex w-full flex-col items-start">
        {empty ? (
          <div className="flex min-h-28 w-full items-center justify-center">
            {emptyPrompt}
          </div>
        ) : (
          <div className="relative w-full">
            {group.children.length > 1 ? (
              <span
                aria-hidden="true"
                className="absolute top-11 bottom-6 left-10 w-px bg-zinc-200 max-md:left-[1.375rem]"
              />
            ) : null}
            <DropPreview drag={drag} groupId={group.id} index={0} />
            {group.children.map((child, index) => (
              <div className="contents" key={child.id}>
                {index > 0 ? (
                  <RailJoiner
                    canEdit={canEdit}
                    group={group}
                    onChange={onChange}
                    tree={tree}
                  />
                ) : null}
                <div
                  className="grid w-full grid-cols-[5rem_minmax(0,1fr)] items-start gap-2 max-md:grid-cols-[2.75rem_minmax(0,1fr)] max-md:gap-1"
                  data-child-index={index}
                  data-parent-group-id={group.id}
                  data-requisite-child=""
                >
                  <span className="relative z-10 flex min-h-11 items-start justify-center pt-2">
                    {index === 0 && child.type === "condition" ? (
                      <WhereLabel />
                    ) : null}
                  </span>
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
                    <>
                      {drag.activeId === child.id && drag.dragPointer ? (
                        <span
                          aria-hidden="true"
                          className="w-full rounded-md border border-dashed border-zinc-200 bg-white/50"
                          style={{ height: drag.dragPointer.height }}
                        />
                      ) : (
                        <ConditionChip
                          actions={conditionActions(child.id)}
                          canEdit={canEdit}
                          condition={child}
                          drag={
                            canEdit
                              ? {
                                  dragging: false,
                                  onKeyDown: (event) => {
                                    if (
                                      !event.altKey ||
                                      (event.key !== "ArrowUp" &&
                                        event.key !== "ArrowDown")
                                    ) {
                                      return;
                                    }
                                    const parentId = findParentId(
                                      tree,
                                      child.id,
                                    );
                                    const index = childIndex(tree, child.id);
                                    if (!parentId || index == null) return;
                                    event.preventDefault();
                                    const requestedIndex =
                                      event.key === "ArrowUp"
                                        ? index - 1
                                        : index + 2;
                                    if (
                                      requestedIndex < 0 ||
                                      requestedIndex > group.children.length
                                    ) {
                                      return;
                                    }
                                    drag.dropAt(
                                      child.id,
                                      parentId,
                                      requestedIndex,
                                    );
                                  },
                                  onPointerDown: (event) =>
                                    drag.start(child.id, event),
                                }
                              : undefined
                          }
                        />
                      )}
                    </>
                  )}
                </div>
                <DropPreview drag={drag} groupId={group.id} index={index + 1} />
              </div>
            ))}
          </div>
        )}
        <GroupActions
          canEdit={canEdit}
          canNest={canNest}
          onAddCondition={() =>
            onChange(addChild(tree, group.id, createConditionNode("course")))
          }
          onAddGroup={() => onChange(addNestedSection(tree, group.id))}
        />
      </div>
    </div>
  );
}

function DropPreview({
  drag,
  groupId,
  index,
}: {
  drag: DragController;
  groupId: string;
  index: number;
}) {
  const id = `${groupId}:${index}`;
  if (drag.overSlot !== id || !drag.activeCondition || !drag.dragPointer) {
    return null;
  }
  const summary = conditionSummary(drag.activeCondition);

  return (
    <div
      aria-hidden="true"
      className="grid w-full grid-cols-[5rem_minmax(0,1fr)] gap-2 max-md:grid-cols-[2.75rem_minmax(0,1fr)] max-md:gap-1"
      data-group-id={groupId}
      data-index={index}
      data-requisite-drop-preview=""
      style={{ minHeight: drag.dragPointer.height }}
    >
      <span aria-hidden="true" />
      <span className="pointer-events-none my-1 flex origin-top animate-drop-slot-in items-center gap-2 rounded-md bg-brand-50/70 px-3 py-2 text-xs font-medium text-brand-700 ring-1 ring-brand-200 ring-inset motion-reduce:animate-none">
        <GripVertical
          aria-hidden="true"
          className="size-4 shrink-0 text-brand-300"
        />
        <ConditionIcon
          className="shrink-0 text-brand-500"
          kind={drag.activeCondition.kind}
          size={15}
        />
        <span className="line-clamp-2">{summary}</span>
      </span>
    </div>
  );
}

function RailJoiner({
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
  return (
    <div className="grid h-11 w-full grid-cols-[5rem_minmax(0,1fr)] items-center gap-2 max-md:grid-cols-[2.75rem_minmax(0,1fr)] max-md:gap-1">
      <span className="relative z-10 flex justify-center">
        <OperatorControl
          canEdit={canEdit}
          group={group}
          onChange={onChange}
          tree={tree}
        />
      </span>
      <span aria-hidden="true" />
    </div>
  );
}

function GroupActions({
  canEdit,
  canNest,
  onAddCondition,
  onAddGroup,
}: {
  canEdit: boolean;
  canNest: boolean;
  onAddCondition: () => void;
  onAddGroup: () => void;
}) {
  if (!canEdit) return null;

  return (
    <div className="mt-3 flex w-full flex-wrap items-center gap-1 border-t border-zinc-200 pt-3">
      <button
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm font-medium text-emerald-600 transition-colors outline-none hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-3 focus-visible:ring-emerald-500/20"
        onClick={onAddCondition}
        type="button"
      >
        <Plus aria-hidden="true" size={16} />
        Add condition
      </button>
      <button
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm font-medium text-zinc-500 transition-colors outline-none hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canNest}
        onClick={onAddGroup}
        type="button"
      >
        <Plus aria-hidden="true" size={16} />
        Add group
      </button>
    </div>
  );
}

function NestedGroupHeader({
  canEdit,
  canRemove,
  group,
  onChange,
  tree,
}: {
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
        className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md px-2 text-left text-sm font-medium text-zinc-600 transition-colors outline-none hover:bg-zinc-50 hover:text-zinc-950 focus-visible:ring-3 focus-visible:ring-brand-500/20"
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
    <span className="text-sm font-medium text-zinc-600">{sentence}</span>
  );

  return (
    <div className="mb-2 flex items-center gap-1 border-b border-zinc-200 pb-2">
      {title}
      <span className="ml-auto flex items-center">
        {canEdit && canRemove ? (
          <RemoveButton
            className="size-9"
            label="Remove group"
            onClick={() => onChange(deleteFromTree(tree, group.id))}
            variant="muted"
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
