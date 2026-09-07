import { type NextRequest, NextResponse } from "next/server";
import { safeInternalRedirect } from "@/lib/auth/redirect";
import {
  getCanonicalSiteOrigin,
  getSupabaseConfig,
} from "@/lib/supabase/config";
import { createRequestClient } from "@/lib/supabase/request";

function noStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function errorRedirect(origin: string, next: string) {
  const url = new URL("/auth/error", origin);
  url.searchParams.set("next", next);
  return noStore(NextResponse.redirect(url, 303));
}

export async function GET(request: NextRequest) {
  const next = safeInternalRedirect(request.nextUrl.searchParams.get("next"));
  const canonicalOrigin = getCanonicalSiteOrigin();
  const tokenHashes = request.nextUrl.searchParams.getAll("token_hash");
  const types = request.nextUrl.searchParams.getAll("type");
  const tokenHash = tokenHashes.length === 1 ? tokenHashes[0].trim() : "";
  const type = types.length === 1 ? types[0] : "";

  if (!canonicalOrigin) {
    return noStore(
      new NextResponse("Coursemap authentication is not configured.", {
        status: 503,
      }),
    );
  }

  if (!tokenHash || type !== "email" || !getSupabaseConfig()) {
    return errorRedirect(canonicalOrigin, next);
  }

  const response = noStore(
    NextResponse.redirect(new URL(next, canonicalOrigin), 303),
  );
  const { supabase, applyTo } = createRequestClient(request, response);
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) return applyTo(errorRedirect(canonicalOrigin, next));
  return response;
}
