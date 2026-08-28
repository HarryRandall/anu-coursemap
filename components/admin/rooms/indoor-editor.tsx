"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useReducer, useState } from "react";
import { Box, DoorOpen, Layers3, Map as MapIcon } from "lucide-react";
import { EditorActions } from "@/components/admin/rooms/editor-header";
import { FloorsPanel } from "@/components/admin/rooms/floors-rail";
import { IndoorMapSurface } from "@/components/admin/rooms/indoor-map-surface";
import {
  SelectionDetailsSheet,
  type SelectionDetailsHandlers,
} from "@/components/admin/rooms/properties-panel";
import {
  FLOOR_PLAN_TOOLS,
  ROUTE_TOOLS,
  ToolPalette,
  type IndoorTool,
} from "@/components/admin/rooms/tool-palette";
import { useEditorPointer } from "@/components/admin/rooms/use-editor-pointer";
import { useUnsavedNavigation } from "@/components/admin/rooms/use-unsaved-navigation";
import { AppShell } from "@/components/shell/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildIndoorScene } from "@/lib/rooms/indoor-3d";
import {
  createIndoorEditorState,
  indoorEditorReducer,
  routingSignature,
} from "@/lib/rooms/indoor-editor-state";
import {
  createIndoorDocumentForFootprint,
  projectBuildingFootprint,
  remapIndoorDocumentToFootprint,
  type IndoorFootprintProjection,
} from "@/lib/rooms/indoor-footprint";
import {
  buildIndoorRouteGraph,
  indoorAuthoredRouteEdgeIds,
  type CampusIndoorDocument,
  type CampusIndoorLevel,
} from "@/lib/rooms/indoor-map";
import {
  saveCampusIndoorMap,
  type CampusIndoorMapEditorRecord,
} from "@/lib/rooms/indoor-map-admin";
import {
  isCampusMapBuildingGeometry,
  type CampusMapData,
  type CampusMapPlace,
} from "@/lib/rooms/campus-map";

const EDITOR_SECTIONS = [
  { value: "floors", label: "Floors", icon: Layers3 },
  { value: "floor-plan", label: "Floor plan", icon: MapIcon },
  { value: "routes", label: "Entrances & routes", icon: DoorOpen },
  { value: "preview", label: "Preview", icon: Box },
] as const;

type EditorSection = (typeof EDITOR_SECTIONS)[number]["value"];

function editorSectionFromSearch(value: string | null): EditorSection {
  return EDITOR_SECTIONS.some((section) => section.value === value)
    ? (value as EditorSection)
    : "floors";
}

