import { describe, expect, it } from "vitest";
import { suggestedProducts, reportMarkers, todaySuggestion } from "@/lib/plan-products";
import { catalogSpotlight, labMarkers, type LabMarker } from "@/lib/data";
import { routineTips } from "@/lib/deficiency-routines";

describe("Fairvital plan suggestions", () => {
  it("does not recommend products before a personal plan exists", () => {
    expect(suggestedProducts(null, labMarkers)).toEqual([]);
  });
  it("suggests matching products for every below-range marker with a catalog match", () => {
    expect(suggestedProducts({ items: [{}] }, labMarkers).map(({ marker, product }) => [marker.id, product.name])).toEqual([
      ["ferritin", "Eisen 20mg + C"],
      ["omega", "Flachsöl Omega 3-6-9"],
    ]);
  });
  it("does not recommend vitamin D when its value is high", () => {
    const labs = labMarkers.map((m) => m.id === "vitd" ? { ...m, history: [...m.history, { date: "2026-10-03", value: 9999 }] } : m);
    expect(suggestedProducts({ items: [{}] }, labs).some(({ marker }) => marker.id === "vitd")).toBe(false);
  });
  it("matches common nutrient marker names imported from a PDF", () => {
    const imported: LabMarker[] = [
      { id: "pdf-magnesium-serum", name: "Magnesium im Serum", unit: "mmol/l", target: [0.75, 1], history: [{ date: "2026-10-03", value: 0.6 }], retestWeeks: 12, note: "" },
      { id: "pdf-zink", name: "Zink", unit: "µmol/l", target: [10, 20], history: [{ date: "2026-10-03", value: 8 }], retestWeeks: 12, note: "" },
      { id: "pdf-folsaure", name: "Folsäure", unit: "ng/ml", target: [4, 20], history: [{ date: "2026-10-03", value: 3 }], retestWeeks: 12, note: "" },
    ];
    expect(suggestedProducts({ items: [{}] }, imported).map(({ product }) => product.name)).toEqual(["Magnesium Malat Pulver", "Zink + Histidin + Vitamin C", "Folsäure 5000µg"]);
  });
  it("does not suggest anything for normal or high imported values", () => {
    const imported: LabMarker[] = [
      { id: "pdf-selen", name: "Selen", unit: "µg/l", target: [80, 130], history: [{ date: "2026-10-03", value: 100 }], retestWeeks: 12, note: "" },
      { id: "pdf-calcium", name: "Calcium", unit: "mmol/l", target: [2.1, 2.6], history: [{ date: "2026-10-03", value: 3 }], retestWeeks: 12, note: "" },
    ];
    expect(suggestedProducts({ items: [{}] }, imported)).toEqual([]);
  });
  it("offers ferritin-specific daily practices alongside the iron match", () => {
    const ferritin = labMarkers.find((m) => m.id === "ferritin");
    expect(ferritin).toBeDefined();
    if (!ferritin) return;
    expect(suggestedProducts({ items: [{}] }, [ferritin])[0]?.product.name).toBe("Eisen 20mg + C");
    expect(routineTips(ferritin).map((tip) => tip.title)).toEqual([
      "Eisen und Vitamin C kombinieren", "Kaffee und Tee versetzt trinken", "Eisenquellen abwechseln",
    ]);
  });
  it("suggests iron for low Hämoglobin and Spirulina for low Hämatokrit", () => {
    const low = (id: string, name: string) => ({ id, name, unit: "", target: [12, 16] as [number, number], history: [{ date: "2026-10-03", value: 1 }], retestWeeks: 12, note: "" });
    expect(suggestedProducts({ items: [{}] }, [low("pdf-hb", "Hämoglobin (HB)")])[0]?.product.name).toBe("Eisen 20mg + C");
    expect(suggestedProducts({ items: [{}] }, [low("pdf-hct", "Hämatokrit (HCT/PCV)")])[0]?.product.name).toBe("Spirulina 500mg");
  });
  it("chooses a low value from the analyzed report rather than an older example", () => {
    const labs = labMarkers.map((m) => m.id === "ferritin" ? { ...m, history: [...m.history, { date: "2026-10-03", value: 16 }] } : m);
    expect(todaySuggestion({ date: "2026-10-03", items: [{}] }, labs)?.product.name).toBe("Eisen 20mg + C");
    expect(reportMarkers({ date: "2026-10-03" }, labs).map((m) => m.id)).toEqual(["ferritin"]);
  });
  it("does not recommend supplements for a report with only normal values", () => {
    const labs = labMarkers.map((m) => m.id === "vitd" ? { ...m, history: [...m.history, { date: "2026-10-03", value: 45 }] } : m);
    expect(todaySuggestion({ date: "2026-10-03", items: [{}] }, labs)).toBeUndefined();
  });
  it("does not display a personal recommendation before an analysis", () => {
    expect(todaySuggestion(null, labMarkers)).toBeUndefined();
  });
  it("keeps the general catalog spotlight separate from measured-value suggestions", () => {
    expect(catalogSpotlight.shopwareId).toBe("98106");
    expect(catalogSpotlight.relatedMarker).toBeUndefined();
    expect(catalogSpotlight.url).toContain("fairvital.com/Acerola-mit-Hesperidin");
  });
});
import { productForMarker } from "@/lib/plan-products";
describe("blood sugar product", () => {
  const fbs = (value: number) => ({ id: "pdf-fbs", name: "Nüchternblutzucker (FBS)", unit: "mg/dl", target: [60, 110] as [number, number], history: [{ date: "2025-01-25", value }], retestWeeks: 12, note: "" });
  it("suggests Chrom for high Nüchternblutzucker", () => expect(productForMarker(fbs(118))?.name).toBe("Chrom 200 µg"));
  it("suggests nothing for normal Nüchternblutzucker", () => expect(productForMarker(fbs(90))).toBeUndefined());
});
