"use client";
import { Button } from "@reui/ui/button";
import { Checkbox } from "@reui/ui/checkbox";
import { Field, FieldDescription } from "@reui/ui/field";
import { Input } from "@reui/ui/input";
import { OptionPicker } from "@/components/ui/option-picker";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@reui/ui/sheet";

import { DoorOpen, SlidersHorizontal, Trash2 } from "lucide-react";

import type { IndoorSelection } from "@/lib/rooms/indoor-editor-state";
import {
  INDOOR_METRES_PER_LOCAL_UNIT,
  type CampusIndoorConnector,
  type CampusIndoorDocument,
  type CampusIndoorSpace,
  type CampusIndoorWall,
  type CampusIndoorWallOpening,
} from "@/lib/rooms/indoor-map";
import { wallLength, wallSegmentLength } from "@/lib/rooms/indoor-walls";

const accessibilityOptions = [
  { value: "unknown", label: "Unverified" },
  { value: "accessible", label: "Accessible" },
  { value: "inaccessible", label: "Not accessible" },
] as const;

const spaceKindOptions = [
  { value: "room", label: "Room" },
  { value: "corridor", label: "Corridor" },
  { value: "open-area", label: "Open area" },
  { value: "service", label: "Service" },
  { value: "void", label: "Void" },
] as const;

const wallKindOptions = [
  { value: "structural", label: "Structural" },
  { value: "partition", label: "Partition" },
  { value: "glazing", label: "Glazing" },
] as const;

function spaceKindLabel(kind: CampusIndoorSpace["kind"]) {
  return (
    spaceKindOptions.find((option) => option.value === kind)?.label ?? "Space"
  );
}

function metres(units: number) {
  return (units * INDOOR_METRES_PER_LOCAL_UNIT).toFixed(2);
}

function unitsFromMetres(value: string) {
  return Number(value) / INDOOR_METRES_PER_LOCAL_UNIT;
}

export type SelectionDetailsHandlers = Readonly<{
  updateSpace: (id: string, patch: Partial<CampusIndoorSpace>) => void;
  updateWall: (id: string, patch: Partial<CampusIndoorWall>) => void;
  updateOpening: (id: string, patch: Partial<CampusIndoorWallOpening>) => void;
  updateConnector: (id: string, patch: Partial<CampusIndoorConnector>) => void;
  remove: () => void;
}>;

function selectionLabel(
  document: CampusIndoorDocument,
  selection: NonNullable<IndoorSelection>,
) {
  if (selection.kind === "space") {
    const space = document.spaces.find((item) => item.id === selection.id);
    return space ? `${spaceKindLabel(space.kind)} details` : "Space details";
  }
  if (selection.kind === "opening") return "Door details";
  if (selection.kind === "connector") {
    const connector = document.connectors.find(
      (item) => item.id === selection.id,
    );
    return connector?.kind === "lift" ? "Lift details" : "Stairs details";
  }
  if (selection.kind === "wall") return "Wall details";
  return "Route point details";
}

