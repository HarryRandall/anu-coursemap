import { type NextRequest, NextResponse } from "next/server";
import {
  getCanonicalSiteOrigin,
  getSupabaseConfig,
} from "@/lib/supabase/config";
import { createRequestClient } from "@/lib/supabase/request";

export async function POST(request: NextRequest) {
  const canonicalOrigin = getCanonicalSiteOrigin();
  if (!canonicalOrigin || !getSupabaseConfig()) {
    return new NextResponse("Coursemap authentication is not configured.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin !== canonicalOrigin) {
    return new NextResponse("Invalid request origin.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const signInUrl = new URL("/auth/sign-in", canonicalOrigin);
  signInUrl.searchParams.set("signedOut", "true");
  const response = NextResponse.redirect(signInUrl, 303);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');

  const { supabase, applyTo } = createRequestClient(request, response);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    return applyTo(
      new NextResponse("Coursemap could not sign out this browser.", {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      }),
    );
  }
  return response;
}
