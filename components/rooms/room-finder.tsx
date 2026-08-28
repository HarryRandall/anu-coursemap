"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Info,
  Layers3,
  LoaderCircle,
  MapPin,
  PanelsTopLeft,
  Route,
} from "lucide-react";
import { CampusMap } from "@/components/rooms/campus-map";
import { IndoorMapViewer } from "@/components/rooms/indoor-map-viewer";
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
import {
  filterCampusPlaces,
  findCampusPlace,
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
  initialQuery?: string;
  initialFromSlug?: string;
  initialToSlug?: string;
  initialLayerSlugs?: readonly string[];
};

type RoomFinderUrlState = {
  query: string;
  placeSlug?: string;
  fromSlug?: string;
  toSlug?: string;
  visibleLayerSlugs: ReadonlySet<string>;
};

const SEARCH_RESULT_LIMIT = 8;

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
  const initialPlace = findCampusPlace(data.places, initialPlaceSlug);
  const routablePlaces = useMemo(
    () => data.places.filter((place) => place.isRoutable),
    [data.places],
  );
  const initialFrom =
    findCampusPlace(routablePlaces, initialFromSlug) ??
    initialPlace ??
    routablePlaces[0];
  const initialTo =
    findCampusPlace(routablePlaces, initialToSlug) ??
    routablePlaces.find((place) => place.slug !== initialFrom?.slug);

  const [query, setQuery] = useState(initialQuery);
  const [selectedSlug, setSelectedSlug] = useState(initialPlace?.slug ?? "");
  const [visibleLayerSlugs, setVisibleLayerSlugs] =
    useState(initialVisibleLayers);
  const [directionsOpen, setDirectionsOpen] = useState(
    Boolean(initialFromSlug && initialToSlug),
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
  const selectedPlace = findCampusPlace(data.places, selectedSlug);
  const selectedIndoorMap = data.indoorMaps.find(
    (indoorMap) => indoorMap.buildingPlaceId === selectedPlace?.id,
  );
  const searchResults = query.trim()
    ? filteredPlaces.slice(0, SEARCH_RESULT_LIMIT)
    : [];
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
      selectedPlace?.slug,
      toSlug,
      visibleLayerSlugs,
    ],
  );

  const selectPlace = useCallback(
    (slug: string) => {
      setQuery("");
      setSelectedSlug(slug);
      updateUrl({ placeSlug: slug, query: "" });
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
    updateUrl({ placeSlug: undefined });
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
    else setToSlug(slug);
    setRouteState({ status: "idle", route: null, message: null });
    updateUrl({ fromSlug: nextFrom, toSlug: nextTo });
  }

  function swapRouteEndpoints() {
    setFromSlug(toSlug);
    setToSlug(fromSlug);
    setRouteState({ status: "idle", route: null, message: null });
    updateUrl({ fromSlug: toSlug, toSlug: fromSlug });
  }

  const placeOptions = routablePlaces.map((place) => ({
    value: place.slug,
    label: place.name,
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
        />
      </section>

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
              ? `${filteredPlaces.length} ANU place${filteredPlaces.length === 1 ? "" : "s"} found.`
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
              {searchResults.length > 0 ? (
                <>
                  <ul className="max-h-72 overflow-y-auto p-1">
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
                  No ANU places match that search.
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

            {selectedPlace && selectedIndoorMap ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="subtle"
                    className="min-h-11 w-full"
                  >
                    <PanelsTopLeft aria-hidden="true" size={14} />
                    Floor plan
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="bottom"
                  className="w-[min(44rem,calc(100vw-2rem))] overflow-hidden p-0"
                >
                  <IndoorMapViewer
                    buildingName={selectedPlace.name}
                    document={selectedIndoorMap.document}
                    query={query}
                  />
                </PopoverContent>
              </Popover>
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
                      options={placeOptions}
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
