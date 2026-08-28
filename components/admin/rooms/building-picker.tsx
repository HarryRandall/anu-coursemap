"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, MapPinned, Search } from "lucide-react";
import { CampusMap } from "@/components/rooms/campus-map";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { indoorMapStatusTone } from "@/components/admin/rooms/indoor-status";
import {
  getDefaultVisibleLayerSlugs,
  type CampusMapData,
  type CampusMapPlace,
} from "@/lib/rooms/campus-map";
import type { CampusIndoorMapSummary } from "@/lib/rooms/indoor-map-admin";

const RESULT_LIMIT = 40;

function matchesBuilding(place: CampusMapPlace, terms: readonly string[]) {
  if (terms.length === 0) return true;
  const searchable = [place.name, place.address, ...place.searchTerms]
    .join(" ")
    .toLocaleLowerCase("en-AU");
  return terms.every((term) => searchable.includes(term));
}

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Sydney",
  }).format(date);
}

/**
 * Choosing a building to map. The campus map is the primary way in, because
 * picking a building off a map is how anyone actually thinks about it; the
 * search and the list of started maps are for when you already know the name.
 */
export function BuildingPicker({
  buildings,
  mapData,
  summaries,
}: {
  buildings: readonly CampusMapPlace[];
  mapData: CampusMapData;
  summaries: readonly CampusIndoorMapSummary[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>();

  const summaryByBuilding = useMemo(
    () =>
      new Map(summaries.map((summary) => [summary.buildingPlaceId, summary])),
    [summaries],
  );
  const visibleLayerSlugs = useMemo(
    () => getDefaultVisibleLayerSlugs(mapData.layers),
    [mapData.layers],
  );

  const terms = query
    .trim()
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean);
  const results = buildings.filter((place) => matchesBuilding(place, terms));
  const started = buildings.filter((place) => summaryByBuilding.has(place.id));
  const listed = terms.length > 0 ? results : started;

  function openBuilding(slug: string) {
    router.push(`/admin/rooms/${encodeURIComponent(slug)}`);
  }

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] bg-zinc-100 lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-zinc-200 bg-white lg:border-r lg:border-b-0">
        <div className="border-b border-zinc-200 p-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
              size={15}
            />
            <Input
              aria-label="Search ANU buildings"
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a building to map"
              type="search"
              value={query}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500" role="status">
            {terms.length > 0
              ? `${results.length} of ${buildings.length} buildings`
              : `${started.length} of ${buildings.length} buildings mapped`}
          </p>
        </div>

        <nav
          aria-label={
            terms.length > 0 ? "Search results" : "Buildings with a map"
          }
          className="min-h-0 flex-1 overflow-y-auto p-2"
        >
          {listed.length === 0 ? (
            <Empty className="mt-6 px-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {terms.length > 0 ? (
                    <Search aria-hidden="true" />
                  ) : (
                    <MapPinned aria-hidden="true" />
                  )}
                </EmptyMedia>
                <EmptyTitle>
                  {terms.length > 0 ? "Nothing found" : "No maps yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {terms.length > 0
                    ? "Try a building number or a street name."
                    : "Pick a building on the map to start its first floor plan."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="space-y-0.5">
              {listed.slice(0, RESULT_LIMIT).map((place) => {
                const summary = summaryByBuilding.get(place.id);
                const updatedAt = formatUpdatedAt(summary?.updatedAt ?? null);
                return (
                  <li key={place.id}>
                    <button
                      className={cn(
                        "flex min-h-11 w-full items-start gap-2 rounded-md px-2.5 py-2 text-left outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-400",
                        place.slug === selectedSlug && "bg-brand-50",
                      )}
                      onClick={() => openBuilding(place.slug)}
                      onMouseEnter={() => setSelectedSlug(place.slug)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-950">
                          {place.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                          {summary
                            ? `${summary.levelCount} level${summary.levelCount === 1 ? "" : "s"} · ${summary.roomCount} room${summary.roomCount === 1 ? "" : "s"}${updatedAt ? ` · ${updatedAt}` : ""}`
                            : place.address}
                        </span>
                      </span>
                      {summary ? (
                        <Badge tone={indoorMapStatusTone(summary.status)}>
                          {summary.status}
                        </Badge>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {listed.length > RESULT_LIMIT ? (
            <p className="px-2.5 py-2 text-[11px] text-zinc-500">
              {listed.length - RESULT_LIMIT} more. Keep typing to narrow it
              down.
            </p>
          ) : null}
        </nav>
      </aside>

      <main className="relative min-h-96 min-w-0">
        <CampusMap
          campus={mapData.campus}
          features={mapData.features}
          layers={mapData.layers}
          onClearSelection={() => setSelectedSlug(undefined)}
          onSelect={(slug) => {
            setSelectedSlug(slug);
            openBuilding(slug);
          }}
          places={mapData.places}
          route={null}
          routeEndpoints={null}
          selectedSlug={selectedSlug}
          visibleLayerSlugs={visibleLayerSlugs}
        />
        <p className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/95 px-3 py-2 text-xs font-medium text-zinc-700 shadow-xs">
          <LayoutGrid aria-hidden="true" size={14} />
          Click a building to open its floor plan
        </p>
      </main>
    </div>
  );
}