function EditorSectionTabs() {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <TabsList
        aria-label="Indoor map sections"
        className="h-auto min-w-max justify-start gap-0 rounded-none bg-transparent p-0"
      >
        {EDITOR_SECTIONS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            className="h-12 gap-1.5 rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-4 text-sm text-zinc-500 shadow-none hover:text-zinc-950 data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 data-[state=active]:shadow-none"
            key={value}
            value={value}
          >
            <Icon aria-hidden="true" className="hidden sm:block" size={15} />
            {value === "routes" ? (
              <>
                <span className="sm:hidden">Routes</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              label
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

function FloorSelect({
  levels,
  value,
  label = "Floor",
  onChange,
}: {
  levels: readonly CampusIndoorLevel[];
  value: string;
  label?: string;
  onChange: (levelId: string) => void;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-zinc-600">
        {label}
      </span>
      <Select
        aria-label={label}
        className="h-11 w-52 max-w-full"
        disabled={levels.length === 0}
        onChange={onChange}
        options={[...levels]
          .sort((left, right) => right.number - left.number)
          .map((level) => ({
            value: level.id,
            label: `${level.ref || level.number} · ${level.name}`,
          }))}
        value={value}
      />
    </label>
  );
}

/** The real building footprint is the only authoring frame. */
function buildingFootprint(
  mapData: CampusMapData,
  buildingPlaceId: string,
): IndoorFootprintProjection | null {
  const feature = mapData.features.find(
    (candidate) =>
      candidate.featureKind === "building" &&
      candidate.placeId === buildingPlaceId &&
      isCampusMapBuildingGeometry(candidate.geometry),
  );
  if (!feature || !isCampusMapBuildingGeometry(feature.geometry)) return null;

  try {
    return projectBuildingFootprint(feature.geometry);
  } catch {
    return null;
  }
}

function documentForFootprint(
  record: CampusIndoorMapEditorRecord,
  footprint: IndoorFootprintProjection | null,
): CampusIndoorDocument {
  if (!footprint) return record.document;
  if (record.document.levels.length === 0) {
    return createIndoorDocumentForFootprint(footprint);
  }
  return remapIndoorDocumentToFootprint(record.document, footprint);
}

export function IndoorEditor({
  building,
  mapData,
  record,
}: {
  building: CampusMapPlace;
  mapData: CampusMapData;
  record: CampusIndoorMapEditorRecord;
}) {
  const searchParams = useSearchParams();
  const footprint = useMemo(
    () => buildingFootprint(mapData, building.id),
    [building.id, mapData],
  );
  const [state, dispatch] = useReducer(indoorEditorReducer, undefined, () =>
    createIndoorEditorState(
      documentForFootprint(record, footprint),
      record.name,
      footprint,
    ),
  );
  const [section, setSection] = useState<EditorSection>(() =>
    editorSectionFromSearch(searchParams.get("tab")),
  );
  const [tool, setTool] = useState<IndoorTool>("select");
  const [savedRecord, setSavedRecord] = useState(record);
  const [savingStatus, setSavingStatus] = useState<
    "draft" | "published" | null
  >(null);
  const [notice, setNotice] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const unsavedNavigation = useUnsavedNavigation(state.dirty);

  const { document } = state;
  const level =
    document.levels.find((candidate) => candidate.id === state.levelId) ??
    document.levels[0];
  const showingAllFloors = section === "floors" || section === "preview";
  const editingEnabled = section === "floor-plan" || section === "routes";
  const authoredRouteEdgeIds = useMemo(
    () => indoorAuthoredRouteEdgeIds(document),
    [document],
  );

  const signature = routingSignature(document);
  const routedDocument = useMemo(
    () => {
      try {
        return buildIndoorRouteGraph(document);
      } catch {
        return document;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );

  const scene = useMemo(
    () =>
      footprint
        ? buildIndoorScene(routedDocument, footprint, {
            explode: showingAllFloors ? 2.25 : 1,
            activeLevelId: level?.id ?? null,
            showInactiveLevels: showingAllFloors,
            routeEdgeIds: authoredRouteEdgeIds,
            highlightSpaceIds:
              state.selection?.kind === "space"
                ? new Set([state.selection.id])
                : undefined,
          })
        : null,
    [
      authoredRouteEdgeIds,
      footprint,
      level?.id,
      routedDocument,
      showingAllFloors,
      state.selection,
    ],
  );

  const pointer = useEditorPointer({
    document,
    routedDocument,
    footprint,
    level,
    tool,
    selection: state.selection,
    editingEnabled,
    dispatch,
    onToolDone: () => setTool("select"),
  });
  const cancelPointer = pointer.cancel;

  useEffect(() => {
    const syncSectionFromHistory = () => {
      cancelPointer();
      setTool("select");
      dispatch({ type: "select", selection: null });
      setSection(
        editorSectionFromSearch(
          new URL(window.location.href).searchParams.get("tab"),
        ),
      );
    };
    window.addEventListener("popstate", syncSectionFromHistory);
    return () => window.removeEventListener("popstate", syncSectionFromHistory);
  }, [cancelPointer]);

  const roomsWithoutDoors = useMemo(() => {
    const served = new Set(
      document.walls.flatMap((wall) =>
        wall.openings.flatMap((opening) =>
          opening.spaceId ? [opening.spaceId] : [],
        ),
      ),
    );
    return document.spaces.filter(
      (space) =>
        space.kind === "room" && space.searchable && !served.has(space.id),
    ).length;
  }, [document.spaces, document.walls]);

  const hasEntrance = document.walls.some((wall) =>
    wall.openings.some((opening) => opening.exterior),
  );
  const publishBlocked =
    document.levels.length === 0
      ? "Add a floor before publishing."
      : !hasEntrance
        ? "Add a door on an outside wall so people can be routed in."
        : null;

  function selectSection(nextSection: EditorSection) {
    pointer.cancel();
    setTool("select");
    dispatch({ type: "select", selection: null });
    setSection(nextSection);
    const url = new URL(window.location.href);
    if (nextSection === "floors") url.searchParams.delete("tab");
    else url.searchParams.set("tab", nextSection);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function selectLevel(levelId: string) {
    pointer.cancel();
    setTool("select");
    dispatch({ type: "level/select", levelId });
  }

  async function save(status: "draft" | "published", name: string) {
    setSavingStatus(status);
    setNotice(null);
    if (name !== state.name) dispatch({ type: "map/rename", name });
    const sourceDocument = document;
    const sourceName = name;
    try {
      const saved = buildIndoorRouteGraph(sourceDocument);
      const result = await saveCampusIndoorMap({
        buildingPlaceId: building.id,
        name,
        document: saved,
        revision: savedRecord.revision,
        status,
      });
      setNotice({ ok: result.ok, message: result.message });
      if (result.ok) {
        setSavedRecord((current) => ({
          ...current,
          name,
          status,
          revision: result.revision,
          updatedAt: new Date().toISOString(),
        }));
        dispatch({
          type: "saved",
          document: saved,
          name,
          sourceDocument,
          sourceName,
        });
      }
    } catch (error) {
      setNotice({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "This floor plan could not be saved.",
      });
    } finally {
      setSavingStatus(null);
    }
  }

  const selectionHandlers: SelectionDetailsHandlers = {
    updateSpace: (id, patch) => dispatch({ type: "space/update", id, patch }),
    updateWall: (id, patch) => dispatch({ type: "wall/update", id, patch }),
    updateOpening: (id, patch) =>
      dispatch({ type: "opening/update", id, patch }),
    updateConnector: (id, patch) =>
      dispatch({ type: "connector/update", id, patch }),
    remove: () => dispatch({ type: "delete" }),
  };

  function selectionDetails() {
    return (
      <SelectionDetailsSheet
        document={document}
        handlers={selectionHandlers}
        selection={state.selection}
      />
    );
  }

  function mapSurface({
    perspective,
    editable,
  }: {
    perspective: boolean;
    editable: boolean;
  }) {
    if (!level || !footprint) {
      return (
        <div className="grid min-h-[28rem] flex-1 place-items-center p-6 text-center">
          <p className="text-sm text-zinc-600">
            Add a floor to start drawing this building.
          </p>
        </div>
      );
    }

    return (
      <div className="relative h-[65vh] min-h-[28rem] flex-1 p-2 lg:h-auto lg:min-h-0">
        <IndoorMapSurface
          centre={building.coordinates}
          className="h-full min-h-[28rem]"
          draft={editable ? pointer.drag : null}
          drawing={editable && tool !== "select"}
          frameOutline={level.outline}
          onKeyDown={editable ? pointer.onKeyDown : undefined}
          onScaleChange={editable ? pointer.onUnitsPerPixel : undefined}
          onWorldDoubleClick={editable ? pointer.onDoubleClick : undefined}
          onWorldPointerDown={editable ? pointer.onPointerDown : undefined}
          onWorldPointerMove={editable ? pointer.onPointerMove : undefined}
          onPick={editable ? pointer.onSelect : undefined}
          onWorldPointerUp={editable ? pointer.onPointerUp : undefined}
          perspective={perspective}
          projection={footprint}
          scene={scene}
        />
        {editable && pointer.boundaryMessage ? (
          <p
            className="absolute bottom-5 left-5 max-w-sm rounded-lg border border-rose-200 bg-white/95 px-3 py-2 text-xs font-medium text-rose-700 shadow-sm"
            role="status"
          >
            {pointer.boundaryMessage}
          </p>
        ) : null}
      </div>
    );
  }

  function workspaceToolbar({
    tools,
    label,
  }: {
    tools: readonly IndoorTool[];
    label: string;
  }) {
    return (
      <div className="flex flex-col border-b border-zinc-200 bg-white xl:flex-row xl:items-center">
        <div className="shrink-0 p-2 xl:border-r xl:border-zinc-200">
          <FloorSelect
            levels={document.levels}
            onChange={selectLevel}
            value={level?.id ?? ""}
          />
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto border-t border-zinc-100 xl:border-t-0">
          <ToolPalette
            disabled={!level}
            label={label}
            onSelect={(nextTool) => {
              pointer.cancel();
              setTool(nextTool);
            }}
            tool={tool}
            tools={tools}
          />
        </div>
        {state.selection ? (
          <div className="shrink-0 border-t border-zinc-100 p-2 xl:border-t-0 xl:border-l xl:border-zinc-200">
            {selectionDetails()}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Tabs
      className="gap-0"
      onValueChange={(value) => selectSection(value as EditorSection)}
      value={section}
    >
      <AppShell
        actions={
          <EditorActions
            canRedo={state.future.length > 0}
            canUndo={state.past.length > 0}
            currentStatus={
              savedRecord.status === "published" ? "published" : "draft"
            }
            name={state.name}
            onRedo={() => dispatch({ type: "redo" })}
            onSave={(status, name) => void save(status, name)}
            onUndo={() => dispatch({ type: "undo" })}
            publishBlocked={publishBlocked}
            savingStatus={savingStatus}
          />
        }
        admin
        currentBreadcrumbLabel={building.name}
        fullBleed
        tabs={<EditorSectionTabs />}
      >
        <h1 className="sr-only">{building.name} floor plan</h1>
        <ConfirmDialog
          confirmLabel="Leave page"
          description="Your unsaved indoor map changes will be lost."
          destructive
          onConfirm={unsavedNavigation.confirmNavigation}
          onOpenChange={(open) => {
            if (!open) unsavedNavigation.cancelNavigation();
          }}
          open={unsavedNavigation.navigationPending}
          title="Leave without saving?"
        />
        <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col bg-zinc-100 lg:h-[calc(100dvh-6.5rem)] lg:min-h-0">
          {notice ? (
            <Alert
              className="mx-3 mt-2 shrink-0"
              role="status"
              tone={notice.ok ? "success" : "danger"}
            >
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="min-h-0 flex-1">
            <TabsContent className="mt-0 h-full" value="floors">
              <div className="grid min-h-full lg:h-full lg:min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
                <FloorsPanel
                  activeLevelId={state.levelId}
                  levels={document.levels}
                  onAdd={() => dispatch({ type: "level/add" })}
                  onRemove={(levelId) =>
                    dispatch({ type: "level/remove", levelId })
                  }
                  onSelect={selectLevel}
                  onUpdate={(levelId, patch) =>
                    dispatch({ type: "level/update", levelId, patch })
                  }
                />
                <section className="flex min-h-0 flex-col bg-zinc-100">
                  {mapSurface({ perspective: true, editable: false })}
                </section>
              </div>
            </TabsContent>

            <TabsContent className="mt-0 h-full" value="floor-plan">
              <section className="flex h-full min-h-0 flex-col">
                {workspaceToolbar({
                  tools: FLOOR_PLAN_TOOLS,
                  label: "Floor plan tools",
                })}
                {mapSurface({ perspective: false, editable: true })}
              </section>
            </TabsContent>

            <TabsContent className="mt-0 h-full" value="routes">
              <section className="flex h-full min-h-0 flex-col">
                {workspaceToolbar({
                  tools: ROUTE_TOOLS,
                  label: "Entrance and route tools",
                })}
                {publishBlocked || roomsWithoutDoors > 0 ? (
                  <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                    role="status"
                  >
                    {publishBlocked ? <span>{publishBlocked}</span> : null}
                    {roomsWithoutDoors > 0 ? (
                      <span>
                        {roomsWithoutDoors}{" "}
                        {roomsWithoutDoors === 1
                          ? "findable room needs"
                          : "findable rooms need"}{" "}
                        a linked door.
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {mapSurface({ perspective: false, editable: true })}
              </section>
            </TabsContent>

            <TabsContent className="mt-0 h-full" value="preview">
              <section className="flex h-full min-h-0 flex-col">
                {level ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-zinc-950">
                        Whole-building preview
                      </p>
                      <p className="text-xs text-zinc-500">
                        Every floor is visible; choose which floor to emphasise.
                      </p>
                    </div>
                    <FloorSelect
                      label="Emphasise"
                      levels={document.levels}
                      onChange={selectLevel}
                      value={level.id}
                    />
                  </div>
                ) : null}
                {mapSurface({ perspective: true, editable: false })}
              </section>
            </TabsContent>
          </div>
        </div>
      </AppShell>
    </Tabs>
  );
}
