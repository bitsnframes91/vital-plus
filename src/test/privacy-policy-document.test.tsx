import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TermsDocument } from "../components/TermsDocument";
import { privacyCopy } from "../lib/privacy-policy";

const languages = ["de", "en", "es"] as const;

it("shows the supplied privacy notice with its promise, contact address and deletion path", () => {
  render(<TermsDocument copy={privacyCopy.de} />);
  expect(screen.getByText("fairvitalgo® – Deine Gesundheit. Deine Daten. Deine Privatsphäre.")).toBeTruthy();
  expect(screen.getByText("Unser Datenschutzversprechen")).toBeTruthy();
  expect(screen.getByText("Deutsche Serverstandorte:")).toBeTruthy();
  expect(screen.getByText("Profil → Meine Daten → Konto löschen")).toBeTruthy();
  expect(screen.getByText(/Eurode-Park 1-39/)).toBeTruthy();
  expect(screen.getByText("fairvitalgo® – Weil deine Gesundheit Privatsache ist.")).toBeTruthy();
});

it("keeps all fifteen numbered sections and every numbered sub-section", () => {
  for (const lang of languages) {
    const copy = privacyCopy[lang];
    expect(copy.sections.length).toBe(16);
    expect(copy.sections[1]?.title.startsWith("1.")).toBe(true);
    expect(copy.sections[15]?.title.startsWith("15.")).toBe(true);
    const subCounts = [3, 4, 5, 9, 10].map(index => copy.sections[index]?.blocks.filter(block => block.h?.match(/^\d+\.\d/)).length ?? 0);
    expect(subCounts).toEqual([3, 4, 3, 4, 6]);
    const principles = copy.sections[0]?.blocks.find(block => block.items)?.items;
    expect(principles?.length).toBe(8);
    expect(copy.sections[15]?.blocks.find(block => block.items)?.items?.length).toBe(13);
  }
});

it("translates the privacy notice instead of repeating the German copy", () => {
  expect(privacyCopy.en.sections[0]?.title).toBe("Our data protection promise");
  expect(privacyCopy.es.sections[0]?.title).toBe("Nuestra promesa de protección de datos");
  expect(privacyCopy.en.closing[1]).toBe("Your health is yours. So is your data.");
  expect(privacyCopy.es.closing[1]).toBe("Tu salud es tuya. Tus datos también.");
  for (const lang of ["en", "es"] as const) {
    const text = JSON.stringify(privacyCopy[lang]);
    expect(text.includes("Geltungsbereich")).toBe(false);
    expect(text.includes("Gesundheitsdaten")).toBe(false);
    expect(text.includes("Deine")).toBe(false);
  }
});
