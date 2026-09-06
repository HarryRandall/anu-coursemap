"use client";

import {
  ArrowUpDown,
  DoorOpen,
  Footprints,
  Minus,
  MousePointer2,
  MoveVertical,
  Pentagon,
  Route,
  Square,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useId, type ReactNode } from "react";
import { Button } from "@reui/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@reui/ui/tooltip";
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

export type ToolDefinition = Readonly<{
  tool: IndoorTool;
  label: string;
  icon: LucideIcon;
  /** Single key that activates the tool while the canvas has focus. */
  shortcut: string;
  hint: string;
}>;

export const TOOL_GROUPS: ReadonlyArray<readonly ToolDefinition[]> = [
  [
    {
      tool: "select",
      label: "Select",
      icon: MousePointer2,
      shortcut: "V",
      hint: "Click an item to select it and edit it in the inspector. Press Delete to remove it.",
    },
  ],
  [
    {
      tool: "wall",
      label: "Wall",
      icon: Minus,
      shortcut: "W",
      hint: "Click each corner of the wall run. Hold Shift to lock to 0, 45 and 90 degrees. Double-click or press Enter to finish, or click the first corner again to close the loop. Backspace drops the last point, Escape cancels.",
    },
    {
      tool: "opening",
      label: "Door",
      icon: DoorOpen,
      shortcut: "D",
      hint: "Click on a wall to cut a door through it. A door on an outside wall becomes a building entrance.",
    },
  ],
  [
    {
      tool: "rectangle",
      label: "Room",
      icon: Square,
      shortcut: "R",
      hint: "Press where one corner goes and drag to the opposite corner. Hold Shift to keep it square. Rotate or move it afterwards with the Select tool.",
    },
    {
      tool: "polygon",
      label: "Shaped room",
      icon: Pentagon,
      shortcut: "G",
      hint: "Click each corner. Click the first corner again, double-click or press Enter to close the room. Backspace drops the last corner, Escape cancels.",
    },
    {
      tool: "corridor",
      label: "Corridor",
      icon: Route,
      shortcut: "C",
      hint: "Press where one corner goes and drag to the opposite corner.",
    },
  ],
  [
    {
      tool: "stairs",
      label: "Stairs",
      icon: ArrowUpDown,
      shortcut: "S",
      hint: "Click to place stairs. They serve every floor until you change that.",
    },
    {
      tool: "lift",
      label: "Lift",
      icon: MoveVertical,
      shortcut: "L",
      hint: "Click to place a lift. It serves every floor until you change that.",
    },
    {
      tool: "path",
      label: "Walking path",
      icon: Footprints,
      shortcut: "P",
      hint: "Click along the route people walk. Double-click or press Enter to finish, Backspace drops the last point, Escape cancels. Start or finish on a door to join it up.",
    },
  ],
];

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = TOOL_GROUPS.flat();

/** The tool a single key activates, or null when the key is not a shortcut. */
export function toolForShortcut(key: string): IndoorTool | null {
  const upper = key.toUpperCase();
  return (
    TOOL_DEFINITIONS.find((definition) => definition.shortcut === upper)
      ?.tool ?? null
  );
}

export function toolDefinition(tool: IndoorTool): ToolDefinition {
  return TOOL_DEFINITIONS.find((definition) => definition.tool === tool)!;
}

/** A rule between groups that turns with the rail. */
export function RailDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 bg-border",
        "mx-1 h-6 w-px md:mx-0 md:my-1 md:h-px md:w-6",
        className,
      )}
    />
  );
}

/**
 * The tool rail beside the canvas: a row across the top on a phone and a
 * column down the left from the medium breakpoint. Icons carry the meaning,
 * so every control names itself for assistive technology and shows a tooltip
 * with its shortcut on hover and focus. Camera and snapping controls sit at
 * the far end, so everything an author reaches for lives on one edge and the
 * plan gets the rest of the screen.
 */
export function ToolRail({
  tool,
  disabled,
  label = "Floor plan tools",
  footer,
  className,
  onSelect,
}: {
  tool: IndoorTool;
  disabled: boolean;
  label?: string;
  /** Controls pinned to the end of the rail, after the tools. */
  footer?: ReactNode;
  className?: string;
  onSelect: (tool: IndoorTool) => void;
}) {
  const hintId = useId();

  return (
    <div
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center gap-1 bg-card p-1.5",
        "flex-row overflow-x-auto border-b border-border",
        "md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-r md:border-b-0",
        className,
      )}
      role="toolbar"
    >
      {TOOL_GROUPS.map((group, index) => (
        <Fragment key={group[0].tool}>
          {index > 0 ? <RailDivider /> : null}
          {group.map((definition) => {
            const active = tool === definition.tool;
            return (
              <Fragment key={definition.tool}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-describedby={`${hintId}-${definition.tool}`}
                      aria-pressed={active}
                      className={cn(
                        "size-10 shrink-0 sm:size-9",
                        active && "shadow-none",
                      )}
                      disabled={disabled}
                      aria-label={definition.label}
                      onClick={() => onSelect(definition.tool)}
                      size="icon"
                      variant={active ? "default" : "ghost"}
                    >
                      <definition.icon aria-hidden="true" size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {
                      <span className="inline-flex items-center gap-2">
                        {definition.label}
                        <kbd className="rounded border border-current/30 px-1 font-mono text-[10px]">
                          {definition.shortcut}
                        </kbd>
                      </span>
                    }
                  </TooltipContent>
                </Tooltip>
                <span className="sr-only" id={`${hintId}-${definition.tool}`}>
                  {definition.hint} Shortcut {definition.shortcut}.
                </span>
              </Fragment>
            );
          })}
        </Fragment>
      ))}
      {footer ? (
        <div className="ml-auto flex items-center gap-1 md:mt-auto md:ml-0 md:flex-col md:pt-2">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
