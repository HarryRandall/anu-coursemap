const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export type FetchSourceOptions = {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  accept?: string;
};

function delay(milliseconds: number, signal?: AbortSignal) {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise<void>((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolvePromise();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      rejectPromise(signal?.reason ?? new Error("The fetch was aborted."));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function requestSignal(requestTimeoutMs: number, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * Fetch an official catalogue source with a per-request timeout and
 * exponential backoff for transient network and server failures.
 */
export async function fetchSourceWithRetry(
  url: string,
  {
    fetchImpl = fetch,
    signal,
    requestTimeoutMs = 30_000,
    retryAttempts = 3,
    retryDelayMs = 500,
    accept = "text/html,application/xhtml+xml",
  }: FetchSourceOptions = {},
): Promise<Response> {
  if (!Number.isInteger(retryAttempts) || retryAttempts < 1) {
    throw new TypeError("retryAttempts must be a positive integer");
  }
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
    throw new TypeError("requestTimeoutMs must be a positive integer");
  }

  let lastFailure: unknown;
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    signal?.throwIfAborted();
    try {
      const response = await fetchImpl(url, {
        headers: {
          Accept: accept,
          "User-Agent": "Coursemap catalogue importer (local development)",
        },
        redirect: "error",
        signal: requestSignal(requestTimeoutMs, signal),
      });
      if (!RETRYABLE_STATUS_CODES.has(response.status)) {
        return response;
      }
      lastFailure = new Error(
        `HTTP ${response.status} ${response.statusText}`.trim(),
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      lastFailure = error;
    }
    if (attempt < retryAttempts) {
      await delay(retryDelayMs * 2 ** (attempt - 1), signal);
    }
  }

  throw lastFailure instanceof Error
    ? lastFailure
    : new Error("The source could not be fetched.");
}
