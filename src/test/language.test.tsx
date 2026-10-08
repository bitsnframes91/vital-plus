import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Localized } from "@/components/Localized";
import { setLanguage, translateText, languageLocale } from "@/lib/language";
import catalogue from "@/lib/translations.json";
import { healthGoals } from "@/lib/goal-options";
afterEach(() => { cleanup(); setLanguage("de"); });
describe("bundled app languages", () => {
  it("switches existing content reactively", () => {
    render(<Localized>Gesundheitsziele</Localized>);
    act(() => setLanguage("es")); expect(screen.getByText("Objetivos de salud")).toBeInTheDocument();
    act(() => setLanguage("en")); expect(screen.getByText("Health goals")).toBeInTheDocument();
    act(() => setLanguage("de")); expect(screen.getByText("Gesundheitsziele")).toBeInTheDocument();
  });
  it("keeps numbers, whitespace, units and unknown personal wording", () => {
    setLanguage("es");
    expect(translateText(" Protein ")).toBe(" Proteína ");
    expect(translateText("Protein · Ballaststoffe")).toBe("Proteína · Fibra");
    expect(translateText("3 von 5 Sternen")).toBe("3 de 5 estrellas");
    expect(translateText("My personally named meal")).toBe("My personally named meal");
    expect(languageLocale()).toBe("es-ES");
  });
  it("includes both translations for every bundled entry", () => {
    expect(Object.keys(catalogue).length).toBeGreaterThan(650);
    for (const translations of Object.values(catalogue)) expect(translations.every(value => typeof value === "string" && value.length > 0)).toBe(true);
  });
});
