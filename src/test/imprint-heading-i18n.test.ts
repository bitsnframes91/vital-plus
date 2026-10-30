import { afterEach, describe, expect, it } from "vitest";
import { imprintSections } from "@/lib/imprint";
import { setLanguage, translateText } from "@/lib/language";

describe("Impressum heading names the app in every language", () => {
  afterEach(() => setLanguage("de"));
  it("keeps the German source heading", () => {
    setLanguage("de");
    expect(imprintSections[0]?.title).toBe("fairvitalgo von Fairvital");
    expect(translateText("fairvitalgo von Fairvital")).toBe("fairvitalgo von Fairvital");
  });
  it("English", () => {
    setLanguage("en");
    expect(translateText("fairvitalgo von Fairvital")).toBe("fairvitalgo from Fairvital");
  });
  it("Spanish", () => {
    setLanguage("es");
    expect(translateText("fairvitalgo von Fairvital")).toBe("fairvitalgo de Fairvital");
  });
});
