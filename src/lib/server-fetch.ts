import { isNativeApp, NATIVE_WEB_ORIGIN } from "@/lib/native-app";

/** A server function call answered with an HTTP error that carries no decodable result. */
export class ServerHttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
    this.name = "ServerHttpError";
  }
}

// Function ids are build-time hashes and safe to log. The query string can carry GET
// payloads, so it is never logged, and neither are headers, bodies or tokens.
function functionId(input: RequestInfo | URL): string {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return url.split("/_serverFn/")[1]?.split(/[/?#]/)[0]?.slice(0, 12) || "?";
}

/**
 * fetch for server function calls. The native bundle is served from capacitor://localhost
 * without a server, so its calls go to the hosted app. HTTP errors without a serialized
 * result (edge 404/413/429/5xx pages) become a ServerHttpError so callers can tell them apart.
 */
export async function serverFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const target =
    isNativeApp && typeof input === "string" && input.startsWith("/")
      ? NATIVE_WEB_ORIGIN + input
      : input;
  const fn = functionId(input);
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(target, init);
  } catch (error) {
    console.warn("[server-fn] request failed", {
      fn,
      error: error instanceof Error ? error.name : typeof error,
      online: navigator.onLine,
      ms: Date.now() - started,
    });
    throw error;
  }
  if (!response.ok) {
    const serialized = response.headers.get("x-tss-serialized") === "true";
    console.warn("[server-fn] HTTP error", {
      fn,
      status: response.status,
      serialized,
      ms: Date.now() - started,
    });
    if (!serialized && !response.headers.get("content-type")?.includes("application/json"))
      throw new ServerHttpError(response.status);
  }
  return response;
}

export type ServerCallFailure =
  | "offline"
  | "unreachable"
  | "timeout"
  | "unauthorized"
  | "rejected"
  | "notFound"
  | "tooLarge"
  | "rateLimited"
  | "server"
  | "failed";

// WebKit, Chromium and Firefox wording for a fetch that never got a response. WebKit
// reports a CORS rejection the same way, so it cannot be told apart from an outage.
const FETCH_FAILURE =
  /^(Load failed|Failed to fetch|NetworkError when attempting to fetch resource\.?)$/;
// WebKit gives up on a silent connection after about 60 s and reports it as a fetch failure.
const WEBKIT_TIMEOUT_MS = 55_000;

/** Maps a failed server function call to the cause the user can act on. */
export function classifyServerCallError(
  error: unknown,
  {
    timedOut = false,
    elapsedMs = 0,
    online = typeof navigator === "undefined" ? true : navigator.onLine,
  } = {},
): ServerCallFailure {
  if (timedOut) return "timeout";
  if (!online) return "offline";
  if (error instanceof ServerHttpError) {
    const { status } = error;
    if (status === 401) return "unauthorized";
    if (status === 403) return "rejected";
    if (status === 404) return "notFound";
    if (status === 408 || status === 504 || status === 524) return "timeout";
    if (status === 413) return "tooLarge";
    if (status === 429) return "rateLimited";
    return status >= 500 ? "server" : "failed";
  }
  if (error instanceof TypeError && FETCH_FAILURE.test(error.message))
    return elapsedMs >= WEBKIT_TIMEOUT_MS ? "timeout" : "unreachable";
  // requireSupabaseAuth rejects a missing or expired session with this prefix (serialized as HTTP 500).
  if (error instanceof Error && error.message.startsWith("Unauthorized")) return "unauthorized";
  return "failed";
}

export const httpStatusOf = (error: unknown) =>
  error instanceof ServerHttpError ? error.status : undefined;
