import type { Metadata } from "next";
import { RoomFinder } from "@/components/rooms/room-finder";
import { AppShell } from "@/components/shell";
import { loadCampusMapData } from "@/lib/rooms/campus-map-data";

export const metadata: Metadata = {
  title: "Room finder · Coursemap",
  description: "Find buildings and rooms on the ANU Acton campus.",
};

type RoomsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function layerValues(value: string | string[] | undefined) {
  return firstValue(value)
    ?.split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const [params, mapResult] = await Promise.all([
    searchParams,
    loadCampusMapData({ includeManageableDrafts: true }),
  ]);

  return (
    <AppShell fullBleed>
      <RoomFinder
        data={mapResult.data}
        loadError={mapResult.error}
        initialPlaceSlug={
          firstValue(params.place) ?? firstValue(params.building)
        }
        initialQuery={firstValue(params.q)}
        initialRoomId={firstValue(params.room)}
        initialFromSlug={firstValue(params.from)}
        initialToSlug={firstValue(params.to)}
        initialLayerSlugs={layerValues(params.layers)}
      />
    </AppShell>
  );
}
