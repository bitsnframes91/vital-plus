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
    const copy = termsCopy[lang];
    expect(copy.sections.length).toBe(10);
    const headings = copy.sections[6].blocks.flatMap(block => (block.h ? [block.h] : []));
    expect(headings.length).toBe(10);
    expect(headings[0].startsWith("7.1")).toBe(true);
    expect(headings[9].startsWith("7.10")).toBe(true);
    const articles = copy.sections[6].blocks.find(block => block.list?.some(item => item.startsWith("Art. 5 ")))?.list;
    expect(articles?.length).toBe(13);
  }
});

it("translates the terms instead of repeating the German copy", () => {
  for (const lang of ["en", "es"] as const) {
    const text = JSON.stringify(termsCopy[lang]);
    expect(text.includes("Geltungsbereich")).toBe(false);
    expect(text.includes("Gesundheitsdaten")).toBe(false);
    expect(text.includes("Deine")).toBe(false);
    expect(termsCopy[lang].sections[0].title).not.toBe(termsCopy.de.sections[0].title);
    expect(termsCopy[lang].closing[1]).not.toBe(termsCopy.de.closing[1]);
  }
});
