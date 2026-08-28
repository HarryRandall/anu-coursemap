"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRightLeft,
  DoorOpen,
  Footprints,
  Info,
  Layers3,
  LoaderCircle,
  MapPin,
  MoveVertical,
  PanelsTopLeft,
  Route,
} from "lucide-react";
import { CampusMap } from "@/components/rooms/campus-map";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { buildIndoorScene } from "@/lib/rooms/indoor-3d";
import {
  projectBuildingFootprint,
  remapIndoorDocumentToFootprint,
} from "@/lib/rooms/indoor-footprint";
import {
  buildIndoorJourney,
  type IndoorJourney,
} from "@/lib/rooms/indoor-journey";
import {
  buildIndoorRouteGraph,
  type CampusIndoorLevel,
} from "@/lib/rooms/indoor-map";
import {
  findCampusRoom,
  matchCampusRooms,
  type CampusRoomSearchEntry,
} from "@/lib/rooms/indoor-room-index";
import {
  filterCampusPlaces,
  findCampusPlace,
  isCampusMapBuildingGeometry,
  formatWalkingDistance,
  formatWalkingDuration,
  getDefaultVisibleLayerSlugs,
  isMapStyleLayer,
  isCampusWalkingRoute,
  isPlaceFilterLayer,
  type CampusMapData,
  type CampusMapLayer,
  type CampusWalkingRoute,
} from "@/lib/rooms/campus-map";

type RoomFinderProps = {
  data: CampusMapData;
  loadError?: string | null;
  initialPlaceSlug?: string;
  initialRoomId?: string;
  initialQuery?: string;
  initialFromSlug?: string;
  initialToSlug?: string;
  initialLayerSlugs?: readonly string[];
};

type RoomFinderUrlState = {
  query: string;
  placeSlug?: string;
  roomId?: string;
  fromSlug?: string;
  toSlug?: string;
  visibleLayerSlugs: ReadonlySet<string>;
};

const SEARCH_RESULT_LIMIT = 8;
const ROOM_RESULT_LIMIT = 6;
/**
 * Floors stay at their real heights. Opening a building up is the shell turning
 * to glass, not the floors flying apart: pulling them beyond the real roof puts
 * rooms outside the building they are in.
 */
const EXPLODED_FLOOR_SPACING = 1;

function indoorLevelLabel(
  levels: readonly CampusIndoorLevel[],
  levelId: string,
) {
  const level = levels.find((candidate) => candidate.id === levelId);
  if (!level) return "another floor";
  return level.ref ? `${level.ref} · ${level.name}` : level.name;
}

