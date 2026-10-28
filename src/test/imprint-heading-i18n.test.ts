import { afterEach, describe, expect, it } from "vitest";
import { imprintSections } from "@/lib/imprint";
import { setLanguage, translateText } from "@/lib/language";

describe("Impressum heading names the app in every language", () => {
  afterEach(() => setLanguage("de"));
  it("keeps the German source heading", () => {
    setLanguage("de");
    expect(imprintSections[0]!.title).toBe("Vitalplus von Fairvital");
    expect(translateText("Vitalplus von Fairvital")).toBe("Vitalplus von Fairvital");
  });
  it("English", () => {
    setLanguage("en");
    expect(translateText("Vitalplus von Fairvital")).toBe("Vitalplus from Fairvital");
  });
  it("Spanish", () => {
    setLanguage("es");
    expect(translateText("Vitalplus von Fairvital")).toBe("Vitalplus de Fairvital");
  });
});
