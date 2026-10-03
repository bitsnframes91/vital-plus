import { describe, expect, it } from "vitest";
import { suggestedProducts } from "@/lib/plan-products";
import { labMarkers, type LabMarker } from "@/lib/data";

describe("Fairvital plan suggestions", () => {
  it("does not recommend products before a personal plan exists", () => {
    expect(suggestedProducts(null, labMarkers)).toEqual([]);
  });
  it("suggests matching products for every below-range marker with a catalog match", () => {
    expect(suggestedProducts({ items: [{}] }, labMarkers).map(({ marker, product }) => [marker.id, product.name])).toEqual([
      ["ferritin", "Eisen"],
      ["omega", "Omega-3"],
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
    expect(suggestedProducts({ items: [{}] }, imported).map(({ product }) => product.name)).toEqual(["Magnesium", "Zink", "Folsäure"]);
  });
  it("does not suggest anything for normal or high imported values", () => {
    const imported: LabMarker[] = [
      { id: "pdf-selen", name: "Selen", unit: "µg/l", target: [80, 130], history: [{ date: "2026-10-03", value: 100 }], retestWeeks: 12, note: "" },
      { id: "pdf-calcium", name: "Calcium", unit: "mmol/l", target: [2.1, 2.6], history: [{ date: "2026-10-03", value: 3 }], retestWeeks: 12, note: "" },
    ];
    expect(suggestedProducts({ items: [{}] }, imported)).toEqual([]);
  });
});