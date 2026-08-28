"use server";

import { revalidatePath } from "next/cache";
import { canManageRooms } from "@/lib/auth/viewer";
import type { CampusMapData, CampusMapPlace } from "@/lib/rooms/campus-map";
import { loadCampusMapData } from "@/lib/rooms/campus-map-data";
import {
  createEmptyCampusIndoorDocument,
  parseCampusIndoorDocument,
  type CampusIndoorDocument,
} from "@/lib/rooms/indoor-map";
import { getSupabaseConfig, isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type CampusIndoorMapRow =
  Database["public"]["Tables"]["campus_indoor_maps"]["Row"];

export type { CampusIndoorDocument } from "@/lib/rooms/indoor-map";

export type CampusIndoorMapStatus = "draft" | "published" | "archived";

export type CampusIndoorMapEditorRecord = Readonly<{
  id: string | null;
  buildingPlaceId: string;
  name: string;
  status: CampusIndoorMapStatus;
  revision: number;
  document: CampusIndoorDocument;
  updatedAt: string | null;
}>;

export type CampusIndoorMapEditorData = Readonly<{
  mapData: CampusMapData;
  indoorMaps: CampusIndoorMapEditorRecord[];
}>;

export type SaveCampusIndoorMapInput = Readonly<{
  buildingPlaceId: string;
  name: string;
  document: unknown;
  revision: number;
  status: "draft" | "published";
}>;

export type SaveCampusIndoorMapResult = Readonly<{
  ok: boolean;
  message: string;
  revision: number;
}>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MAP_NAME_LENGTH = 200;

function isIndoorMapStatus(value: string): value is CampusIndoorMapStatus {
  return value === "draft" || value === "published" || value === "archived";
}

function isBuildingPlace(
  place: CampusMapPlace,
  mapData: CampusMapData,
): boolean {
  return (
    place.mapDisplayKind === "building" &&
    mapData.features.some(
      (feature) =>
        feature.featureKind === "building" && feature.placeId === place.id,
    )
  );
}

function emptyEditorRecord(place: CampusMapPlace): CampusIndoorMapEditorRecord {
  return {
    id: null,
    buildingPlaceId: place.id,
    name: `${place.name} indoor map`,
    status: "draft",
    revision: 0,
    document: createEmptyCampusIndoorDocument(),
    updatedAt: null,
  };
}

function editorRecord(row: CampusIndoorMapRow): CampusIndoorMapEditorRecord {
  if (!isIndoorMapStatus(row.status)) {
    throw new TypeError(`Indoor map '${row.id}' has an invalid status.`);
  }

  return {
    id: row.id,
    buildingPlaceId: row.building_place_id,
    name: row.name,
    status: row.status,
    revision: row.revision,
    document: parseCampusIndoorDocument(row.document),
    updatedAt: row.updated_at,
  };
}

function failure(message: string, revision = 0): SaveCampusIndoorMapResult {
  return { ok: false, message, revision };
}

/**
 * Load the published building directory first, then add draft and published
 * indoor documents visible through the authenticated rooms.manage policy.
 */
export async function loadIndoorMapEditorData(): Promise<CampusIndoorMapEditorData> {
  const { data: mapData, error: mapError } = await loadCampusMapData();
  const buildingPlaces = mapData.places.filter((place) =>
    isBuildingPlace(place, mapData),
  );

  if (mapError || buildingPlaces.length === 0) {
    return { mapData, indoorMaps: [] };
  }

  if (isDemoMode()) {
    return {
      mapData,
      indoorMaps: buildingPlaces.map(emptyEditorRecord),
    };
  }

  if (!getSupabaseConfig() || !(await canManageRooms())) {
    return { mapData, indoorMaps: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campus_indoor_maps")
    .select(
      "id,building_place_id,name,document,status,revision,source_provider,source_url,source_license,published_at,created_at,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error("Indoor map editor data could not be loaded.", {
      cause: error,
    });
  }

  const buildingIds = new Set(buildingPlaces.map((place) => place.id));
  const rowsByBuilding = new Map(
    ((data ?? []) as CampusIndoorMapRow[])
      .filter((row) => buildingIds.has(row.building_place_id))
      .map((row) => [row.building_place_id, editorRecord(row)]),
  );

  return {
    mapData,
    indoorMaps: buildingPlaces.map(
      (place) => rowsByBuilding.get(place.id) ?? emptyEditorRecord(place),
    ),
  };
}

/**
 * Save one building document using optimistic concurrency. The revision guard
 * makes the write atomic without silently replacing a newer editor save.
 */
export async function saveCampusIndoorMap(
  input: SaveCampusIndoorMapInput,
): Promise<SaveCampusIndoorMapResult> {
  if (!input || typeof input !== "object") {
    return failure("That indoor map is not valid.");
  }

  const buildingPlaceId = input.buildingPlaceId?.trim();
  const name = input.name?.trim();
  if (!UUID_PATTERN.test(buildingPlaceId)) {
    return failure("That building is not valid.");
  }
  if (!name || name.length > MAX_MAP_NAME_LENGTH) {
    return failure("Enter an indoor map name of 200 characters or fewer.");
  }
  if (input.status !== "draft" && input.status !== "published") {
    return failure("That indoor map status is not valid.");
  }
  if (!Number.isSafeInteger(input.revision) || input.revision < 0) {
    return failure("That indoor map revision is not valid.");
  }

  if (isDemoMode()) {
    return failure("Indoor maps cannot be saved in demo mode.");
  }
  if (!getSupabaseConfig()) {
    return failure("Indoor map storage is not configured.");
  }
  if (!(await canManageRooms())) {
    return failure("Room Finder management permission is required.");
  }

  let document: CampusIndoorDocument;
  try {
    document = parseCampusIndoorDocument(input.document);
  } catch {
    return failure("The indoor map document is not valid.");
  }

  const { data: mapData, error: mapError } = await loadCampusMapData();
  const building = mapData.places.find(
    (place) => place.id === buildingPlaceId && isBuildingPlace(place, mapData),
  );
  if (mapError || !building) {
    return failure("That published campus building could not be found.");
  }

  try {
    const supabase = await createClient();
    const { data: current, error: currentError } = await supabase
      .from("campus_indoor_maps")
      .select("id,revision")
      .eq("building_place_id", buildingPlaceId)
      .maybeSingle();

    if (currentError) throw currentError;

    const publishedAt =
      input.status === "published" ? new Date().toISOString() : null;
    const storedDocument = document as unknown as Json;
    let savedRevision: number;

    if (current) {
      if (
        !Number.isSafeInteger(current.revision) ||
        current.revision < 1 ||
        current.revision >= 2_147_483_647
      ) {
        return failure("The indoor map revision is not valid.");
      }
      if (input.revision !== current.revision) {
        return failure(
          "This indoor map changed while you were editing. Reload it and try again.",
          current.revision,
        );
      }

      const nextRevision = current.revision + 1;
      const { data: updated, error: updateError } = await supabase
        .from("campus_indoor_maps")
        .update({
          document: storedDocument,
          name,
          published_at: publishedAt,
          revision: nextRevision,
          status: input.status,
        })
        .eq("id", current.id)
        .eq("revision", current.revision)
        .select("revision")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updated) {
        const { data: latest } = await supabase
          .from("campus_indoor_maps")
          .select("revision")
          .eq("building_place_id", buildingPlaceId)
          .maybeSingle();
        return failure(
          "This indoor map changed while you were editing. Reload it and try again.",
          latest?.revision ?? current.revision,
        );
      }
      savedRevision = updated.revision;
    } else {
      if (input.revision !== 0) {
        return failure(
          "This indoor map no longer exists at the revision you opened. Reload it and try again.",
        );
      }

      const { data: inserted, error: insertError } = await supabase
        .from("campus_indoor_maps")
        .insert({
          building_place_id: buildingPlaceId,
          document: storedDocument,
          name,
          published_at: publishedAt,
          revision: 1,
          status: input.status,
        })
        .select("revision")
        .maybeSingle();

      if (insertError) {
        if (insertError.code === "23505") {
          const { data: latest } = await supabase
            .from("campus_indoor_maps")
            .select("revision")
            .eq("building_place_id", buildingPlaceId)
            .maybeSingle();
          return failure(
            "This indoor map was created elsewhere. Reload it and try again.",
            latest?.revision ?? 0,
          );
        }
        throw insertError;
      }
      if (!inserted) throw new Error("The indoor map insert returned no row.");
      savedRevision = inserted.revision;
    }

    revalidatePath("/admin/rooms");
    revalidatePath("/rooms");

    return {
      ok: true,
      message:
        input.status === "published"
          ? "Indoor map published."
          : "Indoor map draft saved.",
      revision: savedRevision,
    };
  } catch {
    return failure("The indoor map could not be saved.");
  }
}
