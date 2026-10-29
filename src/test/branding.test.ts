import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import catalogue from "@/lib/translations.json";
import { setLanguage, translateText } from "@/lib/language";
import { imprintSections } from "@/lib/imprint";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Vital Plus branding", () => {
  it("names the iOS app Vital Plus without changing its identity", () => {
    const plist = read("ios/App/App/Info.plist");
    expect(plist).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>Vital Plus<\/string>/);
    expect(plist).not.toContain("Vivo Health");
    // Deep links keep the registered scheme.
    expect(plist).toMatch(
      /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>vivohealth<\/string>/,
    );
    const config = read("capacitor.config.ts");
    expect(config).toContain('appName: "Vital Plus"');
    expect(config).toContain('appId: "com.fairvital.vivohealth"');
  });

  it("uses Vital Plus in the web app manifest", () => {
    const manifest = JSON.parse(read("public/manifest.json")) as {
      name: string;
      short_name: string;
    };
    expect(manifest.short_name).toBe("Vital Plus");
    expect(manifest.name).toMatch(/^Vital Plus/);
  });

  it("keeps interface catalogue keys and their translations on the new name", () => {
    // Legal wording stays verbatim (Impressum heading, GDPR health-data consent), including its spelling.
    const onboarding = read("src/routes/onboarding.tsx");
    const legal = (key: string) =>
      key === imprintSections[0]!.title ||
      (key.startsWith("Ich willige ausdrücklich ein") && onboarding.includes(key));
    const entries = Object.entries(catalogue as Record<string, string[]>).filter(
      ([key]) => !legal(key),
    );
    const stale = entries.filter(([key, values]) =>
      [key, ...values].some((text) => text.includes("Vitalplus")),
    );
    expect(stale).toEqual([]);
    setLanguage("en");
    expect(translateText("Vital Plus Konto")).toBe("Vital Plus account");
    setLanguage("es");
    expect(translateText("Vital Plus Startseite")).toBe("Página de inicio Vital Plus");
    setLanguage("de");
  });
});
