import { type PointerEvent as ReactPointerEvent } from "react";
import { type ReviewedConditionNode } from "@/lib/coursemap/requisite-conditions";
import { type ConditionActions } from "@/ui/admin/requisites/requisite-rule-controls";

export type DragPointer = {
  initialX: number;
  initialY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};
export type DragController = {
  activeCondition: ReviewedConditionNode | null;
  activeId: string | null;
  cancel: () => void;
  dragPointer: DragPointer | null;
  dropAt: (movingId: string, groupId: string, index: number) => void;
  overSlot: string | null;
  start: (id: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
};
export const DRAG_PREVIEW_ACTIONS: ConditionActions = {
  canNest: false,
  onAddCondition: () => undefined,
  onAddGroup: () => undefined,
  onChange: () => undefined,
  onKindChange: () => undefined,
  onRemove: () => undefined,
};
export const DRAG_PREVIEW_HANDLE = {
  dragging: false,
  onKeyDown: () => undefined,
  onPointerDown: () => undefined,
};
export function dropTargetAtPoint(clientX: number, clientY: number) {
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
