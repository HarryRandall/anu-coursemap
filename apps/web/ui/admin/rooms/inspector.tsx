"use client";

import { CircleAlert, PanelRightClose, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import {
  selectionLabel,
  SelectionProperties,
  type SelectionDetailsHandlers,
} from "@/ui/admin/rooms/properties-panel";
import type { IndoorLayerGroup } from "@/ui/rooms/indoor-3d-layers";
import { Badge } from "@coursemap/ui/components/badge";
import { Button } from "@coursemap/ui/primitives/button";
import { Checkbox } from "@coursemap/ui/primitives/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@coursemap/ui/primitives/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@coursemap/ui/primitives/tooltip";
import { cn } from "@/lib/cn";
import type { IndoorSelection } from "@/lib/rooms/indoor-editor-state";
import type { CampusIndoorDocument } from "@/lib/rooms/indoor-map";
import type { IndoorIssue } from "@/lib/rooms/indoor-validate";

export type InspectorTab = "selection" | "layers" | "issues";

const LAYER_GROUPS: ReadonlyArray<
  Readonly<{ group: IndoorLayerGroup; label: string; hint: string }>
> = [
  { group: "spaces", label: "Spaces", hint: "Rooms, corridors and voids." },
  { group: "walls", label: "Walls", hint: "Authored walls and the outline." },
  { group: "doors", label: "Doors", hint: "Doors, gaps and entrances." },
  {
    group: "connectors",
    label: "Stairs and lifts",
    hint: "Shafts through the floors they serve.",
  },
  { group: "routing", label: "Routing", hint: "The walking graph." },
  { group: "labels", label: "Labels", hint: "Room references and names." },
];

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-6 text-center text-xs leading-5 text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * The right-hand panel. One tab per concern, so the plan is never covered by
 * a sheet and the author can keep an eye on issues while drawing.
 */
export function Inspector({
  document,
  selection,
  handlers,
  hiddenLayers,
  issues,
  tab,
  onTabChange,
  onToggleLayer,
  onFocusIssue,
  onCollapse,
  className,
}: {
  document: CampusIndoorDocument;
  selection: IndoorSelection;
  handlers: SelectionDetailsHandlers;
  hiddenLayers: ReadonlySet<IndoorLayerGroup>;
  issues: readonly IndoorIssue[];
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onToggleLayer: (group: IndoorLayerGroup, visible: boolean) => void;
  onFocusIssue: (issue: IndoorIssue) => void;
  /** Hides the panel to give the plan the full width; omitted inside a sheet. */
  onCollapse?: () => void;
  className?: string;
}) {
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;

  return (
    <Tabs
      className={cn("flex min-h-0 flex-col gap-0 bg-card", className)}
      onValueChange={(value) => onTabChange(value as InspectorTab)}
      value={tab}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border p-2">
        <TabsList aria-label="Inspector sections" className="w-full">
          <TabsTrigger value="selection">Selection</TabsTrigger>
          <TabsTrigger value="layers">Layers</TabsTrigger>
          <TabsTrigger className="gap-1.5" value="issues">
            Issues
            {issues.length > 0 ? (
              <Badge
                className="h-4 min-w-4 px-1 text-[10px]"
                variant={errors > 0 ? "destructive" : "warning"}
              >
                {issues.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>
        {onCollapse ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="shrink-0"
                aria-label="Hide inspector"
                onClick={onCollapse}
                size="icon-sm"
                variant="ghost"
              >
                <PanelRightClose aria-hidden="true" size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{"Hide inspector"}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <TabsContent className="min-h-0 flex-1 overflow-y-auto" value="selection">
        {selection ? (
          <div className="space-y-4 p-4">
            <h2 className="text-sm font-semibold text-foreground">
              {selectionLabel(document, selection)}
            </h2>
            <SelectionProperties
              document={document}
              handlers={handlers}
              selection={selection}
            />
          </div>
        ) : (
          <EmptyState>
            Select a room, wall, door, lift or stairs on the plan to edit it.
          </EmptyState>
        )}
      </TabsContent>

      <TabsContent className="min-h-0 flex-1 overflow-y-auto" value="layers">
        <ul className="divide-y divide-border">
          {LAYER_GROUPS.map(({ group, label, hint }) => {
            const visible = !hiddenLayers.has(group);
            return (
              <li key={group}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent/40">
                  <Checkbox
                    checked={visible}
                    onCheckedChange={(checked) =>
                      onToggleLayer(group, checked === true)
                    }
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {hint}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </TabsContent>

      <TabsContent className="min-h-0 flex-1 overflow-y-auto" value="issues">
        {issues.length === 0 ? (
          <EmptyState>
            Nothing to fix. This plan is ready to publish.
          </EmptyState>
        ) : (
          <>
            <p className="px-4 pt-3 text-xs text-muted-foreground">
              {errors > 0
                ? `${errors} ${errors === 1 ? "error blocks" : "errors block"} publishing.`
                : "Warnings do not block publishing."}
              {warnings > 0 && errors > 0
                ? ` ${warnings} ${warnings === 1 ? "warning" : "warnings"}.`
                : ""}
            </p>
            <ul aria-label="Issues" className="divide-y divide-border">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <button
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left text-sm outline-none hover:bg-accent/40 focus-visible:bg-accent/40"
                    onClick={() => onFocusIssue(issue)}
                    type="button"
                  >
                    {issue.severity === "error" ? (
                      <CircleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-destructive"
                      />
                    ) : (
                      <TriangleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-warning"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="sr-only">
                        {issue.severity === "error" ? "Error: " : "Warning: "}
                      </span>
                      <span className="block leading-5 text-foreground">
                        {issue.message}
                      </span>
                      {issue.levelId ? (
                        <span className="block text-xs text-muted-foreground">
                          {document.levels.find(
                            (level) => level.id === issue.levelId,
                          )?.name ?? issue.levelId}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
