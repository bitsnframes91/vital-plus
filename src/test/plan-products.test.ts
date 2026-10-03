import { describe, expect, it } from "vitest";
import { suggestedProducts } from "@/lib/plan-products";
import { labMarkers } from "@/lib/data";

describe("Fairvital plan suggestions", () => {
  it("does not recommend products before a personal plan exists", () => {
    expect(suggestedProducts(null, labMarkers)).toEqual([]);
  });
  it("suggests a matching product only for a below-range marker", () => {
    expect(suggestedProducts({ items: [{}] }, labMarkers).map(({ marker }) => marker.id)).toEqual(["omega"]);
  });
  it("does not recommend vitamin D when its value is high", () => {
    const labs = labMarkers.map((m) => m.id === "vitd" ? { ...m, history: [...m.history, { date: "2026-10-03", value: 9999 }] } : m);
    expect(suggestedProducts({ items: [{}] }, labs).some(({ marker }) => marker.id === "vitd")).toBe(false);
  });
});