"use client";

import {
  Circle,
  Layers3,
  LoaderCircle,
  MousePointer2,
  Pentagon,
  Plus,
  Route,
  Save,
  Send,
  Square,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { CampusMap } from "@/components/rooms/campus-map";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { FilterBar } from "@/components/ui/filter-bar";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  saveCampusIndoorMap,
  type CampusIndoorMapEditorRecord,
} from "@/lib/rooms/indoor-map-admin";
import {
  buildIndoorRouteGraph,
  createEmptyCampusIndoorDocument,
  isValidIndoorPolygonPoints,
  type CampusIndoorDocument,
  type IndoorPoint,
} from "@/lib/rooms/indoor-map";
import type { CampusMapData, CampusMapPlace } from "@/lib/rooms/campus-map";

type IndoorLevel = CampusIndoorDocument["levels"][number];
type IndoorSpace = CampusIndoorDocument["spaces"][number];
type IndoorConnector = CampusIndoorDocument["connectors"][number];
type EditorPoint = IndoorPoint;

type DrawingTool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "polygon-room"
  | "polygon-corridor"
  | "stairs"
  | "lift";

type SelectedShape =
  | Readonly<{ kind: "space"; id: string }>
  | Readonly<{ kind: "connector"; id: string }>
  | null;

type WorkingRecord = Readonly<{
  dirty: boolean;
  record: CampusIndoorMapEditorRecord;
}>;

const BUILDINGS_LAYER_SLUG = "buildings";

const drawingTools: ReadonlyArray<{
  tool: DrawingTool;
  label: string;
  icon: LucideIcon;
}> = [
  { tool: "select", label: "Select", icon: MousePointer2 },
  { tool: "rectangle", label: "Rectangle room", icon: Square },
  { tool: "ellipse", label: "Round room", icon: Circle },
  { tool: "polygon-room", label: "Polygon room", icon: Pentagon },
  { tool: "polygon-corridor", label: "Polygon corridor", icon: Route },
  { tool: "stairs", label: "Stairs", icon: Layers3 },
  { tool: "lift", label: "Lift", icon: Square },
];

const connectorAccessibilityOptions: Array<{
  value: IndoorConnector["accessibility"];
  label: string;
}> = [
  { value: "unknown", label: "Unverified" },
  { value: "accessible", label: "Accessible" },
  { value: "inaccessible", label: "Not accessible" },
];

function editorId() {
  return globalThis.crypto.randomUUID();
}

function matchesBuilding(place: CampusMapPlace, query: string) {
  const terms = query
    .trim()
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return true;

  const searchable = [place.name, place.address, ...place.searchTerms]
    .join(" ")
    .toLocaleLowerCase("en-AU");
  return terms.every((term) => searchable.includes(term));
}

function newWorkingRecord(
  place: CampusMapPlace,
  saved: CampusIndoorMapEditorRecord | undefined,
): WorkingRecord {
  return {
    dirty: false,
    record:
      saved ??
      ({
        id: null,
        buildingPlaceId: place.id,
        name: `${place.name} indoor map`,
        status: "draft",
        revision: 0,
        document: createEmptyCampusIndoorDocument(),
        updatedAt: null,
      } satisfies CampusIndoorMapEditorRecord),
  };
}

function outlineForDocument(document: CampusIndoorDocument) {
  const inset = Math.max(
    24,
    Math.min(document.viewBox.width, document.viewBox.height) * 0.07,
  );
  return [
    { x: inset, y: inset },
    { x: document.viewBox.width - inset, y: inset },
    {
      x: document.viewBox.width - inset,
      y: document.viewBox.height - inset,
    },
    { x: inset, y: document.viewBox.height - inset },
  ] satisfies EditorPoint[];
}

function pointsAttribute(points: readonly EditorPoint[]) {
  return points.map(({ x, y }) => `${x},${y}`).join(" ");
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved previously";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusTone(status: CampusIndoorMapEditorRecord["status"]) {
  if (status === "published") return "success" as const;
  if (status === "archived") return "neutral" as const;
  return "warning" as const;
}

