import { afterEach, describe, expect, it, vi } from "vitest";

import { classifyServerCallError, ServerHttpError, serverFetch } from "@/lib/server-fetch";

describe("server function error classification", () => {
  it.each([
    [401, "unauthorized"],
    [403, "rejected"],
    [404, "notFound"],
    [413, "tooLarge"],
    [429, "rateLimited"],
    [500, "server"],
    [502, "server"],
    [504, "timeout"],
    [418, "failed"],
  ] as const)("maps HTTP %i to %s", (status, kind) => {
    expect(classifyServerCallError(new ServerHttpError(status), { online: true })).toBe(kind);
  });

  // Regression: production rejected the capacitor:// preflight, WebKit reported "Load failed"
  // and the app told users with a working connection that they were offline.
  it("does not report an unreachable or CORS-blocked server as offline", () => {
    expect(
      classifyServerCallError(new TypeError("Load failed"), { online: true, elapsedMs: 300 }),
    ).toBe("unreachable");
    expect(classifyServerCallError(new TypeError("Failed to fetch"), { online: true })).toBe(
      "unreachable",
    );
  });

  it("reports offline only when the device is offline", () => {
    expect(classifyServerCallError(new TypeError("Load failed"), { online: false })).toBe(
      "offline",
    );
  });

  it("recognizes timeouts from the client limit and from WebKit", () => {
    expect(
      classifyServerCallError(new DOMException("aborted", "AbortError"), { timedOut: true }),
    ).toBe("timeout");
    expect(
      classifyServerCallError(new TypeError("Load failed"), { online: true, elapsedMs: 60_000 }),
    ).toBe("timeout");
  });

  it("recognizes a rejected session from the auth middleware", () => {
    expect(
      classifyServerCallError(new Error("Unauthorized: Invalid token"), { online: true }),
    ).toBe("unauthorized");
  });

  it("does not mistake programming errors for network problems", () => {
    expect(
      classifyServerCallError(new TypeError("Cannot read properties of undefined"), {
        online: true,
      }),
    ).toBe("failed");
  });
});

describe("serverFetch", () => {
  afterEach(() => vi.restoreAllMocks());

  it("turns an HTTP error page into a ServerHttpError with its status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Payload Too Large", { status: 413, headers: { "content-type": "text/plain" } }),
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(serverFetch("/_serverFn/abc", { method: "POST" })).rejects.toMatchObject({
      name: "ServerHttpError",
      status: 413,
    });
  });

  it("passes serialized server errors through for the client to decode", async () => {
    const response = new Response("{}", {
      status: 500,
      headers: { "content-type": "application/json", "x-tss-serialized": "true" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(serverFetch("/_serverFn/abc", { method: "POST" })).resolves.toBe(response);
  });

  it("logs failures without the query string, headers or body", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Load failed"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const init = {
      method: "POST",
      headers: { Authorization: "Bearer secret.jwt.token" },
      body: "AUDIO-PAYLOAD",
    };
    await expect(
      serverFetch("/_serverFn/f572424ddf4d13de997e?payload=private", init),
    ).rejects.toThrow("Load failed");
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("f572424ddf4d");
    expect(logged).not.toMatch(/private|secret|AUDIO-PAYLOAD|Bearer/);
  });
});
