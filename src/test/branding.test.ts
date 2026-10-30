import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import catalogue from "@/lib/translations.json";
import appleHealthCatalogue from "@/lib/apple-health-translations.json";
import { setLanguage, translateText } from "@/lib/language";
import { imprintSections } from "@/lib/imprint";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("fairvitalgo branding", () => {
  it("names the iOS app FairVital Go without changing its identity", () => {
    const plist = read("ios/App/App/Info.plist");
    expect(plist).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>FairVital Go<\/string>/);
    expect(plist).not.toMatch(/Vivo Health|Vital Plus|Vitalplus/);
    // Deep links keep the registered scheme.
    expect(plist).toMatch(
      /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>vivohealth<\/string>/,
    );
    const config = read("capacitor.config.ts");
    expect(config).toContain('appName: "FairVital Go"');
    expect(config).toContain('appId: "com.fairvital.vivohealth"');
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain(
      "PRODUCT_BUNDLE_IDENTIFIER = com.fairvital.vivohealth;",
    );
  });

  it("keeps the HealthKit record key so existing Apple Health entries stay recognised", () => {
    expect(read("ios/App/App/VitalHealthPlugin.swift")).toContain(
      'recordKey = "VitalPlusRecordId"',
    );
  });

  it("uses fairvitalgo in the web app manifest", () => {
    const manifest = JSON.parse(read("public/manifest.json")) as {
      name: string;
      short_name: string;
    };
    expect(manifest.short_name).toBe("fairvitalgo");
    expect(manifest.name).toMatch(/^fairvitalgo/);
  });

  it("keeps interface catalogue keys and their translations on the new name", () => {
    // Legal wording stays verbatim (Impressum heading, GDPR health-data consent), including its spelling.
    const onboarding = read("src/routes/onboarding.tsx");
    const legal = (key: string) =>
      key === imprintSections[0]!.title ||
      (key.startsWith("Ich willige ausdrücklich ein") && onboarding.includes(key));
    const entries = [
      ...Object.entries(catalogue as Record<string, string[]>),
      ...Object.entries(appleHealthCatalogue as Record<string, string[]>),
    ].filter(([key]) => !legal(key));
    const stale = entries.filter(([key, values]) =>
      [key, ...values].some((text) => /Vitalplus|Vital[ -]Plus/.test(text)),
    );
    expect(stale).toEqual([]);
    setLanguage("en");
    expect(translateText("fairvitalgo Konto")).toBe("fairvitalgo account");
    setLanguage("es");
    expect(translateText("fairvitalgo Startseite")).toBe("Página de inicio fairvitalgo");
    setLanguage("de");
  });

  it("points iOS Settings paths at the app's display name", () => {
    setLanguage("en");
    expect(
      translateText(
        "Schreiben ist in Apple Health nicht erlaubt. Erlaube es unter Einstellungen › Datenschutz & Sicherheit › Health › FairVital Go.",
      ),
    ).toBe(
      "Writing is not allowed in Apple Health. Allow it in Settings › Privacy & Security › Health › FairVital Go.",
    );
    setLanguage("de");
  });
});
