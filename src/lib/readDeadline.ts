export const READ_TIMEOUT_MS = 15_000;
export const READ_FAILURE_EVENT = "nachtschicht:read-timeout";

export function withDeadline<T>(work: PromiseLike<T>, timeoutMs = READ_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Read timed out")), timeoutMs);
    Promise.resolve(work).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// Only reads are bounded here. Never retry, abort or reinterpret a financial write.
const READ_RPCS = new Set([
  "get_lounge_availability", "validate_discount_code", "get_purchased_tickets",
  "get_public_tracking_config",
]);

export function isBoundedRead(input: RequestInfo | URL, init: RequestInit | undefined, backendOrigin: string): boolean {
  const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
  const url = new URL(request?.url ?? String(input), window.location.origin);
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  if (url.origin !== backendOrigin) return false;
  if (method === "GET" || method === "HEAD") return url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/auth/v1/");
  return method === "POST" && url.pathname.startsWith("/rest/v1/rpc/") && READ_RPCS.has(url.pathname.split("/").pop() ?? "");
}

export function boundedReadFetch(fetcher: typeof fetch, backendOrigin: string): typeof fetch {
  return async (input, init) => {
    if (!isBoundedRead(input, init, backendOrigin)) return fetcher(input, init);
    const controller = new AbortController();
    const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
    const signal = init?.signal ?? request?.signal;
    const onAbort = () => controller.abort(signal?.reason);
    if (signal?.aborted) onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, READ_TIMEOUT_MS);
    try {
      // Include body download: received headers alone do not complete a data read.
      const response = await fetcher(input, { ...init, signal: controller.signal });
      const body = await response.arrayBuffer();
      return new Response(response.status === 204 || response.status === 304 || (init?.method ?? request?.method) === "HEAD" ? null : body, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      });
    } catch (error) {
      if (!timedOut && !signal?.aborted) {
        window.dispatchEvent(new Event(READ_FAILURE_EVENT));
        return new Response(JSON.stringify({ message: "Daten konnten nicht geladen werden", code: "READ_UNAVAILABLE" }), { status: 503, headers: { "Content-Type": "application/json" } });
      }
      if (!timedOut) throw error;
      window.dispatchEvent(new Event(READ_FAILURE_EVENT));
      return new Response(JSON.stringify({ message: "Ladezeit überschritten", code: "READ_TIMEOUT" }), { status: 504, headers: { "Content-Type": "application/json" } });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}