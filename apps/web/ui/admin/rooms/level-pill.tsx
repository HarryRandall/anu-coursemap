"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  EllipsisVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import { ConfirmDialog } from "@/ui/ui/confirm-dialog";
import { Button } from "@coursemap/ui/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coursemap/ui/primitives/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@coursemap/ui/primitives/dropdown-menu";
import { Field, FieldDescription } from "@coursemap/ui/primitives/field";
import { Input } from "@coursemap/ui/primitives/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@coursemap/ui/primitives/tooltip";
import { cn } from "@/lib/cn";
import type { CampusIndoorLevel } from "@/lib/rooms/indoor-map";

function FloorDetailsDialog({
  level,
  open,
  onOpenChange,
  onUpdate,
  returnFocusRef,
}: {
  level: CampusIndoorLevel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (patch: Partial<CampusIndoorLevel>) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogHeader className="px-5 pt-5 pr-16">
          <DialogTitle>Edit floor</DialogTitle>
          <DialogDescription>
            Give this floor the name and short reference people will recognise.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 overflow-y-auto px-5 py-4">
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Name"}</span>
              <Input
                onChange={(event) => onUpdate({ name: event.target.value })}
                value={level.name}
              />
            </label>
          </Field>
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Reference"}</span>
              <Input
                onChange={(event) => onUpdate({ ref: event.target.value })}
                value={level.ref}
              />
            </label>
            <FieldDescription>{"For example G, 1 or LG."}</FieldDescription>
          </Field>
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Elevation (m)"}</span>
              <Input
                onChange={(event) =>
                  onUpdate({ elevationMetres: Number(event.target.value) || 0 })
                }
                step="0.1"
                type="number"
                value={level.elevationMetres}
              />
            </label>
            <FieldDescription>
              {"Metres from the ground floor slab."}
            </FieldDescription>
          </Field>
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Floor height (m)"}</span>
              <Input
                min="1"
                onChange={(event) => {
                  const height = Number(event.target.value);
                  if (height > 0) onUpdate({ heightMetres: height });
                }}
                step="0.1"
                type="number"
                value={level.heightMetres}
              />
            </label>
          </Field>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button className="h-11 sm:h-8" variant="default">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The floor switcher: a vertical pill over the canvas listing floors top down,
 * the way a lift panel does. The active floor's menu holds everything that is
 * done to a whole floor at once.
 */
export function LevelPill({
  levels,
  activeLevelId,
  className,
  onSelect,
  onAdd,
  onRemove,
  onUpdate,
  onMove,
  onCopyWalls,
}: {
  levels: readonly CampusIndoorLevel[];
  activeLevelId: string;
  className?: string;
  onSelect: (levelId: string) => void;
  onAdd: () => void;
  onRemove: (levelId: string) => void;
  onUpdate: (levelId: string, patch: Partial<CampusIndoorLevel>) => void;
  onMove: (levelId: string, direction: "up" | "down") => void;
  /** Copies the active floor's walls onto another floor. */
  onCopyWalls?: (fromLevelId: string, toLevelId: string) => void;
}) {
  const ordered = [...levels].sort((left, right) => right.number - left.number);
  const active = levels.find((level) => level.id === activeLevelId);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const activeIndex = ordered.findIndex((level) => level.id === activeLevelId);

  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-md backdrop-blur",
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-10 sm:size-9"
            ref={addButtonRef}
            aria-label="Add floor"
            onClick={onAdd}
            size="icon"
            variant="ghost"
          >
            <Plus aria-hidden="true" size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{"Add floor"}</TooltipContent>
      </Tooltip>
      {ordered.length > 0 ? (
        <span aria-hidden="true" className="mx-2 h-px bg-border" />
      ) : null}
      <ul aria-label="Building floors" className="flex flex-col gap-1">
        {ordered.map((level) => {
          const isActive = level.id === activeLevelId;
          return (
            <li key={level.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-current={isActive ? "true" : undefined}
                    aria-label={`${level.name}, floor ${level.number}`}
                    className={cn(
                      "grid size-10 cursor-pointer place-items-center rounded-lg text-sm font-semibold tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-9",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/80 hover:bg-accent hover:text-foreground",
                    )}
                    onClick={() => onSelect(level.id)}
                    type="button"
                  >
                    {level.ref || level.number}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{`${level.name} (floor ${level.number})`}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      {active ? (
        <>
          <span aria-hidden="true" className="mx-2 h-px bg-border" />
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="size-10 sm:size-9"
                    ref={menuButtonRef}
                    aria-label={`${active.name} options`}
                    size="icon"
                    variant="ghost"
                  >
                    <EllipsisVertical aria-hidden="true" size={18} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">{`${active.name} options`}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" side="right">
              <DropdownMenuLabel>{active.name}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                Rename or set heights
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={activeIndex <= 0}
                onSelect={() => onMove(active.id, "up")}
              >
                <ArrowUp aria-hidden="true" />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  activeIndex === -1 || activeIndex >= ordered.length - 1
                }
                onSelect={() => onMove(active.id, "down")}
              >
                <ArrowDown aria-hidden="true" />
                Move down
              </DropdownMenuItem>
              {onCopyWalls && ordered.length > 1 ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Copy aria-hidden="true" className="mr-2 size-4" />
                    Copy walls to floor
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {ordered
                      .filter((level) => level.id !== active.id)
                      .map((level) => (
                        <DropdownMenuItem
                          key={level.id}
                          onSelect={() => onCopyWalls(active.id, level.id)}
                        >
                          {level.ref || level.number} · {level.name}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive data-[highlighted]:text-destructive"
                onSelect={() => setRemoving(true)}
              >
                <Trash2 aria-hidden="true" />
                Remove floor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <FloorDetailsDialog
            level={active}
            returnFocusRef={menuButtonRef}
            onOpenChange={setEditing}
            onUpdate={(patch) => onUpdate(active.id, patch)}
            open={editing}
          />
          <ConfirmDialog
            returnFocusRef={addButtonRef}
            confirmLabel="Remove floor"
            description={`Everything drawn on ${active.name} is removed with it: rooms, walls, doors and route points.`}
            destructive
            onConfirm={() => onRemove(active.id)}
            onOpenChange={setRemoving}
            open={removing}
            title={`Remove ${active.name}?`}
          />
        </>
      ) : null}
    </div>
  );
}
