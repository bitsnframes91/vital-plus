import { afterEach, describe, expect, it } from "vitest";
import { setLanguage, translateText } from "@/lib/language";

describe("Heute tiles are fully translated", () => {
  afterEach(() => setLanguage("de"));
  it("Spanish", () => {
    setLanguage("es");
    expect(translateText("Schritte noch zu gehen")).toBe("Pasos por caminar");
    expect(translateText("24 / 27 Nährstoffe erfasst")).toBe("24 / 27 nutrientes registrados");
    expect(translateText(" – über dem Zielbereich")).toBe(" – por encima del rango objetivo");
  });
  it("English", () => {
    setLanguage("en");
    expect(translateText("2.000 Schritte")).toBe("2.000 steps");
    expect(translateText("Geschätzt · EU-Erwachsenenreferenz")).toBe("Estimated · EU adult reference");
  });
});