function IndoorDirections({
  journey,
  levels,
  room,
  activeLevelId,
  onShowLevel,
}: {
  journey: IndoorJourney;
  levels: readonly CampusIndoorLevel[];
  room: CampusRoomSearchEntry;
  activeLevelId: string | null;
  onShowLevel: (levelId: string) => void;
}) {
  return (
    <section
      aria-labelledby="indoor-directions-heading"
      className="w-full rounded-md border border-zinc-200 bg-white p-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="indoor-directions-heading"
          className="text-xs font-semibold text-zinc-950"
        >
          Indoor directions
        </h2>
        <span className="text-[11px] text-zinc-500">
          {Math.round(journey.distanceMetres)} m
        </span>
      </div>

      <ol className="mt-2 space-y-1" aria-label={`Route to ${room.label}`}>
        {journey.steps.map((step, index) => {
          const levelId =
            step.kind === "connector" ? step.toLevelId : step.levelId;
          const level = indoorLevelLabel(levels, levelId);
          const active = levelId === activeLevelId;
          const distance =
            step.kind === "approach"
              ? null
              : Math.max(0, Math.round(step.distanceMetres));

          let title: string;
          let detail: string;
          let icon: ReactNode;

          if (step.kind === "approach") {
            title = `Enter ${step.buildingName}`;
            detail = `Use the mapped entrance on ${level}`;
            icon = <DoorOpen aria-hidden="true" size={14} />;
          } else if (step.kind === "connector") {
            const connectorName = step.connectorName.trim();
            title = `Take the ${step.connectorKind}${connectorName ? ` · ${connectorName}` : ""}`;
            detail = `From ${indoorLevelLabel(levels, step.fromLevelId)} to ${level}`;
            if (step.accessibility === "inaccessible") {
              detail += " · not step-free";
            }
            icon = <MoveVertical aria-hidden="true" size={14} />;
          } else if (step.arrives) {
            title = `Continue to ${room.ref || room.name}`;
            detail = `${distance} m on ${level}`;
            icon = <MapPin aria-hidden="true" size={14} />;
          } else {
            title = `Walk on ${level}`;
            detail = `${distance} m along the mapped path`;
            icon = <Footprints aria-hidden="true" size={14} />;
          }

          return (
            <li key={`${step.kind}-${index}`}>
              <button
                aria-label={`${title}. ${detail}. Show this floor on the map.`}
                className={cn(
                  "flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-400",
                  active && "bg-brand-50",
                )}
                onClick={() => onShowLevel(levelId)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600",
                    active && "bg-brand-100 text-brand-700",
                  )}
                >
                  {icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-zinc-900">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-zinc-500">
                    {detail}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * The projection a building's interior was drawn against, which is what puts
 * its rooms back on the map at the right place and height.
 */
function buildingFootprintFor(
  data: CampusMapData,
  placeId: string | undefined,
) {
  if (!placeId) return null;
  const feature = data.features.find(
    (candidate) =>
      candidate.featureKind === "building" &&
      candidate.placeId === placeId &&
      isCampusMapBuildingGeometry(candidate.geometry),
  );
  if (!feature || !isCampusMapBuildingGeometry(feature.geometry)) return null;
  try {
    return projectBuildingFootprint(feature.geometry);
  } catch {
    return null;
  }
}

type RouteState =
  | { status: "idle"; route: null; message: null }
  | { status: "loading"; route: null; message: null }
  | { status: "error"; route: null; message: string }
  | { status: "success"; route: CampusWalkingRoute; message: null };

function LayerToggleRow({
  layer,
  checked,
  onToggle,
}: {
  layer: CampusMapLayer;
  checked: boolean;
  onToggle: () => void;
}) {
  const checkboxId = `room-layer-${layer.id}`;

  return (
    <div className="flex min-h-11 items-center gap-1 rounded-md hover:bg-zinc-50">
      <label
        htmlFor={checkboxId}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-2"
      >
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={onToggle}
        />
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: layer.colour }}
        />
        <span className="truncate text-xs font-medium text-zinc-900">
          {layer.name}
        </span>
      </label>
      {layer.description ? (
        <Popover>
          <PopoverTrigger asChild>
            <IconButton
              label={`About ${layer.name}`}
              variant="ghost"
              size="icon-sm"
              className="min-h-11 min-w-11 text-zinc-400"
            >
              <Info aria-hidden="true" size={14} />
            </IconButton>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <p className="text-xs leading-5 text-zinc-600">
              {layer.description}
            </p>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

function replaceRoomFinderUrl(state: RoomFinderUrlState) {
  const url = new URL(window.location.href);
  const trimmedQuery = state.query.trim();

  if (trimmedQuery) url.searchParams.set("q", trimmedQuery);
  else url.searchParams.delete("q");

  if (state.placeSlug) url.searchParams.set("place", state.placeSlug);
  else url.searchParams.delete("place");

  if (state.roomId) url.searchParams.set("room", state.roomId);
  else url.searchParams.delete("room");

  if (state.fromSlug && state.toSlug) {
    url.searchParams.set("from", state.fromSlug);
    url.searchParams.set("to", state.toSlug);
  } else {
    url.searchParams.delete("from");
    url.searchParams.delete("to");
  }

  const layers = [...state.visibleLayerSlugs].sort().join(",");
  if (layers) url.searchParams.set("layers", layers);
  else url.searchParams.delete("layers");

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function RoomFinder({
  data,
  loadError = null,
  initialPlaceSlug,
  initialRoomId,
  initialQuery = "",
  initialFromSlug,
  initialToSlug,
  initialLayerSlugs,
}: RoomFinderProps) {
  const defaultVisibleLayers = useMemo(
    () => getDefaultVisibleLayerSlugs(data.layers),
    [data.layers],
  );
  const knownLayerSlugs = useMemo(
    () => new Set(data.layers.map((layer) => layer.slug)),
    [data.layers],
  );
  const initialVisibleLayers = useMemo(() => {
    if (!initialLayerSlugs?.length) return defaultVisibleLayers;
    const requested = initialLayerSlugs.filter((slug) =>
      knownLayerSlugs.has(slug),
    );
    return requested.length > 0 ? new Set(requested) : defaultVisibleLayers;
  }, [defaultVisibleLayers, initialLayerSlugs, knownLayerSlugs]);
  const initialRoom = initialRoomId
    ? findCampusRoom(data.rooms, initialRoomId)
    : null;
  const initialPlace =
    findCampusPlace(data.places, initialPlaceSlug) ??
    findCampusPlace(data.places, initialRoom?.buildingSlug);
  const routablePlaces = useMemo(
    () => data.places.filter((place) => place.isRoutable),
    [data.places],
  );
  const initialRoomBuilding = initialRoom
    ? findCampusPlace(routablePlaces, initialRoom.buildingSlug)
    : null;
  const initialFrom =
    findCampusPlace(routablePlaces, initialFromSlug) ??
    (initialRoomBuilding
      ? routablePlaces.find((place) => place.slug !== initialRoomBuilding.slug)
      : initialPlace) ??
    routablePlaces[0];
  const initialTo =
    findCampusPlace(routablePlaces, initialToSlug) ??
    initialRoomBuilding ??
    routablePlaces.find((place) => place.slug !== initialFrom?.slug);

  const [query, setQuery] = useState(initialQuery);
  const [selectedSlug, setSelectedSlug] = useState(initialPlace?.slug ?? "");
  const [selectedRoomId, setSelectedRoomId] = useState(
    initialRoom?.roomId ?? "",
  );
  const [activeLevelId, setActiveLevelId] = useState(
    initialRoom?.levelId ?? "",
  );
  const [indoorFocusRequest, setIndoorFocusRequest] = useState(0);
  const [visibleLayerSlugs, setVisibleLayerSlugs] =
    useState(initialVisibleLayers);
  const [directionsOpen, setDirectionsOpen] = useState(
    Boolean(initialRoom || (initialFromSlug && initialToSlug)),
  );
  const [fromSlug, setFromSlug] = useState(initialFrom?.slug ?? "");
  const [toSlug, setToSlug] = useState(initialTo?.slug ?? "");
  const [routeState, setRouteState] = useState<RouteState>({
    status: "idle",
    route: null,
    message: null,
  });
  const controlsRef = useRef<HTMLDivElement>(null);
  const queryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (queryTimeout.current) clearTimeout(queryTimeout.current);
    },
    [],
  );

  const filteredPlaces = useMemo(
    () =>
      filterCampusPlaces(data.places, data.layers, visibleLayerSlugs, query),
    [data.layers, data.places, query, visibleLayerSlugs],
  );
  const mapLayers = useMemo(
    () => data.layers.filter(isMapStyleLayer),
    [data.layers],
  );
  const placeLayers = useMemo(
    () => data.layers.filter(isPlaceFilterLayer),
    [data.layers],
  );
  const visibleMapLayerCount = mapLayers.filter((layer) =>
    visibleLayerSlugs.has(layer.slug),
  ).length;
  const buildingsVisible = visibleLayerSlugs.has("buildings");
  const selectedPlace = findCampusPlace(data.places, selectedSlug);
  const selectedIndoorMap = data.indoorMaps.find(
    (indoorMap) => indoorMap.buildingPlaceId === selectedPlace?.id,
  );
  const searchResults = query.trim()
    ? filteredPlaces.slice(0, SEARCH_RESULT_LIMIT)
    : [];
  const roomResults = useMemo(
    () => matchCampusRooms(data.rooms, query, ROOM_RESULT_LIMIT),
    [data.rooms, query],
  );
  const selectedRoom = useMemo(
    () => (selectedRoomId ? findCampusRoom(data.rooms, selectedRoomId) : null),
    [data.rooms, selectedRoomId],
  );
  const selectedFootprint = useMemo(
    () => buildingFootprintFor(data, selectedPlace?.id),
    [data, selectedPlace?.id],
  );
  const selectedIndoorDocument = useMemo(() => {
    if (!selectedIndoorMap) return null;

    const alignedDocument = selectedFootprint
      ? remapIndoorDocumentToFootprint(
          selectedIndoorMap.document,
          selectedFootprint,
        )
      : selectedIndoorMap.document;

    try {
      // Footprint alignment can re-snap a perimeter opening. Rebuild its
      // derived approach nodes so public directions use the same doorway.
      return buildIndoorRouteGraph(alignedDocument);
    } catch {
      return alignedDocument;
    }
  }, [selectedFootprint, selectedIndoorMap]);
  const journey = useMemo(
    () =>
      selectedRoom && selectedIndoorDocument && selectedPlace
        ? buildIndoorJourney({
            document: selectedIndoorDocument,
            buildingName: selectedPlace.name,
            targetSpaceId: selectedRoom.roomId,
          })
        : null,
    [selectedIndoorDocument, selectedPlace, selectedRoom],
  );
  // Floors read top down, the way a lift panel does.
  const indoorLevels = useMemo(
    () =>
      selectedIndoorDocument
        ? [...selectedIndoorDocument.levels].toSorted(
            (left, right) => right.number - left.number,
          )
        : [],
    [selectedIndoorDocument],
  );
  const selectedBuildingRooms = useMemo(
    () =>
      selectedPlace
        ? data.rooms
            .filter((room) => room.buildingPlaceId === selectedPlace.id)
            .toSorted((left, right) =>
              (left.ref || left.name).localeCompare(
                right.ref || right.name,
                "en-AU",
                { numeric: true },
              ),
            )
        : [],
    [data.rooms, selectedPlace],
  );
  const roomGroups = useMemo(
    () =>
      indoorLevels.map((level) => ({
        level,
        rooms: selectedBuildingRooms.filter(
          (room) => room.levelId === level.id,
        ),
      })),
    [indoorLevels, selectedBuildingRooms],
  );
  const shownLevelId = useMemo(
    () =>
      indoorLevels.find((level) => level.id === activeLevelId)?.id ??
      selectedRoom?.levelId ??
      indoorLevels.at(-1)?.id ??
      null,
    [activeLevelId, indoorLevels, selectedRoom?.levelId],
  );

  const indoorScene = useMemo(
    () =>
      selectedIndoorDocument && selectedFootprint
        ? buildIndoorScene(selectedIndoorDocument, selectedFootprint, {
            // Opening the floors apart is what lets you see inside a building
            // rather than at it.
            explode: EXPLODED_FLOOR_SPACING,
            // The floor the room is on stays solid; the others fade back so
            // the building opens up rather than becoming a pile of plates.
            activeLevelId: shownLevelId,
            highlightSpaceIds: selectedRoom
              ? new Set([selectedRoom.roomId])
              : undefined,
            routeEdgeIds: journey ? new Set(journey.route.edgeIds) : undefined,
          })
        : null,
    [
      journey,
      selectedFootprint,
      selectedIndoorDocument,
      selectedRoom,
      shownLevelId,
    ],
  );
  const fromPlace = findCampusPlace(routablePlaces, fromSlug);
  const toPlace = findCampusPlace(routablePlaces, toSlug);
  const routeEndpoints = useMemo(
    () =>
      directionsOpen && fromPlace && toPlace && fromPlace.slug !== toPlace.slug
        ? { from: fromPlace, to: toPlace }
        : null,
    [directionsOpen, fromPlace, toPlace],
  );

  useEffect(() => {
    if (!routeEndpoints) return;

    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      setRouteState({ status: "loading", route: null, message: null });
      const params = new URLSearchParams({
        from: routeEndpoints.from.slug,
        to: routeEndpoints.to.slug,
      });
      void fetch(`/api/rooms/directions?${params}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const body: unknown = await response.json();
          if (!response.ok || !isCampusWalkingRoute(body)) {
            const message =
              body && typeof body === "object"
                ? Reflect.get(body, "error")
                : undefined;
            throw new Error(
              typeof message === "string"
                ? message
                : "Walking directions could not be loaded.",
            );
          }
          setRouteState({ status: "success", route: body, message: null });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setRouteState({
            status: "error",
            route: null,
            message:
              error instanceof Error
                ? error.message
                : "Walking directions could not be loaded.",
          });
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [routeEndpoints]);

  const updateUrl = useCallback(
    (overrides: Partial<RoomFinderUrlState> = {}) => {
      replaceRoomFinderUrl({
        query,
        placeSlug: selectedPlace?.slug,
        roomId: selectedRoomId || undefined,
        fromSlug: directionsOpen ? fromSlug : undefined,
        toSlug: directionsOpen ? toSlug : undefined,
        visibleLayerSlugs,
        ...overrides,
      });
    },
    [
      directionsOpen,
      fromSlug,
      query,
      selectedRoomId,
      selectedPlace?.slug,
      toSlug,
      visibleLayerSlugs,
    ],
  );

  const showIndoorLevel = useCallback((levelId: string) => {
    setActiveLevelId(levelId);
    setIndoorFocusRequest((request) => request + 1);
  }, []);

  /** Choosing a room selects its building and starts the journey. */
  const selectRoom = useCallback(
    (room: CampusRoomSearchEntry) => {
      const nextFromSlug =
        fromSlug === room.buildingSlug
          ? (routablePlaces.find((place) => place.slug !== room.buildingSlug)
              ?.slug ?? fromSlug)
          : fromSlug;
      setQuery("");
      setSelectedSlug(room.buildingSlug);
      setSelectedRoomId(room.roomId);
      showIndoorLevel(room.levelId);
      setDirectionsOpen(true);
      setFromSlug(nextFromSlug);
      setToSlug(room.buildingSlug);
      setRouteState({ status: "idle", route: null, message: null });
      updateUrl({
        placeSlug: room.buildingSlug,
        roomId: room.roomId,
        query: "",
        fromSlug: nextFromSlug || undefined,
        toSlug: room.buildingSlug,
      });
    },
    [fromSlug, routablePlaces, showIndoorLevel, updateUrl],
  );

  const selectPlace = useCallback(
    (slug: string) => {
      setQuery("");
      setSelectedSlug(slug);
      setSelectedRoomId("");
      setActiveLevelId("");
      updateUrl({ placeSlug: slug, query: "", roomId: undefined });
      window.requestAnimationFrame(() => {
        controlsRef.current
          ?.querySelector<HTMLInputElement>('input[type="search"]')
          ?.focus();
      });
    },
    [updateUrl],
  );

  const clearPlace = useCallback(() => {
    setSelectedSlug("");
    setSelectedRoomId("");
    setActiveLevelId("");
    updateUrl({ placeSlug: undefined, roomId: undefined });
  }, [updateUrl]);

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery);
    if (queryTimeout.current) clearTimeout(queryTimeout.current);
    queryTimeout.current = setTimeout(() => {
      updateUrl({ query: nextQuery });
    }, 200);
  }

  function toggleLayer(slug: string) {
    const nextLayers = new Set(visibleLayerSlugs);
    if (nextLayers.has(slug)) nextLayers.delete(slug);
    else nextLayers.add(slug);
    setVisibleLayerSlugs(nextLayers);
    updateUrl({ visibleLayerSlugs: nextLayers });
  }

  function toggleDirections() {
    const nextOpen = !directionsOpen;
    setDirectionsOpen(nextOpen);
    setRouteState({ status: "idle", route: null, message: null });
    updateUrl({
      fromSlug: nextOpen ? fromSlug : undefined,
      toSlug: nextOpen ? toSlug : undefined,
    });
  }

  function changeRouteEndpoint(kind: "from" | "to", slug: string) {
    const nextFrom = kind === "from" ? slug : fromSlug;
    const nextTo = kind === "to" ? slug : toSlug;
    if (kind === "from") setFromSlug(slug);
    else {
      setToSlug(slug);
      if (selectedRoom && selectedRoom.buildingSlug !== slug) {
        setSelectedRoomId("");
      }
    }
    setRouteState({ status: "idle", route: null, message: null });
    updateUrl({
      fromSlug: nextFrom,
      toSlug: nextTo,
      roomId:
        kind === "to" && selectedRoom?.buildingSlug !== slug
          ? undefined
          : selectedRoomId || undefined,
    });
  }

  function swapRouteEndpoints() {
    setFromSlug(toSlug);
    setToSlug(fromSlug);
    setSelectedRoomId("");
    setRouteState({ status: "idle", route: null, message: null });
    updateUrl({ fromSlug: toSlug, toSlug: fromSlug, roomId: undefined });
  }

  const placeOptions = routablePlaces.map((place) => ({
    value: place.slug,
    label: place.name,
  }));
  const destinationOptions = routablePlaces.map((place) => ({
    value: place.slug,
    label:
      selectedRoom?.buildingSlug === place.slug
        ? `${selectedRoom.ref || selectedRoom.name} · ${place.name}`
        : place.name,
  }));

  return (
    <div className="relative h-[calc(100dvh-4rem)] min-h-[28rem] overflow-hidden bg-zinc-100">
      <h1 className="sr-only">Room finder</h1>
      <section
        aria-label="Campus map"
        className="absolute inset-0 overflow-hidden"
      >
        <CampusMap
          campus={data.campus}
          layers={data.layers}
          visibleLayerSlugs={visibleLayerSlugs}
          places={data.places}
          features={data.features}
          selectedSlug={selectedPlace?.slug}
          route={routeState.route}
          routeEndpoints={routeEndpoints}
          onSelect={selectPlace}
          onClearSelection={clearPlace}
          indoorScene={buildingsVisible ? indoorScene : null}
          indoorFocus={
            buildingsVisible && indoorScene && selectedPlace
              ? {
                  placeSlug: selectedPlace.slug,
                  requestKey: indoorFocusRequest,
                  pitch: 60,
                  maxZoom: 19.5,
                  padding: 96,
                }
              : null
          }
        />
      </section>

      {buildingsVisible && indoorScene && indoorLevels.length > 0 ? (
        <div
          aria-label="Building floors"
          className="absolute top-3 right-3 z-10 flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white/95 p-1 shadow-lg shadow-zinc-950/10 sm:top-auto sm:bottom-16"
          role="group"
        >
          {indoorLevels.map((level) => {
            const shown = level.id === shownLevelId;
            const onRoute = journey?.route.levelIds.includes(level.id) ?? false;
            return (
              <button
                aria-label={`Show ${level.name}`}
                aria-current={shown ? "true" : undefined}
                className={cn(
                  "relative min-h-11 min-w-11 rounded-md text-xs font-semibold outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-400",
                  shown && "bg-brand-600 text-white hover:bg-brand-600",
                )}
                key={level.id}
                onClick={() => showIndoorLevel(level.id)}
                title={level.name}
                type="button"
              >
                {level.ref || level.number}
                {onRoute && !shown ? (
                  <span
                    aria-label="on your route"
                    className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <aside
        aria-label="Room finder controls"
        className="pointer-events-none absolute top-3 right-16 left-3 z-10 sm:right-auto sm:w-[22rem]"
      >
        <div
          ref={controlsRef}
          className="pointer-events-auto max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 shadow-lg shadow-zinc-950/10"
        >
          <div className="[&_input[type=search]]:min-h-11">
            <FilterBar
              searchPlaceholder="Search ANU buildings, rooms or services..."
              state={{
                query,
                values: {},
                onQueryChange: changeQuery,
                onFilterChange: () => undefined,
              }}
            />
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {query.trim()
              ? `${searchResults.length} ANU place${searchResults.length === 1 ? "" : "s"} and ${roomResults.length} room${roomResults.length === 1 ? "" : "s"} shown.`
              : ""}
          </p>

          {loadError ? (
            <p
              role="alert"
              className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              {loadError}
            </p>
          ) : query.trim() ? (
            <div
              role="region"
              aria-label="Search results"
              className="mt-2 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm"
            >
              {searchResults.length > 0 || roomResults.length > 0 ? (
                <>
                  <ul className="max-h-72 overflow-y-auto p-1">
                    {searchResults.length > 0 ? (
                      <li
                        className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase"
                        role="presentation"
                      >
                        Buildings
                      </li>
                    ) : null}
                    {searchResults.map((place) => {
                      const isSelected = place.slug === selectedPlace?.slug;
                      return (
                        <li key={place.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex min-h-12 w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-400",
                              isSelected && "bg-brand-50",
                            )}
                            onClick={() => selectPlace(place.slug)}
                          >
                            <MapPin
                              aria-hidden="true"
                              className="mt-0.5 shrink-0 text-brand-600"
                              size={15}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-zinc-950">
                                {place.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                                {place.address}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}

                    {roomResults.length > 0 ? (
                      <li
                        className="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase"
                        role="presentation"
                      >
                        Rooms
                      </li>
                    ) : null}
                    {roomResults.map((room) => (
                      <li key={room.roomId}>
                        <button
                          className={cn(
                            "flex min-h-12 w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-400",
                            room.roomId === selectedRoomId && "bg-brand-50",
                          )}
                          onClick={() => selectRoom(room)}
                          type="button"
                        >
                          <PanelsTopLeft
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-brand-600"
                            size={15}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-zinc-950">
                              {room.ref
                                ? `${room.ref} · ${room.name}`
                                : room.label}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500">
                              {room.buildingName} ·{" "}
                              {room.levelRef || room.levelName}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {filteredPlaces.length > SEARCH_RESULT_LIMIT ? (
                    <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500">
                      Showing the first {SEARCH_RESULT_LIMIT} matches. Keep
                      typing to narrow the search.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="px-3 py-3 text-xs text-zinc-600">
                  No ANU buildings or rooms match that search.
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" className="min-h-11 flex-1">
                  <Layers3 aria-hidden="true" size={14} />
                  Layers
                  <span className="text-zinc-400">
                    {visibleMapLayerCount}/{mapLayers.length}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-[min(40rem,calc(100dvh-2rem))] w-72 overflow-y-auto"
              >
                <p className="text-xs font-semibold text-zinc-950">
                  Map detail
                </p>
                <div className="mt-2 space-y-0.5">
                  {mapLayers.map((layer) => (
                    <LayerToggleRow
                      key={layer.id}
                      layer={layer}
                      checked={visibleLayerSlugs.has(layer.slug)}
                      onToggle={() => toggleLayer(layer.slug)}
                    />
                  ))}
                </div>
                {placeLayers.length > 0 ? (
                  <>
                    <p className="mt-5 border-t border-zinc-200 pt-4 text-xs font-semibold text-zinc-950">
                      Place categories
                    </p>
                    <div className="mt-2 space-y-0.5">
                      {placeLayers.map((layer) => (
                        <LayerToggleRow
                          key={layer.id}
                          layer={layer}
                          checked={visibleLayerSlugs.has(layer.slug)}
                          onToggle={() => toggleLayer(layer.slug)}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              variant={directionsOpen ? "subtle" : "secondary"}
              className="min-h-11 flex-1"
              aria-expanded={directionsOpen}
              aria-controls="room-finder-directions"
              onClick={toggleDirections}
            >
              <Route aria-hidden="true" size={14} />
              Directions
            </Button>

            {selectedRoom ? (
              <div className="w-full rounded-md border border-brand-200 bg-brand-50 p-2.5">
                <p className="text-xs font-semibold text-brand-900">
                  {selectedRoom.ref
                    ? `${selectedRoom.ref} · ${selectedRoom.name}`
                    : selectedRoom.label}
                </p>
                <p className="mt-0.5 text-[11px] text-brand-800">
                  {selectedRoom.levelName}
                  {journey
                    ? ` · ${Math.round(journey.distanceMetres)} m inside`
                    : " · no indoor route mapped yet"}
                </p>
                <Button
                  className="mt-2 w-full"
                  onClick={() => {
                    setSelectedRoomId("");
                    updateUrl({ roomId: undefined });
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Clear this room
                </Button>
              </div>
            ) : null}

            {selectedRoom && journey ? (
              <IndoorDirections
                activeLevelId={shownLevelId}
                journey={journey}
                levels={indoorLevels}
                onShowLevel={showIndoorLevel}
                room={selectedRoom}
              />
            ) : null}

            {selectedIndoorMap && roomGroups.length > 0 ? (
              <section
                aria-labelledby="building-rooms-heading"
                className="w-full overflow-hidden rounded-md border border-zinc-200 bg-white"
              >
                <div className="border-b border-zinc-100 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2
                      id="building-rooms-heading"
                      className="text-xs font-semibold text-zinc-950"
                    >
                      Rooms in {selectedPlace?.name}
                    </h2>
                    {selectedIndoorMap.status === "draft" ? (
                      <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        Draft preview
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                    Choose a findable room to use it as your destination.
                  </p>
                </div>

                <div className="divide-y divide-zinc-100">
                  {roomGroups.map(({ level, rooms }) => (
                    <section
                      aria-labelledby={`room-finder-level-${level.id}`}
                      className="px-1 py-1.5"
                      key={level.id}
                    >
                      <div className="flex min-h-8 items-center justify-between gap-2 px-2">
                        <h3
                          className="text-[11px] font-semibold text-zinc-700"
                          id={`room-finder-level-${level.id}`}
                        >
                          {level.ref
                            ? `${level.ref} · ${level.name}`
                            : level.name}
                        </h3>
                        <span className="text-[10px] text-zinc-400">
                          {rooms.length} room{rooms.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {rooms.length > 0 ? (
                        <ul>
                          {rooms.map((room) => {
                            const destination = room.roomId === selectedRoomId;
                            return (
                              <li key={room.roomId}>
                                <button
                                  aria-pressed={destination}
                                  className={cn(
                                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-400",
                                    destination && "bg-brand-50",
                                  )}
                                  onClick={() => selectRoom(room)}
                                  type="button"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-xs font-medium text-zinc-900">
                                      {room.ref || room.name}
                                    </span>
                                    {room.ref && room.name ? (
                                      <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                                        {room.name}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span
                                    className={cn(
                                      "shrink-0 text-[10px] font-medium text-zinc-400",
                                      destination && "text-brand-700",
                                    )}
                                  >
                                    {destination
                                      ? "Destination"
                                      : "Set destination"}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="px-2 py-1.5 text-[11px] text-zinc-500">
                          No findable rooms on this floor.
                        </p>
                      )}
                    </section>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {directionsOpen ? (
            <section
              id="room-finder-directions"
              aria-label="Walking directions"
              className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <div className="space-y-2.5">
                  <Field label="From">
                    <Select
                      aria-label="Directions start"
                      className="min-h-11"
                      value={fromSlug}
                      options={placeOptions}
                      onChange={(slug) => changeRouteEndpoint("from", slug)}
                    />
                  </Field>
                  <Field label="To">
                    <Select
                      aria-label="Directions destination"
                      className="min-h-11"
                      value={toSlug}
                      options={destinationOptions}
                      onChange={(slug) => changeRouteEndpoint("to", slug)}
                    />
                  </Field>
                </div>
                <IconButton
                  label="Swap start and destination"
                  className="mb-0.5 min-h-11 min-w-11"
                  disabled={!fromSlug || !toSlug}
                  onClick={swapRouteEndpoints}
                >
                  <ArrowRightLeft aria-hidden="true" size={15} />
                </IconButton>
              </div>

              <div className="mt-3 min-h-5 text-xs" aria-live="polite">
                {fromSlug === toSlug ? (
                  <p className="text-amber-700">Choose two different places.</p>
                ) : routeState.status === "loading" ? (
                  <p className="inline-flex items-center gap-1.5 text-zinc-500">
                    <LoaderCircle
                      aria-hidden="true"
                      className="animate-spin"
                      size={13}
                    />
                    Finding a walking route...
                  </p>
                ) : routeState.status === "error" ? (
                  <p className="text-rose-700">{routeState.message}</p>
                ) : routeState.status === "success" ? (
                  <p className="font-medium text-zinc-700">
                    {formatWalkingDuration(routeState.route.durationSeconds)} ·{" "}
                    {formatWalkingDistance(routeState.route.distanceMetres)}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
