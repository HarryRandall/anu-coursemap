import { NextResponse } from "next/server";
import { findCampusPlace } from "@/lib/rooms/campus-map";
import { loadCampusMapData } from "@/lib/rooms/campus-map-data";
import {
  buildWalkingRouteUrl,
  parseWalkingRouteResponse,
} from "@/lib/rooms/routing";
import { getCanonicalSiteOrigin } from "@/lib/supabase/config";

const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const fromSlug = requestUrl.searchParams.get("from") ?? "";
  const toSlug = requestUrl.searchParams.get("to") ?? "";

  if (
    !SLUG_PATTERN.test(fromSlug) ||
    !SLUG_PATTERN.test(toSlug) ||
    fromSlug === toSlug
  ) {
    return NextResponse.json(
      { error: "Choose two different campus places." },
      { status: 400 },
    );
  }

  const { data, error } = await loadCampusMapData();
  if (error) {
    return NextResponse.json({ error }, { status: 503 });
  }

  const from = findCampusPlace(data.places, fromSlug);
  const to = findCampusPlace(data.places, toSlug);
  if (!from?.isRoutable || !to?.isRoutable) {
    return NextResponse.json(
      { error: "Walking directions are not available for those places." },
      { status: 404 },
    );
  }

  try {
    const routeUrl = buildWalkingRouteUrl(from, to);
    const siteOrigin = getCanonicalSiteOrigin() ?? "https://coursemap.app";
    const response = await fetch(routeUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": `Coursemap/0.1 (+${siteOrigin})`,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) throw new Error("Routing provider request failed.");
    const route = parseWalkingRouteResponse(await response.json());
    if (!route) throw new Error("Routing provider returned no usable route.");

    return NextResponse.json(route, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Walking directions are temporarily unavailable." },
      { status: 502 },
    );
  }
}
