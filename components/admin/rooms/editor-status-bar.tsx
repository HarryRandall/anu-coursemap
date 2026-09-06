"use client";

import {
  Box,
  Grid3x3,
  Magnet,
  Maximize2,
  Square,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { RailDivider } from "@/components/admin/rooms/tool-rail";
import { Button } from "@reui/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@reui/ui/tooltip";
import { cn } from "@/lib/cn";

export type SnapSettings = Readonly<{
  grid: boolean;
  geometry: boolean;
}>;

/**
 * Snapping, camera and the plan or 3D switch, laid out to sit at the end of
 * the tool rail. The rail turns from a row into a column at the medium
 * breakpoint and these groups turn with it.
 */
export function CanvasControls({
  snap,
  perspective,
  onSnapChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onPerspectiveChange,
}: {
  snap: SnapSettings;
  perspective: boolean;
  onSnapChange: (snap: SnapSettings) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onPerspectiveChange: (perspective: boolean) => void;
}) {
  const group = "flex items-center gap-0.5 md:flex-col";
  return (
    <>
      <div aria-label="Snapping" className={group} role="group">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-pressed={snap.grid}
              aria-label="Snap to grid"
              onClick={() => onSnapChange({ ...snap, grid: !snap.grid })}
              size="icon-sm"
              variant={snap.grid ? "secondary" : "ghost"}
            >
              <Grid3x3 aria-hidden="true" size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{"Snap to grid"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-pressed={snap.geometry}
              aria-label="Snap to walls and corners"
              onClick={() =>
                onSnapChange({ ...snap, geometry: !snap.geometry })
              }
              size="icon-sm"
              variant={snap.geometry ? "secondary" : "ghost"}
            >
              <Magnet aria-hidden="true" size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {"Snap to walls and corners"}
          </TooltipContent>
        </Tooltip>
      </div>

      <RailDivider />

      <div aria-label="Camera" className={group} role="group">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Zoom in"
              onClick={onZoomIn}
              size="icon-sm"
              variant="ghost"
            >
              <ZoomIn aria-hidden="true" size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{"Zoom in"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Zoom out"
              onClick={onZoomOut}
              size="icon-sm"
              variant="ghost"
            >
              <ZoomOut aria-hidden="true" size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{"Zoom out"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Fit floor"
              onClick={onFit}
              size="icon-sm"
              variant="ghost"
            >
              <Maximize2 aria-hidden="true" size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{"Fit floor"}</TooltipContent>
        </Tooltip>
      </div>

      <RailDivider />

      <div
        aria-label="View"
        className={cn(group, "rounded-md bg-muted/80 p-0.5")}
        role="group"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-pressed={!perspective}
              className="size-7"
              aria-label="Plan view"
              onClick={() => onPerspectiveChange(false)}
              size="icon-sm"
              variant={perspective ? "ghost" : "secondary"}
            >
              <Square aria-hidden="true" size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {"Plan view for drawing"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-pressed={perspective}
              className="size-7"
              aria-label="3D view"
              onClick={() => onPerspectiveChange(true)}
              size="icon-sm"
              variant={perspective ? "secondary" : "ghost"}
            >
              <Box aria-hidden="true" size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {"3D view of every floor"}
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}

/**
 * What the current tool wants next, floating over the bottom of the canvas.
 * A problem with the last gesture takes its place until the next one.
 */
export function EditorHint({
  hint,
  warning,
  className,
}: {
  hint: string | null;
  warning: string | null;
  className?: string;
}) {
  const text = warning ?? hint;
  return (
    <div
      className={cn("pointer-events-none flex justify-center px-3", className)}
    >
      <p
        aria-live="polite"
        className={cn(
          "max-w-full truncate rounded-full border px-3 py-1.5 text-xs shadow-sm backdrop-blur",
          warning
            ? "border-destructive/40 bg-destructive/10 font-medium text-destructive"
            : "border-border bg-card/90 text-muted-foreground",
          !text && "invisible",
        )}
        role="status"
      >
        {text ?? ""}
      </p>
    </div>
  );
}
