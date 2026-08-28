"use client";

import {
  Circle,
  DoorOpen,
  Footprints,
  Minus,
  MousePointer2,
  Pentagon,
  Route,
  Square,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useId } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * What a click on the canvas does. Walls are first because a floor plan is
 * mostly walls, and everything else is drawn against them.
 */
export type IndoorTool =
  | "select"
  | "wall"
  | "opening"
  | "rectangle"
  | "polygon"
  | "corridor"
  | "stairs"
  | "lift"
  | "path";

type ToolDefinition = Readonly<{
  tool: IndoorTool;
  label: string;
  icon: LucideIcon;
  hint: string;
}>;

const TOOL_GROUPS: ReadonlyArray<readonly ToolDefinition[]> = [
  [
    {
      tool: "select",
      label: "Select",
      icon: MousePointer2,
      hint: "Click an item to select it, then use Edit selected to change its details. Press Delete to remove it.",
    },
  ],
  [
    {
      tool: "wall",
      label: "Wall",
      icon: Minus,
      hint: "Click each corner of the wall run. Double-click or press Enter to finish, Backspace drops the last point, Escape cancels.",
    },
    {
      tool: "opening",
      label: "Door",
      icon: DoorOpen,
      hint: "Click on a wall to cut a door through it. A door on an outside wall becomes a building entrance.",
    },
  ],
  [
    {
      tool: "rectangle",
      label: "Room",
      icon: Square,
      hint: "Drag out the room. Hold Shift to keep it square.",
    },
    {
      tool: "polygon",
      label: "Shaped room",
      icon: Pentagon,
      hint: "Click each corner. Double-click or press Enter to close the room.",
    },
    {
      tool: "corridor",
      label: "Corridor",
      icon: Route,
      hint: "Drag out the corridor.",
    },
  ],
  [
    {
      tool: "stairs",
      label: "Stairs",
      icon: Circle,
      hint: "Click to place stairs. They serve every floor until you change that.",
    },
    {
      tool: "lift",
      label: "Lift",
      icon: Circle,
      hint: "Click to place a lift. They serve every floor until you change that.",
    },
    {
      tool: "path",
      label: "Walking path",
      icon: Footprints,
      hint: "Click along the route people walk. Double-click or press Enter to finish. Start or finish on a door to join it up.",
    },
  ],
];

export const FLOOR_PLAN_TOOLS: readonly IndoorTool[] = [
  "select",
  "wall",
  "opening",
  "rectangle",
  "polygon",
  "corridor",
];

export const ROUTE_TOOLS: readonly IndoorTool[] = [
  "select",
  "opening",
  "stairs",
  "lift",
  "path",
];

export function ToolPalette({
  tool,
  disabled,
  tools,
  label = "Floor plan tools",
  className,
  onSelect,
}: {
  tool: IndoorTool;
  disabled: boolean;
  tools?: readonly IndoorTool[];
  label?: string;
  className?: string;
  onSelect: (tool: IndoorTool) => void;
}) {
  const hintId = useId();
  const visible = tools ? new Set(tools) : null;
  const groups = TOOL_GROUPS.map((group) =>
    group.filter((definition) => visible?.has(definition.tool) ?? true),
  ).filter((group) => group.length > 0);

  return (
    <div
      aria-label={label}
      className={cn("flex min-w-max items-center gap-1 px-2 py-1.5", className)}
      role="toolbar"
    >
      {groups.map((group, index) => (
        <div className="flex items-center gap-1" key={group[0].tool}>
          {index > 0 ? (
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-zinc-200" />
          ) : null}
          {group.map((definition) => (
            <Fragment key={definition.tool}>
              <Button
                aria-describedby={`${hintId}-${definition.tool}`}
                aria-pressed={tool === definition.tool}
                className="h-11 sm:h-8"
                disabled={disabled}
                onClick={() => onSelect(definition.tool)}
                size="sm"
                title={definition.hint}
                variant={tool === definition.tool ? "subtle" : "ghost"}
              >
                <definition.icon aria-hidden="true" />
                {definition.label}
              </Button>
              <span className="sr-only" id={`${hintId}-${definition.tool}`}>
                {definition.hint}
              </span>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
