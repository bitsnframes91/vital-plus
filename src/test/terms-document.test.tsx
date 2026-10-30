import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TermsDocument } from "../components/TermsDocument";
import { termsCopy } from "../lib/terms";

const languages = ["de", "en", "es"] as const;

it("shows the supplied terms with its date, data-protection section and contact address", () => {
  render(<TermsDocument copy={termsCopy.de} />);
  expect(screen.getByText("Stand: 30. Oktober 2026")).toBeTruthy();
  expect(screen.getByText("fairvitalgo® – Deine Gesundheit. Deine Daten. Deine Privatsphäre.")).toBeTruthy();
  expect(screen.getByText("7. Datenschutz, Datensicherheit und vollständige Datenlöschung")).toBeTruthy();
  expect(screen.getByText("fairvitalgo® stellt hierfür die Funktion „Profil → Meine Daten → Konto löschen“ zur Verfügung.")).toBeTruthy();
  expect(screen.getByText(/Eurode-Park 1-39/)).toBeTruthy();
  expect(screen.getByText("Deine Gesundheit. Deine Daten. Deine Entscheidung.")).toBeTruthy();
});

it("keeps every numbered section and all ten sub-sections of the data-protection chapter", () => {
  for (const lang of languages) {
    const chapter = termsCopy[lang].sections[6];
    expect(termsCopy[lang].sections.length).toBe(10);
    expect(chapter?.title.startsWith("7.")).toBe(true);
    const headings = chapter?.blocks.flatMap(block => (block.h ? [block.h] : [])) ?? [];
    expect(headings.length).toBe(10);
    expect(headings[0]?.startsWith("7.1")).toBe(true);
    expect(headings[9]?.startsWith("7.10")).toBe(true);
    const articles = chapter?.blocks.find(block => block.list?.some(item => item.startsWith("Art. 5 ")))?.list;
    expect(articles?.length).toBe(13);
  }
});

it("translates the terms instead of repeating the German copy", () => {
  expect(termsCopy.en.sections[0]?.title).toBe("1. Scope and provider");
  expect(termsCopy.es.sections[0]?.title).toBe("1. Ámbito y proveedor");
  expect(termsCopy.en.closing[1]).toBe("Your health. Your data. Your decision.");
  expect(termsCopy.es.closing[1]).toBe("Tu salud. Tus datos. Tu decisión.");
  for (const lang of ["en", "es"] as const) {
    const text = JSON.stringify(termsCopy[lang]);
    expect(text.includes("Geltungsbereich")).toBe(false);
    expect(text.includes("Gesundheitsdaten")).toBe(false);
    expect(text.includes("Deine")).toBe(false);
  }
});
