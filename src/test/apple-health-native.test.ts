import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalogue from "@/lib/translations.json";

// Static checks for the native HealthKit setup and the privacy boundary. Xcode compilation and
// on-device behaviour are verified separately (CI Simulator build, physical iPhone checklist).
const root = join(__dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("native HealthKit configuration", () => {
  it("declares HealthKit usage while keeping camera and microphone", () => {
    const plist = read("ios/App/App/Info.plist");
    for (const key of [
      "NSHealthShareUsageDescription",
      "NSHealthUpdateUsageDescription",
      "NSMicrophoneUsageDescription",
      "NSCameraUsageDescription",
    ])
      expect(plist).toContain(`<key>${key}</key>`);
  });

  it("enables only the HealthKit entitlement for the App target", () => {
    const entitlements = read("ios/App/App/App.entitlements");
    expect(entitlements).toMatch(/<key>com\.apple\.developer\.healthkit<\/key>\s*<true\/>/);
    expect(entitlements).not.toContain("background-delivery");
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(project.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g)).toHaveLength(2);
    expect(project).toContain("VitalHealthPlugin.swift in Sources");
    expect(project.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.fairvital\.vivohealth;/g)).toHaveLength(
      2,
    );
  });

  it("registers the Health plugin next to the Keychain plugin", () => {
    const controller = read("ios/App/App/MainViewController.swift");
    expect(controller).toContain("registerPluginInstance(SecureSessionStoragePlugin())");
    expect(controller).toContain("registerPluginInstance(VitalHealthPlugin())");
  });

  it("writes only app-originated types, deletes only its own samples and never logs", () => {
    const swift = read("ios/App/App/VitalHealthPlugin.swift");
    expect(swift).toContain('public let jsName = "VitalHealth"');
    expect(swift).toContain(
      'private static let writable: Set<String> = ["bodyMass", "dietaryWater", "dietaryEnergyConsumed", "activeEnergyBurned"]',
    );
    expect(swift).toMatch(/HKQuery\.predicateForObjects\(from: HKSource\.default\(\)\)/);
    expect(swift).toContain("HKMetadataKeySyncIdentifier");
    expect(swift).toContain("isExcludedFromBackup = true");
    expect(swift).toContain(".completeFileProtection");
    expect(swift).not.toMatch(/\b(print|NSLog|os_log|debugPrint)\(|Logger\(/);
  });
});

describe("Apple Health privacy boundary", () => {
  const files = [
    ...readdirSync(join(root, "src/lib/apple-health")).map((f) => `src/lib/apple-health/${f}`),
    "src/components/AppleHealth.tsx",
  ];

  it("never talks to Supabase, server functions, AI or the network", () => {
    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toMatch(
        /integrations\/supabase|\.functions["']|createServerFn|fetch\(|XMLHttpRequest|sendBeacon|console\.(log|info|debug)/,
      );
    }
  });

  it("only reads the synced store, never writes to it", () => {
    const component = read("src/components/AppleHealth.tsx");
    expect(component).toMatch(/const \{ s \} = useStore\(\);/);
    expect(component).not.toMatch(/\bset\(\{|useStore\(\)\.set/);
  });

  it("existing meal and voice workflows do not depend on Apple Health", () => {
    for (const file of [
      "src/routes/ernaehrung.tsx",
      "src/components/VoiceMealEntry.tsx",
      "src/lib/record-wav.ts",
      "src/lib/store.tsx",
    ])
      expect(read(file), file).not.toContain("apple-health");
  });

  it("has German, English and Spanish copy for every Apple Health text", () => {
    const component = read("src/components/AppleHealth.tsx");
    const texts = new Set([
      ...[...component.matchAll(/<Localized>\s*\{([^}]*)\}\s*<\/Localized>/g)].flatMap((m) =>
        [...m[1]!.matchAll(/"([^"]+)"/g)].map((q) => q[1]!),
      ),
      ...[...component.matchAll(/setError\("([^"]+)"\)/g)].map((m) => m[1]!),
      ...[...component.matchAll(/label="([^"]+)"/g)].map((m) => m[1]!),
      ...[...component.matchAll(/unit="([^"]+)"/g)].map((m) => m[1]!),
    ]);
    const units = new Set(["kcal", "kg", "ml"]);
    for (const text of texts) if (!units.has(text)) expect(catalogue, text).toHaveProperty([text]);
  });
});