/** Selection editing is available when it is useful, without occupying the map. */
export function SelectionDetailsSheet({
  document,
  selection,
  handlers,
}: {
  document: CampusIndoorDocument;
  selection: IndoorSelection;
  handlers: SelectionDetailsHandlers;
}) {
  if (!selection) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="h-11 sm:h-8" size="sm" variant="ghost" type="button">
          <SlidersHorizontal aria-hidden="true" />
          Edit selected
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="border-b border-border pr-16">
          <SheetTitle>{selectionLabel(document, selection)}</SheetTitle>
          <SheetDescription>
            Update the selected item without covering the floor plan
            permanently.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <PropertiesBody
            document={document}
            handlers={handlers}
            selection={selection}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PropertiesBody({
  document,
  selection,
  handlers,
}: {
  document: CampusIndoorDocument;
  selection: IndoorSelection;
  handlers: SelectionDetailsHandlers;
}) {
  if (!selection) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Select a room, wall, door, lift or stairs on the plan to edit it.
      </p>
    );
  }

  if (selection.kind === "space") {
    const space = document.spaces.find(
      (candidate) => candidate.id === selection.id,
    );
    if (!space) return null;
    const linkedDoors = document.walls.flatMap((wall) =>
      wall.openings.filter((opening) => opening.spaceId === space.id),
    );
    return (
      <>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Kind"}</span>
            <OptionPicker
              value={"coursemap:" + String(space.kind)}
              onValueChange={(nextValue) => {
                const option = ([...spaceKindOptions] as const).find(
                  (option) => "coursemap:" + String(option.value) === nextValue,
                );
                if (option)
                  ((kind) => {
                    const nextKind = kind as CampusIndoorSpace["kind"];
                    handlers.updateSpace(space.id, {
                      kind: nextKind,
                      ...(nextKind === "room" ? {} : { searchable: false }),
                    });
                  })(option.value);
              }}
              aria-label={"Space kind"}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder={"Select..."}
              items={[...spaceKindOptions].map((option) => ({
                value: "coursemap:" + String(option.value),
                label: option.label,
              }))}
            />
          </label>
        </Field>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Name"}</span>
            <Input
              onChange={(event) =>
                handlers.updateSpace(space.id, { name: event.target.value })
              }
              placeholder={
                space.kind === "room" ? "Seminar room" : "Space name"
              }
              value={space.name}
            />
          </label>
        </Field>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              {space.kind === "room" ? "Room reference" : "Reference"}
            </span>
            <Input
              onChange={(event) =>
                handlers.updateSpace(space.id, { ref: event.target.value })
              }
              placeholder={space.kind === "room" ? "G01" : "Optional"}
              value={space.ref}
            />
          </label>
        </Field>
        {space.kind === "room" ? (
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-foreground/80">
              <Checkbox
                checked={space.searchable}
                onCheckedChange={(checked) =>
                  handlers.updateSpace(space.id, {
                    searchable: checked === true,
                  })
                }
              />
              Findable in Room Finder search
            </label>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <DoorOpen aria-hidden="true" size={15} />
                {linkedDoors.length === 0
                  ? "No linked door"
                  : `${linkedDoors.length} linked ${linkedDoors.length === 1 ? "door" : "doors"}`}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {linkedDoors.length === 0
                  ? "Use Entrances & routes to place a door on the side people enter from."
                  : "The route can use these doors to enter this room."}
              </p>
            </div>
          </>
        ) : null}
        <DeleteButton
          label={`Delete ${spaceKindLabel(space.kind).toLowerCase()}`}
          onDelete={handlers.remove}
        />
      </>
    );
  }

  if (selection.kind === "wall") {
    const wall = document.walls.find(
      (candidate) => candidate.id === selection.id,
    );
    if (!wall) return null;
    if (wall.id === `wall-outline-${wall.levelId}`) {
      return (
        <>
          <p className="text-xs font-semibold text-foreground">
            Building outline
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            This perimeter follows the selected vector footprint and cannot be
            moved, resized or deleted. Add doors directly on the outline.
          </p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Length</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {metres(wallLength(wall))} m
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Doors</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {wall.openings.length}
              </dd>
            </div>
          </dl>
        </>
      );
    }
    return (
      <>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Kind"}</span>
            <OptionPicker
              value={"coursemap:" + String(wall.kind)}
              onValueChange={(nextValue) => {
                const option = ([...wallKindOptions] as const).find(
                  (option) => "coursemap:" + String(option.value) === nextValue,
                );
                if (option)
                  ((kind) =>
                    handlers.updateWall(wall.id, {
                      kind: kind as CampusIndoorWall["kind"],
                    }))(option.value);
              }}
              aria-label={"Wall kind"}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder={"Select..."}
              items={[...wallKindOptions].map((option) => ({
                value: "coursemap:" + String(option.value),
                label: option.label,
              }))}
            />
          </label>
        </Field>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Thickness (m)"}</span>
            <Input
              min="0.05"
              onChange={(event) =>
                handlers.updateWall(wall.id, {
                  thickness: unitsFromMetres(event.target.value),
                })
              }
              step="0.05"
              type="number"
              value={metres(wall.thickness)}
            />
          </label>
        </Field>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Length</dt>
            <dd className="font-medium text-foreground tabular-nums">
              {metres(wallLength(wall))} m
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Corners</dt>
            <dd className="font-medium text-foreground tabular-nums">
              {wall.points.length}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Doors</dt>
            <dd className="font-medium text-foreground tabular-nums">
              {wall.openings.length}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Shape</dt>
            <dd className="font-medium text-foreground">
              {wall.closed ? "Closed" : "Open run"}
            </dd>
          </div>
        </dl>
        <DeleteButton label="Delete wall" onDelete={handlers.remove} />
      </>
    );
  }

  if (selection.kind === "opening") {
    const wall = document.walls.find((candidate) =>
      candidate.openings.some((opening) => opening.id === selection.id),
    );
    const opening = wall?.openings.find(
      (candidate) => candidate.id === selection.id,
    );
    if (!wall || !opening) return null;

    const rooms = document.spaces.filter(
      (space) => space.levelId === wall.levelId && space.kind === "room",
    );
    const segment = wallSegmentLength(wall, opening.segmentIndex);

    return (
      <>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Kind"}</span>
            <OptionPicker
              value={"coursemap:" + String(opening.kind)}
              onValueChange={(nextValue) => {
                const option = (
                  [
                    { value: "door", label: "Door" },
                    { value: "opening", label: "Open gap" },
                  ] as const
                ).find(
                  (option) => "coursemap:" + String(option.value) === nextValue,
                );
                if (option)
                  ((kind) =>
                    handlers.updateOpening(opening.id, {
                      kind: kind as CampusIndoorWallOpening["kind"],
                    }))(option.value);
              }}
              aria-label={"Opening kind"}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder={"Select..."}
              items={[
                { value: "door", label: "Door" },
                { value: "opening", label: "Open gap" },
              ].map((option) => ({
                value: "coursemap:" + String(option.value),
                label: option.label,
              }))}
            />
          </label>
        </Field>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Width (m)"}</span>
            <Input
              max={metres(segment)}
              min="0.1"
              onChange={(event) =>
                handlers.updateOpening(opening.id, {
                  width: Math.min(unitsFromMetres(event.target.value), segment),
                })
              }
              step="0.1"
              type="number"
              value={metres(opening.width)}
            />
            <FieldDescription>{`This wall segment is ${metres(segment)} m long.`}</FieldDescription>
          </label>
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-foreground/80">
          <Checkbox
            checked={opening.exterior === true}
            onCheckedChange={(checked) =>
              handlers.updateOpening(opening.id, {
                exterior: checked === true,
                ...(checked === true ? { spaceId: undefined } : {}),
              })
            }
          />
          Leads outside (building entrance)
        </label>
        {opening.exterior ? null : (
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Serves room"}</span>
              <OptionPicker
                value={"coursemap:" + String(opening.spaceId ?? "")}
                onValueChange={(nextValue) => {
                  const option = (
                    [
                      { value: "", label: "Not linked" },
                      ...rooms.map((room) => ({
                        value: room.id,
                        label: room.ref
                          ? `${room.ref} · ${room.name || "Room"}`
                          : room.name || "Room",
                      })),
                    ] as const
                  ).find(
                    (option) =>
                      "coursemap:" + String(option.value) === nextValue,
                  );
                  if (option)
                    ((spaceId) =>
                      handlers.updateOpening(opening.id, {
                        spaceId: spaceId || undefined,
                      }))(option.value);
                }}
                aria-label={"Room this door serves"}
                onPointerDown={(event) => event.stopPropagation()}
                placeholder={"Select..."}
                items={[
                  { value: "", label: "Not linked" },
                  ...rooms.map((room) => ({
                    value: room.id,
                    label: room.ref
                      ? `${room.ref} · ${room.name || "Room"}`
                      : room.name || "Room",
                  })),
                ].map((option) => ({
                  value: "coursemap:" + String(option.value),
                  label: option.label,
                }))}
              />
              <FieldDescription>
                {"Which room this door opens into."}
              </FieldDescription>
            </label>
          </Field>
        )}
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Accessibility"}</span>
            <OptionPicker
              value={"coursemap:" + String(opening.accessibility)}
              onValueChange={(nextValue) => {
                const option = ([...accessibilityOptions] as const).find(
                  (option) => "coursemap:" + String(option.value) === nextValue,
                );
                if (option)
                  ((accessibility) =>
                    handlers.updateOpening(opening.id, {
                      accessibility:
                        accessibility as CampusIndoorWallOpening["accessibility"],
                    }))(option.value);
              }}
              aria-label={"Opening accessibility"}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder={"Select..."}
              items={[...accessibilityOptions].map((option) => ({
                value: "coursemap:" + String(option.value),
                label: option.label,
              }))}
            />
          </label>
        </Field>
        <DeleteButton label="Delete door" onDelete={handlers.remove} />
      </>
    );
  }

  if (selection.kind === "connector") {
    const connector = document.connectors.find(
      (candidate) => candidate.id === selection.id,
    );
    if (!connector) return null;
    return (
      <>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Name"}</span>
            <Input
              onChange={(event) =>
                handlers.updateConnector(connector.id, {
                  name: event.target.value,
                })
              }
              value={connector.name}
            />
          </label>
        </Field>
        <Field>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{"Accessibility"}</span>
            <OptionPicker
              value={"coursemap:" + String(connector.accessibility)}
              onValueChange={(nextValue) => {
                const option = ([...accessibilityOptions] as const).find(
                  (option) => "coursemap:" + String(option.value) === nextValue,
                );
                if (option)
                  ((accessibility) =>
                    handlers.updateConnector(connector.id, {
                      accessibility:
                        accessibility as CampusIndoorConnector["accessibility"],
                    }))(option.value);
              }}
              aria-label={"Connector accessibility"}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder={"Select..."}
              items={[...accessibilityOptions].map((option) => ({
                value: "coursemap:" + String(option.value),
                label: option.label,
              }))}
            />
          </label>
        </Field>
        <fieldset>
          <legend className="text-xs font-medium text-foreground/80">
            Floors served
          </legend>
          <div className="mt-1.5 space-y-0.5">
            {document.levels.map((level) => {
              const served = connector.levelIds.includes(level.id);
              const isLast = served && connector.levelIds.length === 1;
              return (
                <label
                  className="flex min-h-9 cursor-pointer items-center gap-2 text-xs text-foreground/80"
                  key={level.id}
                >
                  <Checkbox
                    checked={served}
                    disabled={isLast}
                    onCheckedChange={(checked) =>
                      handlers.updateConnector(connector.id, {
                        levelIds:
                          checked === true
                            ? [...connector.levelIds, level.id]
                            : connector.levelIds.filter(
                                (id) => id !== level.id,
                              ),
                      })
                    }
                  />
                  {level.ref || level.name}
                </label>
              );
            })}
          </div>
        </fieldset>
        <DeleteButton
          label={`Delete ${connector.kind}`}
          onDelete={handlers.remove}
        />
      </>
    );
  }

  const node = document.routeNodes.find(
    (candidate) => candidate.id === selection.id,
  );
  if (!node) return null;
  const managed =
    Boolean(node.openingId) ||
    node.kind === "space" ||
    node.kind === "connector";
  return (
    <>
      <p className="text-xs font-semibold text-foreground">
        {node.kind === "junction" ? "Walking path point" : "Route point"}
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        {managed
          ? "This point follows a door, a room or a connector. Edit that instead."
          : "Drag this point on the plan to move it."}
      </p>
      {managed ? null : (
        <DeleteButton label="Delete route point" onDelete={handlers.remove} />
      )}
    </>
  );
}

function DeleteButton({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void;
}) {
  return (
    <Button
      className="h-11 w-full sm:h-8"
      onClick={onDelete}
      size="sm"
      variant="destructive"
      type="button"
    >
      <Trash2 aria-hidden="true" />
      {label}
    </Button>
  );
}
