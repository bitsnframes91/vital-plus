import { describe, expect, it } from "vitest";
import { generalTips, routineTips } from "@/lib/deficiency-routines";
import type { LabMarker } from "@/lib/data";

const importedMarker = (id: string, name: string): LabMarker => ({
  id,
  name,
  unit: "",
  target: [1, 2],
  history: [{ date: "2026-10-05", value: 0.5 }],
  retestWeeks: 12,
  note: "",
});

describe("Routine tips for PDF-imported markers", () => {
  it("gives Hämoglobin its own actionable tips instead of a doctor-visit filler", () => {
    const hb = importedMarker("hb", "Hämoglobin (HB)");
    expect(routineTips(hb).map((tip) => tip.title)).toEqual([
      "Eisenreiche Mahlzeiten wählen",
      "Mit Vitamin C kombinieren",
      "Kaffee und Tee versetzt trinken",
      "Ursache ärztlich einordnen",
    ]);
  });

  it("maps common blood markers to matching tip categories", () => {
    const cases: [string, string, string][] = [
      ["pdf-ldl", "LDL-Cholesterin", "Bewegung in den Alltag einbauen"],
      ["pdf-hba1c", "HbA1c", "Regelmäßige Mahlzeiten einnehmen"],
      ["pdf-tsh", "TSH (basal)", "Selen und Jod beachten"],
    ];
    for (const [id, name, firstTitle] of cases) {
      expect(routineTips(importedMarker(id, name))[0]!.title).toBe(firstTitle);
    }
  });

  it("keeps the general fallback actionable – no doctor-visit filler", () => {
    expect(generalTips.map((tip) => tip.title)).toEqual([
      "Bunt und ausgewogen essen",
      "Täglich in Bewegung bleiben",
      "Schlaf ernst nehmen",
    ]);
    for (const tip of generalTips) {
      expect(["food", "walk", "clock"]).toContain(tip.icon);
      expect(tip.title).not.toContain("Befund");
    }
  });
});
