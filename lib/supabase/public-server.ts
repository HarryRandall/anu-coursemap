import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireSupabaseConfig } from "@/lib/supabase/config";

/**
 * A cookie-free client for public, published-only catalogue reads.
 *
 * Public catalogue routes must not depend on the viewer's session. Apart from
 * avoiding an unnecessary auth round trip, this keeps these responses safe to
 * cache independently of a student's plan and permissions.
 */
export function createPublicClient() {
  const { url, publishableKey } = requireSupabaseConfig();
  return createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
