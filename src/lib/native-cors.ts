import { createMiddleware } from "@tanstack/react-start";

// The Capacitor iOS shell loads its bundled UI from this origin and calls server
// functions cross-origin. Browsers never send it, so web pages cannot claim it, and
// server functions authenticate with a bearer token rather than cookies.
export const NATIVE_APP_ORIGINS = ["capacitor://localhost"];
export const isNativeAppOrigin = (origin: string | null) =>
  origin !== null && NATIVE_APP_ORIGINS.includes(origin);

// The server function client decides how to decode a response from these headers.
// Cross-origin pages only see CORS-safelisted headers unless they are exposed, so
// without this WKWebView receives results it cannot deserialize.
const EXPOSED_HEADERS = "x-tss-serialized, x-tss-raw";

export function nativeAppCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST",
    "Access-Control-Allow-Headers": "authorization, content-type, accept, x-tsr-serverfn",
    "Access-Control-Expose-Headers": EXPOSED_HEADERS,
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

// CORS for server functions, limited to the native app origin. Runs before the CSRF
// middleware so the preflight, which carries no credentials, is answered here.
export const nativeAppCorsMiddleware = createMiddleware().server(
  async ({ request, handlerType, next }) => {
    const origin = request.headers.get("Origin");
    if (handlerType !== "serverFn" || !isNativeAppOrigin(origin)) return next();
    const headers = nativeAppCorsHeaders(origin!);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const result = await next();
    for (const [key, value] of Object.entries(headers)) result.response.headers.set(key, value);
    return result;
  },
);
