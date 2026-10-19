import { describe, expect, it } from "vitest";

import { deepLinkPath } from "@/mobile/native-shell";
import { isNativeApp, publicAppUrl } from "@/lib/native-app";

describe("native deep links", () => {
  it("maps the app scheme to in-app paths", () => {
    expect(deepLinkPath("vivohealth://heute")).toBe("/heute");
    expect(deepLinkPath("vivohealth://profil/einstellungen?x=1")).toBe("/profil/einstellungen?x=1");
    expect(deepLinkPath("vivohealth://")).toBe("/");
  });

  it("accepts links to the hosted app origin", () => {
    expect(deepLinkPath("https://vital-plus.lovable.app/ernaehrung")).toBe("/ernaehrung");
  });

  it("rejects foreign origins and unsafe paths", () => {
    expect(deepLinkPath("https://evil.example/heute")).toBeNull();
    expect(deepLinkPath("javascript:alert(1)")).toBeNull();
    expect(deepLinkPath("vivohealth://heute/<script>")).toBeNull();
    expect(deepLinkPath("vivohealth://heute/%2F%2Fevil.example")).toBeNull();
    expect(deepLinkPath("not a url")).toBeNull();
  });
});

describe("public app URLs", () => {
  it("keep using the page origin outside the native bundle", () => {
    expect(isNativeApp).toBe(false);
    expect(publicAppUrl("/reset-password")).toBe(`${window.location.origin}/reset-password`);
  });
});
