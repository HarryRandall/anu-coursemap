"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  getSupabaseCookieOptions,
  requireSupabaseConfig,
} from "@/lib/supabase/config";

let browserClient: SupabaseClient<Database> | undefined;

export function createClient() {
  if (browserClient) return browserClient;

  const { url, publishableKey } = requireSupabaseConfig();
  browserClient = createBrowserClient<Database>(url, publishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
  });
  return browserClient;
}
