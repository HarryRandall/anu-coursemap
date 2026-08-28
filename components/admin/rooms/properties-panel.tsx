"use client";

import { DoorOpen, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
        <Button className="h-11 sm:h-8" size="sm" variant="ghost">
          <SlidersHorizontal aria-hidden="true" />
          Edit selected
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="border-b border-zinc-200 pr-16">
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
      <p className="text-xs leading-5 text-zinc-500">
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
        <Field label="Kind">
          <Select
            aria-label="Space kind"
            onChange={(kind) => {
              const nextKind = kind as CampusIndoorSpace["kind"];
              handlers.updateSpace(space.id, {
                kind: nextKind,
                ...(nextKind === "room" ? {} : { searchable: false }),
              });
            }}
            options={[...spaceKindOptions]}
            value={space.kind}
          />
        </Field>
        <Field label="Name">
          <Input
            onChange={(event) =>
              handlers.updateSpace(space.id, { name: event.target.value })
            }
            placeholder={space.kind === "room" ? "Seminar room" : "Space name"}
            value={space.name}
          />
        </Field>
        <Field label={space.kind === "room" ? "Room reference" : "Reference"}>
          <Input
            onChange={(event) =>
              handlers.updateSpace(space.id, { ref: event.target.value })
            }
            placeholder={space.kind === "room" ? "G01" : "Optional"}
            value={space.ref}
          />
        </Field>
        {space.kind === "room" ? (
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700">
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
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                <DoorOpen aria-hidden="true" size={15} />
                {linkedDoors.length === 0
                  ? "No linked door"
                  : `${linkedDoors.length} linked ${linkedDoors.length === 1 ? "door" : "doors"}`}
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
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
          <p className="text-xs font-semibold text-zinc-950">
            Building outline
          </p>
          <p className="text-xs leading-5 text-zinc-500">
            This perimeter follows the selected vector footprint and cannot be
            moved, resized or deleted. Add doors directly on the outline.
          </p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-zinc-500">Length</dt>
              <dd className="font-medium text-zinc-900 tabular-nums">
                {metres(wallLength(wall))} m
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Doors</dt>
              <dd className="font-medium text-zinc-900 tabular-nums">
                {wall.openings.length}
              </dd>
            </div>
          </dl>
        </>
      );
    }
    return (
      <>
        <Field label="Kind">
          <Select
            aria-label="Wall kind"
            onChange={(kind) =>
              handlers.updateWall(wall.id, {
                kind: kind as CampusIndoorWall["kind"],
              })
            }
            options={[...wallKindOptions]}
            value={wall.kind}
          />
        </Field>
        <Field label="Thickness (m)">
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
        </Field>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-zinc-500">Length</dt>
            <dd className="font-medium text-zinc-900 tabular-nums">
              {metres(wallLength(wall))} m
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Corners</dt>
            <dd className="font-medium text-zinc-900 tabular-nums">
              {wall.points.length}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Doors</dt>
            <dd className="font-medium text-zinc-900 tabular-nums">
              {wall.openings.length}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Shape</dt>
            <dd className="font-medium text-zinc-900">
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
        <Field label="Kind">
          <Select
            aria-label="Opening kind"
            onChange={(kind) =>
              handlers.updateOpening(opening.id, {
                kind: kind as CampusIndoorWallOpening["kind"],
              })
            }
            options={[
              { value: "door", label: "Door" },
              { value: "opening", label: "Open gap" },
            ]}
            value={opening.kind}
          />
        </Field>
        <Field
          hint={`This wall segment is ${metres(segment)} m long.`}
          label="Width (m)"
        >
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
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700">
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
          <Field hint="Which room this door opens into." label="Serves room">
            <Select
              aria-label="Room this door serves"
              onChange={(spaceId) =>
                handlers.updateOpening(opening.id, {
                  spaceId: spaceId || undefined,
                })
              }
              options={[
                { value: "", label: "Not linked" },
                ...rooms.map((room) => ({
                  value: room.id,
                  label: room.ref
                    ? `${room.ref} · ${room.name || "Room"}`
                    : room.name || "Room",
                })),
              ]}
              value={opening.spaceId ?? ""}
            />
          </Field>
        )}
        <Field label="Accessibility">
          <Select
            aria-label="Opening accessibility"
            onChange={(accessibility) =>
              handlers.updateOpening(opening.id, {
                accessibility:
                  accessibility as CampusIndoorWallOpening["accessibility"],
              })
            }
            options={[...accessibilityOptions]}
            value={opening.accessibility}
          />
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
        <Field label="Name">
          <Input
            onChange={(event) =>
              handlers.updateConnector(connector.id, {
                name: event.target.value,
              })
            }
            value={connector.name}
          />
        </Field>
        <Field label="Accessibility">
          <Select
            aria-label="Connector accessibility"
            onChange={(accessibility) =>
              handlers.updateConnector(connector.id, {
                accessibility:
                  accessibility as CampusIndoorConnector["accessibility"],
              })
            }
            options={[...accessibilityOptions]}
            value={connector.accessibility}
          />
        </Field>
        <fieldset>
          <legend className="text-xs font-medium text-zinc-700">
            Floors served
          </legend>
          <div className="mt-1.5 space-y-0.5">
            {document.levels.map((level) => {
              const served = connector.levelIds.includes(level.id);
              const isLast = served && connector.levelIds.length === 1;
              return (
                <label
                  className="flex min-h-9 cursor-pointer items-center gap-2 text-xs text-zinc-700"
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
      <p className="text-xs font-semibold text-zinc-950">
        {node.kind === "junction" ? "Walking path point" : "Route point"}
      </p>
      <p className="text-xs leading-5 text-zinc-500">
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
      variant="danger"
    >
      <Trash2 aria-hidden="true" />
      {label}
    </Button>
  );
}
