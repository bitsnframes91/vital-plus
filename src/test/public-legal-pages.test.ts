import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateLegalSearch } from "@/components/PublicLegalPage";

// App Store Connect needs a public Privacy Policy URL and Support URL; these pages need no account.
describe("public legal pages", () => {
  it("accept only the bundled languages and ignore anything else", () => {
    expect(validateLegalSearch({ lang: "en" })).toEqual({ lang: "en" });
    expect(validateLegalSearch({ lang: "es" })).toEqual({ lang: "es" });
    expect(validateLegalSearch({ lang: "fr" })).toEqual({});
    expect(validateLegalSearch({})).toEqual({});
  });

  it("render the bundled texts outside the signed-in app shell", () => {
    const pages = {
      "src/routes/datenschutz.tsx": "privacyCopy",
      "src/routes/nutzungsbedingungen.tsx": "termsCopy",
      "src/routes/impressum.tsx": "imprintSections",
      "src/routes/support.tsx": "service@fairvital.com",
    };
    for (const [file, content] of Object.entries(pages)) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain(content);
      expect(source).toContain("staticData: { sitemap: true }");
      expect(source).not.toContain("AppShell");
    }
    expect(readFileSync("src/components/AppShell.tsx", "utf8")).not.toMatch(
      /PROTECTED[^\n]*(datenschutz|support|impressum)/,
    );
  });
});
