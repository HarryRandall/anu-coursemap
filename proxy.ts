import { type NextRequest, NextResponse } from "next/server";
import {
  requestPathWithSearch,
  safeInternalRedirect,
} from "@/lib/auth/redirect";
import {
  getCanonicalSiteOrigin,
  getSupabaseConfig,
  isDemoMode,
} from "@/lib/supabase/config";
import { createRequestClient } from "@/lib/supabase/request";

const PROTECTED_ROUTE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/onboarding",
  "/plan",
  "/profile",
  "/requirements",
  "/academic",
  "/calendar",
  "/roadmap",
  "/rooms",
  "/help",
  "/history",
  "/timetable",
] as const;

function privateNoStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function signInRedirect(request: NextRequest, reason?: string) {
  const canonicalOrigin = getCanonicalSiteOrigin();
  if (!canonicalOrigin) {
    return new NextResponse("Coursemap authentication is not configured.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const signInUrl = new URL("/auth/sign-in", canonicalOrigin);
  signInUrl.searchParams.set(
    "next",
    safeInternalRedirect(requestPathWithSearch(request.nextUrl)),
  );
  if (reason) signInUrl.searchParams.set("reason", reason);
  return privateNoStore(NextResponse.redirect(signInUrl));
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  const protectedRoute = isProtectedRoute(request.nextUrl.pathname);

  if (isDemoMode()) return response;

  if (!getSupabaseConfig()) {
    return protectedRoute ? signInRedirect(request, "configuration") : response;
  }

  const { supabase, applyTo } = createRequestClient(request, response);
  const { data, error } = await supabase.auth.getClaims();
  const authenticated = !error && Boolean(data?.claims.sub);

  if (protectedRoute && !authenticated) {
    return applyTo(signInRedirect(request));
  }

  const downstreamResponse = applyTo(
    NextResponse.next({
      request: { headers: request.headers },
    }),
  );

  return authenticated
    ? privateNoStore(downstreamResponse)
    : downstreamResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
