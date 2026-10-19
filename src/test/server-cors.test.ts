// Guards Lovable's native-origin CORS in src/server.ts (behaviour only; the implementation is Lovable's).
import { describe, expect, it, vi } from "vitest";

const handled: Request[] = [];
vi.mock("@tanstack/react-start/server-entry", () => ({
  default: {
    fetch: (request: Request) => {
      handled.push(request);
      return new Response('{"ok":true}', {
        status: 200,
        headers: { "content-type": "application/json", "x-tss-serialized": "true" },
      });
    },
  },
}));

const { default: server } = await import("@/server");
const call = (method: string, origin?: string) =>
  server.fetch(
    new Request("https://vital-plus.lovable.app/_serverFn/abc", {
      method,
      headers: {
        ...(origin ? { Origin: origin } : {}),
        ...(method === "OPTIONS" ? { "Access-Control-Request-Method": "POST" } : {}),
      },
      ...(method === "POST" ? { body: "{}" } : {}),
    }),
    {},
    {},
  );

describe("native-origin CORS (src/server.ts)", () => {
  it("answers the iOS app's preflight without reaching the app", async () => {
    handled.length = 0;
    const response = await call("OPTIONS", "capacitor://localhost");
    expect(response.status).toBe(204);
    expect(handled).toHaveLength(0);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(response.headers.get("Access-Control-Allow-Headers")).toMatch(/Authorization/);
    expect(response.headers.get("Access-Control-Allow-Headers")).toMatch(/x-tsr-serverFn/);
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  it("adds CORS headers to the iOS app's server function responses", async () => {
    const response = await call("POST", "capacitor://localhost");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"ok":true}');
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(response.headers.get("Access-Control-Expose-Headers")).toMatch(/x-tss-serialized/);
    expect(response.headers.get("x-tss-serialized")).toBe("true");
  });

  it.each([undefined, "https://vital-plus.lovable.app", "https://evil.example"])(
    "adds no CORS headers for origin %s",
    async (origin) => {
      handled.length = 0;
      const preflight = await call("OPTIONS", origin);
      expect(handled).toHaveLength(1);
      expect(preflight.headers.get("Access-Control-Allow-Origin")).toBeNull();
      const response = await call("POST", origin);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    },
  );
});
