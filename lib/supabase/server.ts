import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import {
  getSupabaseCookieOptions,
  requireSupabaseConfig,
} from "@/lib/supabase/config";

/** Create a fresh Supabase client for the current server request. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = requireSupabaseConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The request proxy refreshes
          // sessions and applies the required response headers before rendering.
        }
      },
    },
  });
}
