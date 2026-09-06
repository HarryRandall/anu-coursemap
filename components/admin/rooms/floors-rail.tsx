"use client";
import { Button } from "@reui/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@reui/ui/dialog";
import { Field, FieldDescription } from "@reui/ui/field";
import { Input } from "@reui/ui/input";

import { Layers3, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { cn } from "@/lib/cn";
import type { CampusIndoorLevel } from "@/lib/rooms/indoor-map";

function FloorDetailsDialog({
  level,
  onUpdate,
}: {
  level: CampusIndoorLevel;
  onUpdate: (patch: Partial<CampusIndoorLevel>) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="size-11 sm:size-8"
          size="icon-sm"
          variant="ghost"
          aria-label={`Edit ${level.name}`}
          title={`Edit ${level.name}`}
          type="button"
        >
          <Pencil aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="px-5 pt-5 pr-16">
          <DialogTitle>Edit floor</DialogTitle>
          <DialogDescription>
            Give this floor the name and short reference people will recognise.
            Its position is set when the floor is added.
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
              <FieldDescription>{"For example G, 1 or LG."}</FieldDescription>
            </label>
          </Field>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button className="h-11 sm:h-8" variant="default" type="button">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Floor structure gets its own editor section. New floors receive standard
 * spacing, so the UI only asks authors for useful labels.
 */
export function FloorsPanel({
  levels,
  activeLevelId,
  onSelect,
  onAdd,
  onRemove,
  onUpdate,
}: {
  levels: readonly CampusIndoorLevel[];
  activeLevelId: string;
  onSelect: (levelId: string) => void;
  onAdd: () => void;
  onRemove: (levelId: string) => void;
  onUpdate: (levelId: string, patch: Partial<CampusIndoorLevel>) => void;
}) {
  const ordered = [...levels].sort((left, right) => right.number - left.number);

  return (
    <section className="flex min-h-0 flex-col bg-card lg:border-r lg:border-border">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers3 aria-hidden="true" size={16} />
              Building floors
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add one entry for each physical floor. New floors use consistent
              spacing automatically.
            </p>
          </div>
          <Button
            className="h-11 sm:h-8"
            onClick={onAdd}
            size="sm"
            variant="outline"
            type="button"
          >
            <Plus aria-hidden="true" />
            Add floor
          </Button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">No floors yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add the ground floor to start the map.
            </p>
            <Button
              className="mt-4 h-11 sm:h-8"
              onClick={onAdd}
              size="sm"
              variant="outline"
              type="button"
            >
              <Plus aria-hidden="true" />
              Add ground floor
            </Button>
          </div>
        </div>
      ) : (
        <ul
          aria-label="Building floors"
          className="space-y-2 overflow-y-auto p-3 sm:p-4"
        >
          {ordered.map((level) => {
            const active = level.id === activeLevelId;
            return (
              <li
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                  active
                    ? "border-primary/25 bg-primary/5"
                    : "border-border bg-card hover:border-input",
                )}
                key={level.id}
              >
                <button
                  aria-current={active ? "true" : undefined}
                  className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onSelect(level.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold tabular-nums",
                      active
                        ? "bg-primary text-white"
                        : "bg-muted text-foreground/80",
                    )}
                  >
                    {level.ref || level.number}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {level.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Floor {level.number}
                    </span>
                  </span>
                </button>

                <FloorDetailsDialog
                  level={level}
                  onUpdate={(patch) => onUpdate(level.id, patch)}
                />
                <ConfirmDialog
                  confirmLabel="Remove floor"
                  description={`Everything drawn on ${level.name} is removed with it: rooms, walls, doors and route points.`}
                  destructive
                  onConfirm={() => onRemove(level.id)}
                  title={`Remove ${level.name}?`}
                  trigger={
                    <Button
                      className="size-11 sm:size-8"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${level.name}`}
                      title={`Remove ${level.name}`}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
