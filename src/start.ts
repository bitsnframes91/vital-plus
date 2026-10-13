import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// The Capacitor iOS shell loads its bundled UI from this origin and calls server
// functions cross-origin. Browsers never send it, so web pages cannot claim it, and
// server functions authenticate with a bearer token rather than cookies.
export const NATIVE_APP_ORIGINS = ["capacitor://localhost"];
const isNativeAppOrigin = (origin: string | null) =>
  origin !== null && NATIVE_APP_ORIGINS.includes(origin);

// CORS for server functions, limited to the native app origin.
const nativeAppCorsMiddleware = createMiddleware().server(
  async ({ request, handlerType, next }) => {
    const origin = request.headers.get("Origin");
    if (handlerType !== "serverFn" || !isNativeAppOrigin(origin)) return next();
    const headers = {
      "Access-Control-Allow-Origin": origin!,
      "Access-Control-Allow-Methods": "GET, POST",
      "Access-Control-Allow-Headers": "authorization, content-type, accept, x-tsr-serverfn",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const result = await next();
    for (const [key, value] of Object.entries(headers)) result.response.headers.set(key, value);
    return result;
  },
);

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  secFetchSite: (value, ctx) =>
    value === "same-origin" || isNativeAppOrigin(ctx.request.headers.get("Origin")),
  origin: (value, ctx) => value === new URL(ctx.request.url).origin || isNativeAppOrigin(value),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, nativeAppCorsMiddleware, csrfMiddleware],
}));
