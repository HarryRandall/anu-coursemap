export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
    this.name = "SupabaseConfigurationError";
  }
}

export function isDemoMode() {
  if (process.env.COURSEMAP_DEMO_MODE !== "true" || process.env.VERCEL) {
    return false;
  }

  const origin = getCanonicalSiteOrigin();
  if (!origin) return false;
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getSupabaseConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }
    if (parsedUrl.username || parsedUrl.password) return null;
  } catch {
    return null;
  }

  return { url, publishableKey };
}

export function getCanonicalSiteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const localHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp) return null;
    if (url.username || url.password) return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Keep production redirects on the configured canonical origin while allowing
 * a local development server to use the port that received the request.
 */
export function getSiteOriginForRequest(
  requestUrl: URL,
  requestHost?: string | null,
) {
  const canonicalOrigin = getCanonicalSiteOrigin();
  if (!canonicalOrigin) return null;

  const canonicalUrl = new URL(canonicalOrigin);
  const localCanonical =
    canonicalUrl.protocol === "http:" && isLocalHostname(canonicalUrl.hostname);
  if (!localCanonical) return canonicalOrigin;

  if (requestHost) {
    try {
      const hostUrl = new URL(`http://${requestHost}`);
      if (
        !hostUrl.username &&
        !hostUrl.password &&
        hostUrl.pathname === "/" &&
        !hostUrl.search &&
        !hostUrl.hash &&
        isLocalHostname(hostUrl.hostname)
      ) {
        return hostUrl.origin;
      }
    } catch {
      // Fall back to the validated request URL or canonical origin.
    }
  }

  const localRequest =
    requestUrl.protocol === "http:" && isLocalHostname(requestUrl.hostname);
  return localRequest ? requestUrl.origin : canonicalOrigin;
}

export function getSupabaseCookieOptions() {
  const origin = getCanonicalSiteOrigin();
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: origin ? new URL(origin).protocol === "https:" : true,
  };
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config) throw new SupabaseConfigurationError();
  return config;
}
