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
  const codes = request.nextUrl.searchParams.getAll("code");
  const code = codes.length === 1 ? codes[0].trim() : "";

  if (!canonicalOrigin) {
    return noStore(
      new NextResponse("Coursemap authentication is not configured.", {
        status: 503,
      }),
    );
  }

  if (!code || !getSupabaseConfig()) {
    return errorRedirect(canonicalOrigin, next);
  }

  const response = noStore(
    NextResponse.redirect(new URL(next, canonicalOrigin), 303),
  );
  const { supabase, applyTo } = createRequestClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return applyTo(errorRedirect(canonicalOrigin, next));
  return response;
}
