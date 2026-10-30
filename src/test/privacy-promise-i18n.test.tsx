import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Localized } from "@/components/Localized";
import { setLanguage } from "@/lib/language";
import catalogue from "@/lib/translations.json";

// Sentences shown on the start page under the sign-up legal line.
const sources = [
  "Deine Gesundheit. Deine Daten. Deine Privatsphäre.",
  "Bei fairvitalgo® hat der Schutz deiner persönlichen Gesundheitsdaten höchste Priorität. Wir setzen auf die strengen Datenschutzstandards der DSGVO, eine sichere Datenverarbeitung und maximale Transparenz.",
  "Deine Daten gehören dir: Kein Datenverkauf, keine Nutzung für fremde Werbung und volle Kontrolle über deine persönlichen Informationen. Du kannst jederzeit die Löschung deiner Daten veranlassen.",
  "fairvitalgo® – Weil deine Gesundheit Privatsache ist.",
];

afterEach(() => { cleanup(); setLanguage("de"); });

describe("start-page privacy statement", () => {
  it("carries English and Spanish wording for every sentence", () => {
    const entries = catalogue as Record<string, string[]>;
    for (const source of sources) {
      const entry = entries[source];
      if (!entry) throw new Error(`missing catalogue entry: ${source}`);
      expect(entry).toHaveLength(2);
      expect(entry.every(value => typeof value === "string" && value.length > 0)).toBe(true);
    }
  });

  it("translates the statement when the language changes", () => {
    render(<Localized>{sources[0]}</Localized>);
    expect(screen.getByText("Deine Gesundheit. Deine Daten. Deine Privatsphäre.")).toBeInTheDocument();
    act(() => setLanguage("en"));
    expect(screen.getByText("Your health. Your data. Your privacy.")).toBeInTheDocument();
    act(() => setLanguage("es"));
    expect(screen.getByText("Tu salud. Tus datos. Tu privacidad.")).toBeInTheDocument();
  });
});
