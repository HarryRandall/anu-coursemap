import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";
import {
  getSupabaseCookieOptions,
  requireSupabaseConfig,
} from "@/lib/supabase/config";

type CookieWrite = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Create a request-scoped client for Proxy and Route Handlers. Cookie writes
 * and the cache-safety headers supplied by @supabase/ssr can be replayed onto
 * a redirect response without losing any cookie options.
 */
export function createRequestClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, publishableKey } = requireSupabaseConfig();
  const cookieWrites: CookieWrite[] = [];
  const responseHeaders = new Map<string, string>();

  const applyTo = (target: NextResponse) => {
    cookieWrites.forEach(({ name, value, options }) => {
      target.cookies.set(name, value, options);
    });
    responseHeaders.forEach((value, name) => {
      target.headers.set(name, value);
    });
    return target;
  };

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          cookieWrites.push({ name, value, options });
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          responseHeaders.set(name, value);
        });
        applyTo(response);
      },
    },
  });

  return { supabase, applyTo };
}
