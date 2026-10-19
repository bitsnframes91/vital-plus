// @vitest-environment-options {"url":"http://localhost/"}
// Runs on a native shell origin without a port, where Lovable's native-fetch installs itself.
// Note: package.json has "sideEffects": false, so the side-effect import of native-fetch in
// src/start.ts is currently dropped from every bundle and serverFetch alone routes the iOS app's
// server calls. This test guards the combination in case native-fetch is ever activated.
import { beforeAll, describe, expect, it, vi } from "vitest";

const requested: string[] = [];
let serverFetch: typeof import("@/lib/server-fetch").serverFetch;
let NATIVE_WEB_ORIGIN: string;
let PUBLISHED_APP_URL: string;

beforeAll(async () => {
  // The transport native-fetch wraps: records the final URL of every request.
  window.fetch = (async (input: RequestInfo | URL) => {
    requested.push(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    );
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  vi.stubEnv("VITE_NATIVE_APP", "true");
  vi.resetModules();
  ({ PUBLISHED_APP_URL } = await import("@/lib/native-origins"));
  await import("@/lib/native-fetch");
  ({ NATIVE_WEB_ORIGIN } = await import("@/lib/native-app"));
  ({ serverFetch } = await import("@/lib/server-fetch"));
});

describe("serverFetch with Lovable's native-fetch installed", () => {
  it("targets the same hosted app from both layers by default", () => {
    expect(NATIVE_WEB_ORIGIN).toBe(PUBLISHED_APP_URL);
  });

  it("rewrites a server function call exactly once", async () => {
    requested.length = 0;
    await serverFetch("/_serverFn/abc123?payload=1", { method: "GET" });
    expect(requested).toEqual([`${NATIVE_WEB_ORIGIN}/_serverFn/abc123?payload=1`]);
  });

  it("still routes other relative requests through native-fetch", async () => {
    requested.length = 0;
    await window.fetch("/robots.txt");
    expect(requested).toEqual([`${PUBLISHED_APP_URL}/robots.txt`]);
  });

  it("leaves absolute URLs such as Supabase untouched", async () => {
    requested.length = 0;
    await window.fetch("https://example.supabase.co/auth/v1/user");
    expect(requested).toEqual(["https://example.supabase.co/auth/v1/user"]);
  });
});