export function IndoorMapEditor({
  mapData,
  indoorMaps,
}: {
  mapData: CampusMapData;
  indoorMaps: readonly CampusIndoorMapEditorRecord[];
}) {
  const buildings = useMemo(
    () =>
      mapData.places
        .filter((place) => place.mapDisplayKind === "building")
        .toSorted((left, right) => left.name.localeCompare(right.name)),
    [mapData.places],
  );
  const savedByBuilding = useMemo(
    () => new Map(indoorMaps.map((record) => [record.buildingPlaceId, record])),
    [indoorMaps],
  );
  const defaultBuilding =
    buildings.find((building) => /\bcopland\b/iu.test(building.name)) ??
    buildings[0];
  const [query, setQuery] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    defaultBuilding?.id ?? "",
  );
  const [workingByBuilding, setWorkingByBuilding] = useState<
    Record<string, WorkingRecord>
  >(() =>
    defaultBuilding
      ? {
          [defaultBuilding.id]: newWorkingRecord(
            defaultBuilding,
            savedByBuilding.get(defaultBuilding.id),
          ),
        }
      : {},
  );
  const [activeLevelId, setActiveLevelId] = useState(
    defaultBuilding
      ? (workingByBuilding[defaultBuilding.id]?.record.document.levels[0]?.id ??
          "")
      : "",
  );
  const [tool, setTool] = useState<DrawingTool>("select");
  const [selectedShape, setSelectedShape] = useState<SelectedShape>(null);
  const [polygonPoints, setPolygonPoints] = useState<EditorPoint[]>([]);
  const polygonPointsRef = useRef<EditorPoint[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const svgImportRef = useRef<HTMLInputElement>(null);
  const [savingStatus, setSavingStatus] = useState<
    "draft" | "published" | null
  >(null);
  const [notice, setNotice] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const selectedBuilding = buildings.find(
    (building) => building.id === selectedBuildingId,
  );
  const working = selectedBuildingId
    ? workingByBuilding[selectedBuildingId]
    : undefined;
  const record = working?.record;
  const document = record?.document;
  const activeLevel =
    document?.levels.find((level) => level.id === activeLevelId) ??
    document?.levels[0];
  const selectedSpace =
    selectedShape?.kind === "space"
      ? document?.spaces.find((space) => space.id === selectedShape.id)
      : undefined;
  const selectedConnector =
    selectedShape?.kind === "connector"
      ? document?.connectors.find(
          (connector) => connector.id === selectedShape.id,
        )
      : undefined;
  const visibleBuildings = buildings.filter((building) =>
    matchesBuilding(building, query),
  );
  const visibleLayerSlugs = useMemo(() => new Set([BUILDINGS_LAYER_SLUG]), []);
  const selectedBuildingFeatures = useMemo(
    () =>
      mapData.features.filter(
        (feature) =>
          feature.featureKind === "building" &&
          feature.placeId === selectedBuildingId,
      ),
    [mapData.features, selectedBuildingId],
  );
  const primarySaveStatus =
    record?.status === "published" ? "published" : "draft";

  function chooseBuilding(buildingPlaceId: string) {
    const building = buildings.find((place) => place.id === buildingPlaceId);
    if (!building) return;
    setWorkingByBuilding((current) =>
      current[buildingPlaceId]
        ? current
        : {
            ...current,
            [buildingPlaceId]: newWorkingRecord(
              building,
              savedByBuilding.get(buildingPlaceId),
            ),
          },
    );
    const source =
      workingByBuilding[buildingPlaceId] ??
      newWorkingRecord(building, savedByBuilding.get(buildingPlaceId));
    setSelectedBuildingId(buildingPlaceId);
    setActiveLevelId(source.record.document.levels[0]?.id ?? "");
    setSelectedShape(null);
    cancelPolygon();
    setNotice(null);
  }

  function updateRecord(
    update: (
      current: CampusIndoorMapEditorRecord,
    ) => CampusIndoorMapEditorRecord,
  ) {
    if (!selectedBuildingId) return;
    setWorkingByBuilding((current) => {
      const selected = current[selectedBuildingId];
      if (!selected) return current;
      return {
        ...current,
        [selectedBuildingId]: {
          dirty: true,
          record: update(selected.record),
        },
      };
    });
    setNotice(null);
  }

  function updateDocument(
    update: (current: CampusIndoorDocument) => CampusIndoorDocument,
  ) {
    updateRecord((current) => ({
      ...current,
      document: update(current.document),
    }));
  }

  function addLevel() {
    if (!document) return;
    const nextNumber =
      Math.max(-1, ...document.levels.map((level) => level.number)) + 1;
    const id = editorId();
    const level: IndoorLevel = {
      id,
      number: nextNumber,
      ref: nextNumber === 0 ? "G" : String(nextNumber),
      name: nextNumber === 0 ? "Ground floor" : `Level ${nextNumber}`,
      elevationMetres: nextNumber * 3.6,
      heightMetres: 3.6,
      outline: activeLevel?.outline ?? outlineForDocument(document),
    };
    updateDocument((current) => ({
      ...current,
      levels: [...current.levels, level],
      routeNodes: [],
      routeEdges: [],
    }));
    setActiveLevelId(id);
    setSelectedShape(null);
  }

  function removeActiveLevel() {
    if (!document || !activeLevel) return;
    const remainingLevels = document.levels.filter(
      (level) => level.id !== activeLevel.id,
    );
    updateDocument((current) => ({
      ...current,
      levels: remainingLevels,
      spaces: current.spaces.filter(
        (space) => space.levelId !== activeLevel.id,
      ),
      connectors: current.connectors.flatMap((connector) => {
        const levelIds = connector.levelIds.filter(
          (levelId) => levelId !== activeLevel.id,
        );
        return levelIds.length > 0 ? [{ ...connector, levelIds }] : [];
      }),
      routeNodes: [],
      routeEdges: [],
    }));
    setActiveLevelId(remainingLevels[0]?.id ?? "");
    setSelectedShape(null);
    cancelPolygon();
  }

  function localPoint(event: MouseEvent<SVGSVGElement>): EditorPoint | null {
    const svg = svgRef.current;
    if (!svg || !document) return null;
    const bounds = svg.getBoundingClientRect();
    return {
      x: Math.round(
        clamp(
          ((event.clientX - bounds.left) / bounds.width) *
            document.viewBox.width,
          0,
          document.viewBox.width,
        ),
      ),
      y: Math.round(
        clamp(
          ((event.clientY - bounds.top) / bounds.height) *
            document.viewBox.height,
          0,
          document.viewBox.height,
        ),
      ),
    };
  }

  function addSpace(
    kind: IndoorSpace["kind"],
    geometry: IndoorSpace["geometry"],
  ) {
    if (!activeLevel) return;
    const id = editorId();
    const isCorridor = kind === "corridor";
    const space: IndoorSpace = {
      id,
      levelId: activeLevel.id,
      kind,
      ref: "",
      name: isCorridor ? "New corridor" : "New room",
      searchable: !isCorridor,
      geometry,
    };
    updateDocument((current) => ({
      ...current,
      spaces: [...current.spaces, space],
      routeNodes: [],
      routeEdges: [],
    }));
    setSelectedShape({ kind: "space", id });
    setTool("select");
  }

  function addConnector(kind: IndoorConnector["kind"], point: EditorPoint) {
    if (!document || !activeLevel) return;
    const id = editorId();
    const connector: IndoorConnector = {
      id,
      kind,
      name: kind === "stairs" ? "New stairs" : "New lift",
      levelIds: document.levels.map((level) => level.id),
      position: point,
      accessibility: kind === "lift" ? "unknown" : "inaccessible",
    };
    updateDocument((current) => ({
      ...current,
      connectors: [...current.connectors, connector],
      routeNodes: [],
      routeEdges: [],
    }));
    setSelectedShape({ kind: "connector", id });
    setTool("select");
  }

  function cancelPolygon() {
    polygonPointsRef.current = [];
    setPolygonPoints([]);
  }

  function finishPolygon(points = polygonPointsRef.current) {
    if (points.length < 3) return;
    addSpace(tool === "polygon-corridor" ? "corridor" : "room", {
      type: "polygon",
      points,
    });
    cancelPolygon();
  }

  function selectTool(nextTool: DrawingTool) {
    setTool(nextTool);
    setSelectedShape(null);
    cancelPolygon();
    svgRef.current?.focus();
  }

  function handleCanvasClick(event: MouseEvent<SVGSVGElement>) {
    if (!activeLevel || !document) return;
    const point = localPoint(event);
    if (!point) return;

    if (tool === "select") {
      setSelectedShape(null);
      return;
    }
    if (tool === "rectangle") {
      const width = Math.min(190, document.viewBox.width * 0.28);
      const height = Math.min(130, document.viewBox.height * 0.24);
      addSpace("room", {
        type: "rectangle",
        x: clamp(point.x - width / 2, 0, document.viewBox.width - width),
        y: clamp(point.y - height / 2, 0, document.viewBox.height - height),
        width,
        height,
        cornerRadius: 10,
      });
      return;
    }
    if (tool === "ellipse") {
      addSpace("room", {
        type: "ellipse",
        cx: point.x,
        cy: point.y,
        rx: Math.min(90, document.viewBox.width * 0.13),
        ry: Math.min(70, document.viewBox.height * 0.13),
      });
      return;
    }
    if (tool === "stairs" || tool === "lift") {
      addConnector(tool, point);
      return;
    }
    if (event.detail > 1) return;
    const next = [...polygonPointsRef.current, point];
    polygonPointsRef.current = next;
    setPolygonPoints(next);
  }

  function handleCanvasDoubleClick(event: MouseEvent<SVGSVGElement>) {
    if (tool !== "polygon-room" && tool !== "polygon-corridor") return;
    event.preventDefault();
    const point = localPoint(event);
    const points = point ? [...polygonPointsRef.current, point] : polygonPoints;
    finishPolygon(points);
  }

  function handleCanvasKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "Escape") {
      cancelPolygon();
      setTool("select");
      return;
    }
    if (
      event.key === "Enter" &&
      (tool === "polygon-room" || tool === "polygon-corridor")
    ) {
      event.preventDefault();
      finishPolygon();
      return;
    }
    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      selectedShape
    ) {
      event.preventDefault();
      deleteSelectedShape();
    }
  }

  function updateSelectedSpace(patch: Partial<IndoorSpace>) {
    if (!selectedSpace) return;
    updateDocument((current) => ({
      ...current,
      spaces: current.spaces.map((space) =>
        space.id === selectedSpace.id ? { ...space, ...patch } : space,
      ),
    }));
  }

  function updateActiveLevel(patch: Partial<IndoorLevel>) {
    if (!activeLevel) return;
    updateDocument((current) => ({
      ...current,
      levels: current.levels.map((level) =>
        level.id === activeLevel.id ? { ...level, ...patch } : level,
      ),
    }));
  }

  function updateSelectedConnector(patch: Partial<IndoorConnector>) {
    if (!selectedConnector) return;
    updateDocument((current) => ({
      ...current,
      connectors: current.connectors.map((connector) =>
        connector.id === selectedConnector.id
          ? { ...connector, ...patch }
          : connector,
      ),
      routeNodes: [],
      routeEdges: [],
    }));
  }

  function deleteSelectedShape() {
    if (!selectedShape) return;
    updateDocument((current) => ({
      ...current,
      spaces:
        selectedShape.kind === "space"
          ? current.spaces.filter((space) => space.id !== selectedShape.id)
          : current.spaces,
      connectors:
        selectedShape.kind === "connector"
          ? current.connectors.filter(
              (connector) => connector.id !== selectedShape.id,
            )
          : current.connectors,
      routeNodes: [],
      routeEdges: [],
    }));
    setSelectedShape(null);
  }

  async function importSvg(file: File | undefined) {
    if (!file || !document || !activeLevel) return;
    if (file.size > 2_000_000) {
      setNotice({ ok: false, message: "Choose an SVG smaller than 2 MB." });
      return;
    }

    try {
      const source = new DOMParser().parseFromString(
        await file.text(),
        "image/svg+xml",
      );
      if (source.querySelector("parsererror")) {
        throw new Error("The SVG could not be parsed.");
      }
      const root = source.documentElement;
      if (root.localName !== "svg") throw new Error("The file is not an SVG.");

      const viewBoxValues = (root.getAttribute("viewBox") ?? "")
        .trim()
        .split(/[\s,]+/u)
        .map(Number);
      const sourceWidth =
        viewBoxValues.length === 4 && viewBoxValues[2] > 0
          ? viewBoxValues[2]
          : Number.parseFloat(root.getAttribute("width") ?? "") ||
            document.viewBox.width;
      const sourceHeight =
        viewBoxValues.length === 4 && viewBoxValues[3] > 0
          ? viewBoxValues[3]
          : Number.parseFloat(root.getAttribute("height") ?? "") ||
            document.viewBox.height;
      const sourceX = viewBoxValues.length === 4 ? viewBoxValues[0] : 0;
      const sourceY = viewBoxValues.length === 4 ? viewBoxValues[1] : 0;
      const scaleX = document.viewBox.width / sourceWidth;
      const scaleY = document.viewBox.height / sourceHeight;
      const point = (x: number, y: number): IndoorPoint => ({
        x: clamp((x - sourceX) * scaleX, 0, document.viewBox.width),
        y: clamp((y - sourceY) * scaleY, 0, document.viewBox.height),
      });

      const importedSpaces: IndoorSpace[] = [];
      let importedOutline: readonly IndoorPoint[] | null = null;
      const elements = Array.from(
        root.querySelectorAll("rect, circle, ellipse, polygon"),
      ).slice(0, 500);

      for (const [index, element] of elements.entries()) {
        const name =
          element.getAttribute("data-name")?.trim() ||
          element.getAttribute("aria-label")?.trim() ||
          element.id.trim() ||
          `Imported room ${index + 1}`;
        const ref = element.getAttribute("data-ref")?.trim() ?? "";
        const dataKind = element.getAttribute("data-kind")?.trim();
        const kind: IndoorSpace["kind"] =
          dataKind === "corridor" ? "corridor" : "room";
        let geometry: IndoorSpace["geometry"] | null = null;

        if (element.localName === "rect") {
          const x = Number(element.getAttribute("x") ?? 0);
          const y = Number(element.getAttribute("y") ?? 0);
          const width = Number(element.getAttribute("width"));
          const height = Number(element.getAttribute("height"));
          if (![x, y, width, height].every(Number.isFinite)) continue;
          if (width <= 0 || height <= 0) continue;
          const topLeft = point(x, y);
          const bottomRight = point(x + width, y + height);
          const scaledWidth = bottomRight.x - topLeft.x;
          const scaledHeight = bottomRight.y - topLeft.y;
          if (scaledWidth <= 0 || scaledHeight <= 0) continue;
          geometry = {
            type: "rectangle",
            x: topLeft.x,
            y: topLeft.y,
            width: scaledWidth,
            height: scaledHeight,
            cornerRadius: Math.min(
              Math.max(0, Number(element.getAttribute("rx") ?? 0) * scaleX),
              scaledWidth / 2,
              scaledHeight / 2,
            ),
          };
        } else if (
          element.localName === "circle" ||
          element.localName === "ellipse"
        ) {
          const cx = Number(element.getAttribute("cx") ?? 0);
          const cy = Number(element.getAttribute("cy") ?? 0);
          const rx = Number(
            element.getAttribute(element.localName === "circle" ? "r" : "rx"),
          );
          const ry = Number(
            element.getAttribute(element.localName === "circle" ? "r" : "ry"),
          );
          if (![cx, cy, rx, ry].every(Number.isFinite)) continue;
          const centre = point(cx, cy);
          const scaledRx = Math.min(
            rx * scaleX,
            centre.x,
            document.viewBox.width - centre.x,
          );
          const scaledRy = Math.min(
            ry * scaleY,
            centre.y,
            document.viewBox.height - centre.y,
          );
          if (scaledRx <= 0 || scaledRy <= 0) continue;
          geometry = {
            type: "ellipse",
            cx: centre.x,
            cy: centre.y,
            rx: scaledRx,
            ry: scaledRy,
          };
        } else {
          const numbers = (element.getAttribute("points") ?? "")
            .trim()
            .split(/[\s,]+/u)
            .map(Number);
          if (numbers.length < 6 || numbers.length % 2 !== 0) continue;
          const points: IndoorPoint[] = [];
          for (let offset = 0; offset < numbers.length; offset += 2) {
            if (
              !Number.isFinite(numbers[offset]) ||
              !Number.isFinite(numbers[offset + 1])
            ) {
              points.length = 0;
              break;
            }
            points.push(point(numbers[offset], numbers[offset + 1]));
          }
          if (!isValidIndoorPolygonPoints(points)) continue;
          if (dataKind === "outline") {
            importedOutline = points;
            continue;
          }
          geometry = { type: "polygon", points };
        }

        if (!geometry) continue;
        importedSpaces.push({
          id: editorId(),
          levelId: activeLevel.id,
          kind,
          ref,
          name,
          searchable: kind === "room",
          geometry,
        });
      }

      if (importedSpaces.length === 0 && !importedOutline) {
        throw new Error(
          "No supported rect, circle, ellipse or polygon shapes were found.",
        );
      }
      updateDocument((current) => ({
        ...current,
        levels: importedOutline
          ? current.levels.map((level) =>
              level.id === activeLevel.id
                ? { ...level, outline: importedOutline! }
                : level,
            )
          : current.levels,
        spaces: [...current.spaces, ...importedSpaces],
        routeNodes: [],
        routeEdges: [],
      }));
      setNotice({
        ok: true,
        message: `Imported ${importedSpaces.length} floor shape${importedSpaces.length === 1 ? "" : "s"}${importedOutline ? " and the floor outline" : ""}.`,
      });
    } catch (error) {
      setNotice({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "The SVG could not be imported.",
      });
    } finally {
      if (svgImportRef.current) svgImportRef.current.value = "";
    }
  }

  async function save(status: "draft" | "published") {
    if (!record || !selectedBuilding) return;
    setSavingStatus(status);
    setNotice(null);
    try {
      const routedDocument = buildIndoorRouteGraph(record.document);
      const result = await saveCampusIndoorMap({
        buildingPlaceId: record.buildingPlaceId,
        name: record.name,
        document: routedDocument,
        revision: record.revision,
        status,
      });
      setNotice({ ok: result.ok, message: result.message });
      if (result.ok) {
        setWorkingByBuilding((current) => {
          const selected = current[selectedBuilding.id];
          if (!selected) return current;
          const editedWhileSaving = selected.record !== record;
          return {
            ...current,
            [selectedBuilding.id]: {
              dirty: editedWhileSaving,
              record: {
                ...selected.record,
                document: editedWhileSaving
                  ? selected.record.document
                  : routedDocument,
                revision: result.revision,
                status,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      }
    } catch {
      setNotice({
        ok: false,
        message: "The indoor map could not be saved.",
      });
    } finally {
      setSavingStatus(null);
    }
  }

  if (!selectedBuilding || !record || !document) {
    return (
      <div className="grid min-h-[calc(100dvh-4rem)] place-items-center p-6">
        <p className="text-sm text-zinc-600">
          No published ANU buildings are available to map.
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] bg-zinc-100 lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-zinc-200 bg-white lg:border-r lg:border-b-0">
        <div className="border-b border-zinc-200 p-3">
          <FilterBar
            searchPlaceholder="Search published ANU buildings"
            state={{
              query,
              values: {},
              onQueryChange: setQuery,
              onFilterChange: () => undefined,
            }}
          />
          <p className="mt-2 text-xs text-zinc-500" role="status">
            {visibleBuildings.length} building
            {visibleBuildings.length === 1 ? "" : "s"}
          </p>
        </div>
        <nav
          aria-label="Published ANU buildings"
          className="max-h-72 flex-1 overflow-y-auto p-2 lg:max-h-none"
        >
          <ul className="space-y-0.5">
            {visibleBuildings.map((building) => {
              const saved = savedByBuilding.get(building.id);
              const candidate = workingByBuilding[building.id];
              const selected = building.id === selectedBuilding.id;
              return (
                <li key={building.id}>
                  <button
                    aria-current={selected ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-400",
                      selected && "bg-brand-50 text-brand-800",
                    )}
                    onClick={() => chooseBuilding(building.id)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {building.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                        {building.address}
                      </span>
                    </span>
                    {candidate?.dirty ? (
                      <span className="size-2 shrink-0 rounded-full bg-amber-500">
                        <span className="sr-only">Unsaved changes</span>
                      </span>
                    ) : saved ? (
                      <span
                        aria-label={`${saved.status} indoor map`}
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          saved.status === "published"
                            ? "bg-emerald-500"
                            : "bg-zinc-400",
                        )}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="min-w-0 overflow-y-auto p-3 sm:p-4">
        <div className="mx-auto max-w-[110rem] space-y-3">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-xs">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-zinc-950">
                  {selectedBuilding.name}
                </h2>
                <Badge tone={statusTone(record.status)}>{record.status}</Badge>
                {working.dirty ? (
                  <Badge tone="warning">Unsaved changes</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Revision {record.revision} · {formatUpdatedAt(record.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={savingStatus !== null}
                onClick={() => void save(primarySaveStatus)}
                size="sm"
              >
                {savingStatus === primarySaveStatus ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {record.status === "published" ? "Save changes" : "Save draft"}
              </Button>
              <Button
                disabled={savingStatus !== null || document.levels.length === 0}
                onClick={() => void save("published")}
                size="sm"
                variant="primary"
              >
                {savingStatus === "published" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Send aria-hidden="true" />
                )}
                Publish
              </Button>
            </div>
          </header>

          {notice ? (
            <Alert role="status" tone={notice.ok ? "success" : "danger"}>
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          ) : null}

          <section
            aria-label="Selected building map preview"
            className="h-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs sm:h-64"
          >
            <CampusMap
              campus={mapData.campus}
              features={selectedBuildingFeatures}
              layers={mapData.layers}
              onClearSelection={() => undefined}
              onSelect={() => undefined}
              places={[selectedBuilding]}
              route={null}
              routeEndpoints={null}
              selectedSlug={selectedBuilding.slug}
              visibleLayerSlugs={visibleLayerSlugs}
            />
          </section>

          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_19rem]">
            <section className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5">
                <div
                  aria-label="Building levels"
                  className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
                  role="tablist"
                >
                  {document.levels.map((level) => (
                    <button
                      aria-selected={level.id === activeLevelId}
                      className={cn(
                        "min-h-9 shrink-0 rounded-md px-3 text-xs font-medium outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-400",
                        level.id === activeLevelId &&
                          "bg-brand-50 text-brand-700",
                      )}
                      key={level.id}
                      onClick={() => {
                        setActiveLevelId(level.id);
                        setSelectedShape(null);
                        cancelPolygon();
                      }}
                      role="tab"
                      type="button"
                    >
                      {level.ref || level.name}
                    </button>
                  ))}
                  <IconButton
                    label="Add level"
                    onClick={addLevel}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Plus aria-hidden="true" />
                  </IconButton>
                </div>
                <IconButton
                  disabled={!activeLevel}
                  label="Remove selected level"
                  onClick={removeActiveLevel}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" />
                </IconButton>
              </div>

              <div
                aria-label="Floor plan drawing tools"
                className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-50 p-2"
                role="toolbar"
              >
                {drawingTools.map(({ tool: candidate, label, icon: Icon }) => (
                  <Button
                    aria-pressed={tool === candidate}
                    className="shrink-0"
                    disabled={!activeLevel}
                    key={candidate}
                    onClick={() => selectTool(candidate)}
                    size="sm"
                    variant={tool === candidate ? "subtle" : "ghost"}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </Button>
                ))}
                <input
                  ref={svgImportRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="sr-only"
                  aria-label="Import SVG floor map"
                  onChange={(event) =>
                    void importSvg(event.currentTarget.files?.[0])
                  }
                />
                <Button
                  className="shrink-0"
                  disabled={!activeLevel}
                  onClick={() => svgImportRef.current?.click()}
                  size="sm"
                  variant="ghost"
                >
                  <Upload aria-hidden="true" />
                  Import SVG
                </Button>
              </div>

              {activeLevel ? (
                <div className="bg-zinc-100 p-2 sm:p-3">
                  <svg
                    aria-label={`${activeLevel.name} SVG floor editor`}
                    className="aspect-[10/7] max-h-[46rem] w-full touch-none rounded-md border border-zinc-300 bg-white shadow-inner outline-none focus-visible:ring-3 focus-visible:ring-brand-400/40"
                    onClick={handleCanvasClick}
                    onDoubleClick={handleCanvasDoubleClick}
                    onKeyDown={handleCanvasKeyDown}
                    ref={svgRef}
                    role="application"
                    tabIndex={0}
                    viewBox={`0 0 ${document.viewBox.width} ${document.viewBox.height}`}
                  >
                    <polygon
                      fill="#fafafa"
                      points={pointsAttribute(activeLevel.outline)}
                      stroke="#71717a"
                      strokeLinejoin="round"
                      strokeWidth="5"
                    />

                    {document.spaces
                      .filter((space) => space.levelId === activeLevel.id)
                      .map((space) => {
                        const isSelected = selectedSpace?.id === space.id;
                        const common = {
                          fill:
                            space.kind === "corridor" ? "#dbeafe" : "#ede9fe",
                          stroke: isSelected ? "#7c3aed" : "#71717a",
                          strokeWidth: isSelected ? 6 : 3,
                        };
                        return (
                          <g
                            aria-label={`${space.kind}: ${space.name}`}
                            className="cursor-pointer outline-none focus-visible:[&>*]:stroke-brand-500"
                            key={space.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedShape({ kind: "space", id: space.id });
                              setTool("select");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedShape({
                                  kind: "space",
                                  id: space.id,
                                });
                                setTool("select");
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {space.geometry.type === "rectangle" ? (
                              <rect
                                {...common}
                                height={space.geometry.height}
                                rx={space.geometry.cornerRadius}
                                width={space.geometry.width}
                                x={space.geometry.x}
                                y={space.geometry.y}
                              />
                            ) : space.geometry.type === "ellipse" ? (
                              <ellipse
                                {...common}
                                cx={space.geometry.cx}
                                cy={space.geometry.cy}
                                rx={space.geometry.rx}
                                ry={space.geometry.ry}
                              />
                            ) : (
                              <polygon
                                {...common}
                                points={pointsAttribute(space.geometry.points)}
                                strokeLinejoin="round"
                              />
                            )}
                          </g>
                        );
                      })}

                    {document.connectors
                      .filter((connector) =>
                        connector.levelIds.includes(activeLevel.id),
                      )
                      .map((connector) => {
                        const isSelected =
                          selectedConnector?.id === connector.id;
                        return (
                          <g
                            aria-label={`${connector.kind}: ${connector.name}`}
                            className="cursor-pointer outline-none"
                            key={connector.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedShape({
                                kind: "connector",
                                id: connector.id,
                              });
                              setTool("select");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedShape({
                                  kind: "connector",
                                  id: connector.id,
                                });
                                setTool("select");
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            transform={`translate(${connector.position.x} ${connector.position.y})`}
                          >
                            <rect
                              fill={
                                connector.kind === "lift"
                                  ? "#d1fae5"
                                  : "#fef3c7"
                              }
                              height="58"
                              rx="10"
                              stroke={isSelected ? "#7c3aed" : "#52525b"}
                              strokeWidth={isSelected ? "6" : "3"}
                              width="58"
                              x="-29"
                              y="-29"
                            />
                            <text
                              dominantBaseline="central"
                              fill="#27272a"
                              fontSize="18"
                              fontWeight="700"
                              textAnchor="middle"
                            >
                              {connector.kind === "lift" ? "L" : "S"}
                            </text>
                          </g>
                        );
                      })}

                    {polygonPoints.length > 0 ? (
                      <polyline
                        fill="none"
                        points={pointsAttribute(polygonPoints)}
                        stroke="#7c3aed"
                        strokeDasharray="10 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="5"
                      />
                    ) : null}
                    {polygonPoints.map(({ x, y }, index) => (
                      <circle
                        cx={x}
                        cy={y}
                        fill="#7c3aed"
                        key={`${x}-${y}-${index}`}
                        r="7"
                      />
                    ))}
                  </svg>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Choose a tool, then click the floor plan. Finish polygons
                    with Enter or a double-click. Escape cancels drawing; Delete
                    removes the selected shape.
                  </p>
                </div>
              ) : (
                <div className="grid min-h-72 place-items-center p-6 text-center">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">
                      No levels yet
                    </p>
                    <Button className="mt-3" onClick={addLevel} size="sm">
                      <Plus aria-hidden="true" />
                      Add first level
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <aside className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs">
              <h3 className="text-sm font-semibold text-zinc-950">
                Properties
              </h3>
              <div className="mt-4 space-y-4">
                <Field label="Indoor map name">
                  <Input
                    onChange={(event) =>
                      updateRecord((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    value={record.name}
                  />
                </Field>

                {activeLevel ? (
                  <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold text-zinc-800">
                      Level settings
                    </p>
                    <Field label="Level name">
                      <Input
                        onChange={(event) =>
                          updateActiveLevel({ name: event.target.value })
                        }
                        value={activeLevel.name}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Reference">
                        <Input
                          onChange={(event) =>
                            updateActiveLevel({ ref: event.target.value })
                          }
                          value={activeLevel.ref}
                        />
                      </Field>
                      <Field label="Number">
                        <Input
                          inputMode="decimal"
                          onChange={(event) => {
                            const number = Number(event.target.value);
                            if (Number.isFinite(number)) {
                              updateActiveLevel({ number });
                            }
                          }}
                          type="number"
                          value={activeLevel.number}
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Elevation (m)">
                        <Input
                          inputMode="decimal"
                          onChange={(event) => {
                            const elevationMetres = Number(event.target.value);
                            if (Number.isFinite(elevationMetres)) {
                              updateActiveLevel({ elevationMetres });
                            }
                          }}
                          type="number"
                          value={activeLevel.elevationMetres}
                        />
                      </Field>
                      <Field label="Height (m)">
                        <Input
                          inputMode="decimal"
                          min="0.1"
                          onChange={(event) => {
                            const heightMetres = Number(event.target.value);
                            if (heightMetres > 0) {
                              updateActiveLevel({ heightMetres });
                            }
                          }}
                          step="0.1"
                          type="number"
                          value={activeLevel.heightMetres}
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}

                {selectedSpace ? (
                  <div className="space-y-4 border-t border-zinc-200 pt-4">
                    <p className="text-xs font-semibold text-zinc-950 capitalize">
                      {selectedSpace.kind}
                    </p>
                    <Field label="Name">
                      <Input
                        onChange={(event) =>
                          updateSelectedSpace({ name: event.target.value })
                        }
                        value={selectedSpace.name}
                      />
                    </Field>
                    <Field label="Room reference">
                      <Input
                        onChange={(event) =>
                          updateSelectedSpace({ ref: event.target.value })
                        }
                        placeholder="For example, G01"
                        value={selectedSpace.ref}
                      />
                    </Field>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-xs font-medium text-zinc-700">
                      <Checkbox
                        checked={selectedSpace.searchable}
                        onCheckedChange={(checked) =>
                          updateSelectedSpace({ searchable: checked === true })
                        }
                      />
                      Include in Room Finder search
                    </label>
                    <Button
                      fullWidth
                      onClick={deleteSelectedShape}
                      size="sm"
                      variant="danger"
                    >
                      <Trash2 aria-hidden="true" />
                      Delete shape
                    </Button>
                  </div>
                ) : selectedConnector ? (
                  <div className="space-y-4 border-t border-zinc-200 pt-4">
                    <p className="text-xs font-semibold text-zinc-950 capitalize">
                      {selectedConnector.kind}
                    </p>
                    <Field label="Name">
                      <Input
                        onChange={(event) =>
                          updateSelectedConnector({ name: event.target.value })
                        }
                        value={selectedConnector.name}
                      />
                    </Field>
                    <Field label="Accessibility">
                      <Select
                        aria-label={`${selectedConnector.name || selectedConnector.kind} accessibility`}
                        onChange={(accessibility) =>
                          updateSelectedConnector({ accessibility })
                        }
                        options={connectorAccessibilityOptions}
                        value={selectedConnector.accessibility}
                      />
                    </Field>
                    <p className="text-xs leading-5 text-zinc-500">
                      Only verified accessible connectors are used for
                      accessible routes.
                    </p>
                    <fieldset>
                      <legend className="text-xs font-medium text-zinc-700">
                        Served levels
                      </legend>
                      <div className="mt-2 space-y-1">
                        {document.levels.map((level) => {
                          const checked = selectedConnector.levelIds.includes(
                            level.id,
                          );
                          return (
                            <label
                              className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-xs text-zinc-700 hover:bg-zinc-50"
                              key={level.id}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(nextChecked) => {
                                  const levelIds =
                                    nextChecked === true
                                      ? [
                                          ...new Set([
                                            ...selectedConnector.levelIds,
                                            level.id,
                                          ]),
                                        ]
                                      : selectedConnector.levelIds.filter(
                                          (levelId) => levelId !== level.id,
                                        );
                                  updateSelectedConnector({ levelIds });
                                }}
                              />
                              {level.name}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                    <Button
                      fullWidth
                      onClick={deleteSelectedShape}
                      size="sm"
                      variant="danger"
                    >
                      <Trash2 aria-hidden="true" />
                      Delete connector
                    </Button>
                  </div>
                ) : (
                  <p className="border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500">
                    Select a room, corridor, stair or lift on the floor plan to
                    edit its details.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
