import { describe, expect, it, vi } from "vitest";

import { nativeAppCorsMiddleware } from "@/lib/native-cors";

type ServerMiddleware = (ctx: {
  request: Request;
  handlerType: string;
  next: () => Promise<{ response: Response }>;
}) => Promise<Response | { response: Response }>;
const run = (nativeAppCorsMiddleware.options as unknown as { server: ServerMiddleware }).server;
const fnUrl = "https://vital-plus.lovable.app/_serverFn/abc";
const serialized = () => ({
  response: new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json", "x-tss-serialized": "true" },
  }),
});

describe("native app CORS for server functions", () => {
  it("answers the WKWebView preflight before CSRF checks", async () => {
    const next = vi.fn(async () => serialized());
    const request = new Request(fnUrl, {
      method: "OPTIONS",
      headers: { Origin: "capacitor://localhost", "Access-Control-Request-Method": "POST" },
    });
    const response = (await run({ request, handlerType: "serverFn", next })) as Response;
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
  });

  // Regression: without exposed headers WKWebView cannot see x-tss-serialized and the
  // server function client returns the raw serialized payload instead of the result.
  it("exposes the headers the server function client decodes responses with", async () => {
    const request = new Request(fnUrl, {
      method: "POST",
      headers: { Origin: "capacitor://localhost" },
    });
    const { response } = (await run({
      request,
      handlerType: "serverFn",
      next: async () => serialized(),
    })) as { response: Response };
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    const exposed = response.headers
      .get("Access-Control-Expose-Headers")
      ?.split(",")
      .map((h) => h.trim());
    expect(exposed).toEqual(expect.arrayContaining(["x-tss-serialized", "x-tss-raw"]));
  });

  it("leaves other origins and page requests untouched", async () => {
    for (const [origin, handlerType] of [
      ["capacitor://evil", "serverFn"],
      ["https://evil.example", "serverFn"],
      ["capacitor://localhost", "router"],
    ] as const) {
      const request = new Request(fnUrl, { method: "POST", headers: { Origin: origin } });
      const { response } = (await run({
        request,
        handlerType,
        next: async () => serialized(),
      })) as { response: Response };
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    }
  });
});
