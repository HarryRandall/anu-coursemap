"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  ExternalLink,
  Info,
  Layers3,
  LoaderCircle,
  MapPin,
  Route,
  SearchX,
} from "lucide-react";
import { CampusMap } from "@/components/rooms/campus-map";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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

type RouteState =
  | { status: "idle"; route: null; message: null }
  | { status: "loading"; route: null; message: null }
  | { status: "error"; route: null; message: string }
  | { status: "success"; route: CampusWalkingRoute; message: null };

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
  const initialPlace =
    findCampusPlace(data.places, initialPlaceSlug) ?? data.places[0];
  const routablePlaces = useMemo(
    () => data.places.filter((place) => place.isRoutable),
    [data.places],
  );
  const initialFrom =
    findCampusPlace(routablePlaces, initialFromSlug) ?? initialPlace;
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
  const selectedPlace =
    findCampusPlace(filteredPlaces, selectedSlug) ?? filteredPlaces[0];
  const selectedLayer = data.layers.find(
    (layer) => layer.id === selectedPlace?.layerId,
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
      setSelectedSlug(slug);
      updateUrl({ placeSlug: slug });
    },
    [updateUrl],
  );

  function changeQuery(nextQuery: string) {
    const nextPlaces = filterCampusPlaces(
      data.places,
      data.layers,
      visibleLayerSlugs,
      nextQuery,
    );
    const nextPlace =
      findCampusPlace(nextPlaces, selectedSlug) ?? nextPlaces[0];

    setQuery(nextQuery);
    if (nextPlace) setSelectedSlug(nextPlace.slug);
    if (queryTimeout.current) clearTimeout(queryTimeout.current);
    queryTimeout.current = setTimeout(() => {
      updateUrl({ query: nextQuery, placeSlug: nextPlace?.slug });
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
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-white lg:grid lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:grid-cols-[23rem_minmax(0,1fr)]">
      <aside className="z-10 flex flex-col border-b border-zinc-200 bg-white lg:min-h-0 lg:border-r lg:border-b-0">
        <div className="border-b border-zinc-200 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="sr-only">Room finder</h1>
              <p className="text-sm font-semibold text-zinc-950">
                {data.campus?.name ?? "Campus map"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {data.places.length} places · live OpenStreetMap vectors
              </p>
            </div>
            <Badge tone="brand">Preview</Badge>
          </div>

          <div className="mt-4">
            <FilterBar
              searchPlaceholder="Search buildings, rooms or services..."
              state={{
                query,
                values: {},
                onQueryChange: changeQuery,
                onFilterChange: () => undefined,
              }}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" className="flex-1">
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
                <div className="mt-3 space-y-3">
                  {mapLayers.map((layer) => (
                    <label
                      key={layer.id}
                      className="flex cursor-pointer items-start gap-3"
                    >
                      <Checkbox
                        checked={visibleLayerSlugs.has(layer.slug)}
                        onCheckedChange={() => toggleLayer(layer.slug)}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-xs font-medium text-zinc-900">
                          <span
                            aria-hidden="true"
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: layer.colour }}
                          />
                          {layer.name}
                        </span>
                        {layer.description ? (
                          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                            {layer.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
                {placeLayers.length > 0 ? (
                  <>
                    <p className="mt-5 border-t border-zinc-200 pt-4 text-xs font-semibold text-zinc-950">
                      Place categories
                    </p>
                    <div className="mt-3 space-y-3">
                      {placeLayers.map((layer) => (
                        <label
                          key={layer.id}
                          className="flex cursor-pointer items-start gap-3"
                        >
                          <Checkbox
                            checked={visibleLayerSlugs.has(layer.slug)}
                            onCheckedChange={() => toggleLayer(layer.slug)}
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-xs font-medium text-zinc-900">
                              <span
                                aria-hidden="true"
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: layer.colour }}
                              />
                              {layer.name}
                            </span>
                            {layer.description ? (
                              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                                {layer.description}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : null}
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              variant={directionsOpen ? "subtle" : "secondary"}
              className="flex-1"
              aria-pressed={directionsOpen}
              onClick={toggleDirections}
            >
              <Route aria-hidden="true" size={14} />
              Directions
            </Button>
          </div>

          {directionsOpen ? (
            <section
              aria-label="Walking directions"
              className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <div className="space-y-2.5">
                  <Field label="From">
                    <Select
                      aria-label="Directions start"
                      value={fromSlug}
                      options={placeOptions}
                      onChange={(slug) => changeRouteEndpoint("from", slug)}
                    />
                  </Field>
                  <Field label="To">
                    <Select
                      aria-label="Directions destination"
                      value={toSlug}
                      options={placeOptions}
                      onChange={(slug) => changeRouteEndpoint("to", slug)}
                    />
                  </Field>
                </div>
                <IconButton
                  label="Swap start and destination"
                  className="mb-0.5"
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

          <div className="text-brand-950 mt-3 grid grid-cols-[auto_1fr] gap-x-2.5 rounded-md border border-brand-100 bg-brand-50 p-3">
            <Info aria-hidden="true" className="mt-0.5 size-4" />
            <p className="text-xs leading-relaxed text-brand-900/80">
              Select an ANU building to highlight its complete OpenStreetMap
              footprint. Map detail and place categories can be filtered
              independently.
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
          <div className="p-3 sm:p-4">
            <p className="px-1 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              <span aria-live="polite">
                {filteredPlaces.length}{" "}
                {filteredPlaces.length === 1 ? "result" : "results"}
              </span>
            </p>

            {loadError ? (
              <Empty className="py-9">
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden="true" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Map data unavailable</EmptyTitle>
                  <EmptyDescription>{loadError}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : filteredPlaces.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {filteredPlaces.map((place) => {
                  const isSelected = place.slug === selectedPlace?.slug;
                  const layer = data.layers.find(
                    (candidate) => candidate.id === place.layerId,
                  );
                  return (
                    <li key={place.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        className={cn(
                          "flex min-h-14 w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20",
                          isSelected
                            ? "border-brand-200 bg-brand-50"
                            : "border-transparent hover:border-zinc-200 hover:bg-zinc-50",
                        )}
                        onClick={() => selectPlace(place.slug)}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-md text-white",
                            isSelected && "ring-2 ring-brand-200 ring-offset-1",
                          )}
                          style={{
                            backgroundColor: layer?.colour ?? "#52525b",
                          }}
                        >
                          <MapPin size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-zinc-950">
                            {place.name}
                          </span>
                          <span className="mt-0.5 flex items-start gap-1 text-xs text-zinc-500">
                            <MapPin
                              aria-hidden="true"
                              className="mt-0.5 shrink-0"
                              size={12}
                            />
                            {place.address}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty className="py-9">
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden="true" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No places match</EmptyTitle>
                  <EmptyDescription>
                    Change the search or turn on another place category.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>

          {selectedPlace ? (
            <section className="mt-auto border-t border-zinc-200 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">
                    {selectedPlace.name}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedPlace.address}
                  </p>
                </div>
                <Badge size="sm">
                  {selectedPlace.dataStatus === "verified"
                    ? "Verified"
                    : "Example data"}
                </Badge>
              </div>

              {selectedPlace.details.length > 0 ? (
                <>
                  <h3 className="mt-4 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                    {selectedLayer?.name ?? "Rooms and places"}
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-zinc-700">
                    {selectedPlace.details.map((detail) => (
                      <li key={detail.id} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400"
                        />
                        {detail.label}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {selectedPlace.officialUrl ? (
                <ButtonLink
                  href={selectedPlace.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4"
                  size="sm"
                >
                  Open source page
                  <ExternalLink aria-hidden="true" size={13} />
                </ButtonLink>
              ) : null}
            </section>
          ) : null}
        </div>
      </aside>

      <section
        aria-label="Campus map"
        className="relative min-h-[50dvh] flex-1 overflow-hidden lg:min-h-0"
      >
        <CampusMap
          campus={data.campus}
          layers={data.layers}
          visibleLayerSlugs={visibleLayerSlugs}
          places={filteredPlaces}
          selectedSlug={selectedPlace?.slug}
          route={routeState.route}
          routeEndpoints={routeEndpoints}
          onSelect={selectPlace}
        />
      </section>
    </div>
  );
}
