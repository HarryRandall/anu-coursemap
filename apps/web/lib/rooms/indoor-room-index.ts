import {
  listIndoorRoomDetails,
  type CampusIndoorDocument,
} from "@/lib/rooms/indoor-map";

/**
 * A flat index of every published, searchable room across every building.
 *
 * Room search used to work only sideways: room labels were folded into each
 * building's details, so searching a room number found the building and left
 * you to hunt for the room. This makes a room a result in its own right.
 *
 * The matcher is pure and separate from the loader so that, if the payload ever
 * grows past what is sensible to ship, moving it behind a search endpoint is a
 * one file change.
 */
export type CampusRoomSearchEntry = Readonly<{
  /** The space identifier, which is stable; a room reference is not. */
  roomId: string;
  buildingPlaceId: string;
  buildingSlug: string;
  buildingName: string;
  levelId: string;
  levelRef: string;
  levelName: string;
  ref: string;
  name: string;
  label: string;
  /** Pre-folded once, so a keystroke does not refold the whole index. */
  searchText: string;
}>;

type IndexableIndoorMap = Readonly<{
  buildingPlaceId: string;
  document: CampusIndoorDocument;
}>;

type IndexableBuilding = Readonly<{
  id: string;
  slug: string;
  name: string;
}>;

function fold(value: string) {
  return value.toLocaleLowerCase("en-AU");
}

export function buildCampusRoomIndex(
  indoorMaps: readonly IndexableIndoorMap[],
  buildings: readonly IndexableBuilding[],
): readonly CampusRoomSearchEntry[] {
  const buildingsById = new Map(
    buildings.map((building) => [building.id, building]),
  );

  return indoorMaps.flatMap((map) => {
    const building = buildingsById.get(map.buildingPlaceId);
    if (!building) return [];

    return listIndoorRoomDetails(map.document).map((room) => ({
      roomId: room.spaceId,
      buildingPlaceId: building.id,
      buildingSlug: building.slug,
      buildingName: building.name,
      levelId: room.levelId,
      levelRef: room.levelRef,
      levelName: room.levelName,
      ref: room.ref,
      name: room.name,
      label: room.label,
      searchText: fold(
        [room.ref, room.name, room.levelRef, room.levelName, building.name]
          .filter(Boolean)
          .join(" "),
      ),
    }));
  });
}

/**
 * Ranks an exact room reference first, then a reference that starts with the
 * query, then anything containing every term. Someone typing "N101" means the
 * room called N101, not the first room in a building whose name contains an n.
 */
export function matchCampusRooms(
  index: readonly CampusRoomSearchEntry[],
  query: string,
  limit = 6,
): readonly CampusRoomSearchEntry[] {
  const trimmed = fold(query.trim());
  if (trimmed.length === 0) return [];

  const terms = trimmed.split(/\s+/).filter(Boolean);
  const scored = index.flatMap((entry) => {
    if (!terms.every((term) => entry.searchText.includes(term))) return [];

    const ref = fold(entry.ref);
    const rank =
      ref === trimmed
        ? 0
        : ref.startsWith(trimmed)
          ? 1
          : fold(entry.name).startsWith(trimmed)
            ? 2
            : 3;
    return [{ entry, rank }];
  });

  return scored
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.entry.buildingName.localeCompare(
          right.entry.buildingName,
          "en-AU",
        ) ||
        left.entry.ref.localeCompare(right.entry.ref, "en-AU", {
          numeric: true,
        }),
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
}

/** Finds one room by its stable identifier, for a deep link. */
export function findCampusRoom(
  index: readonly CampusRoomSearchEntry[],
  roomId: string,
): CampusRoomSearchEntry | null {
  return index.find((entry) => entry.roomId === roomId) ?? null;
}
