import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// iOS zooms into focused inputs below 16px and keeps the zoom after the keyboard closes.
const root = join(__dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Mahlzeit hinzufügen inputs on iOS", () => {
  it("get 16px in the native shell only, scoped to the meal form", () => {
    const css = read("src/mobile/native.css");
    expect(css).toMatch(
      /html\[data-native-app\] form\[data-meal-form\] input \{\s*font-size: 16px;\s*\}/,
    );
    expect(read("src/styles.css")).not.toContain("data-meal-form");
  });

  it("marks only the Mahlzeit hinzufügen form", () => {
    const page = read("src/routes/ernaehrung.tsx");
    expect(page.match(/data-meal-form/g)).toHaveLength(1);
    expect(page).toMatch(/<form onSubmit=\{\(e\) => void add\(e\)\} data-meal-form /);
    const form = page.slice(page.indexOf("data-meal-form"), page.indexOf("</form>"));
    expect(form).toContain('aria-label={translateText("Mahlzeit")}');
    expect(form).toContain('aria-label={translateText("Kalorien")}');
    expect(form).toContain('aria-label={translateText("Protein in g")}');
  });

  it("keeps the viewport zoomable for accessibility", () => {
    const viewport = read("src/routes/__root.tsx").match(/name: "viewport",[\s\S]*?\},/)?.[0] ?? "";
    expect(viewport).toContain("width=device-width, initial-scale=1");
    expect(viewport).not.toMatch(/maximum-scale|user-scalable|minimum-scale/);
  });
});
