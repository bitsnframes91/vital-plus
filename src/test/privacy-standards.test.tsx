import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PrivacyStandards } from "../components/PrivacyStandards";
import { privacyStandards } from "../lib/privacy-standards";

it("shows the supplied privacy statement with its standards and closing line", () => {
  render(<PrivacyStandards />);
  expect(screen.getByText("Deine Gesundheit. Deine Daten. Deine Privatsphäre.")).toBeTruthy();
  expect(screen.getByText("Serverstandort Deutschland")).toBeTruthy();
  expect(
    screen.getByText(
      "Du kannst jederzeit die Löschung deines Kontos und deiner persönlichen Gesundheitsdaten veranlassen. Die Daten werden aus den aktiven Systemen entfernt; geschützte Sicherungskopien werden innerhalb festgelegter Löschfristen bereinigt, soweit keine gesetzlichen Aufbewahrungspflichten bestehen.",
    ),
  ).toBeTruthy();
  expect(screen.getByText("fairvitalgo® – Weil deine Gesundheit Privatsache ist.")).toBeTruthy();
});

it("lists all eight legal bases the statement promises", () => {
  render(<PrivacyStandards />);
  for (const article of ["Art. 5 DSGVO", "Art. 6 und 9 DSGVO", "Art. 7 DSGVO", "Art. 17 DSGVO", "Art. 20 DSGVO", "Art. 25 DSGVO", "Art. 28 DSGVO", "Art. 32 DSGVO"]) {
    expect(screen.getByText(article)).toBeTruthy();
  }
});

it("translates every standard and every article into English and Spanish", () => {
  const de = privacyStandards.de;
  for (const lang of ["en", "es"] as const) {
    const copy = privacyStandards[lang];
    expect(copy.standards.length).toBe(de.standards.length);
    expect(copy.legal.length).toBe(de.legal.length);
    de.standards.forEach(([title], i) => expect(copy.standards[i]?.[0]).not.toBe(title));
    de.legal.forEach(([title], i) => expect(copy.legal[i]?.[0]).not.toBe(title));
  }
});

it("keeps German wording out of the English and Spanish copies", () => {
  for (const lang of ["en", "es"] as const) {
    const text = JSON.stringify(privacyStandards[lang]);
    expect(text.includes("Deine")).toBe(false);
    expect(text.includes("Gesundheitsdaten")).toBe(false);
  }
});
