import { describe, expect, it } from "vitest";
import { dailyTip } from "@/lib/daily-tip";
import { labMarkers } from "@/lib/data";

describe("Tipp des Tages", () => {
  it("matches the tip to a below-range marker from the analyzed report", () => {
    // Ferritin is low in the example values, so the daily tip must come from its routine tips.
    const tip = dailyTip({ date: "2026-10-03", items: [{}] }, labMarkers);
    expect(tip.marker?.id).toBe("ferritin");
    expect(["Eisen und Vitamin C kombinieren", "Kaffee und Tee versetzt trinken"]).toContain(tip.tip.title);
  });

  it("does not tie the tip to a marker whose value is in range", () => {
    // Vitamin D (45) is optimal, so it must never be the tip's marker.
    const labs = labMarkers.map((m) => m.id === "vitd" ? { ...m, history: [...m.history, { date: "2026-10-03", value: 45 }] } : m);
    const tips = [dailyTip({ date: "2026-10-03", items: [{}] }, labs)];
    expect(tips.some((t) => t.marker?.id === "vitd")).toBe(false);
  });

  it("falls back to a general tip when no report was analyzed", () => {
    const tip = dailyTip(null, labMarkers);
    expect(tip.marker).toBeUndefined();
    expect(tip.tip.title.length).toBeGreaterThan(0);
  });

  it("keeps the same tip for the rest of the day and rotates across days", () => {
    const labs = labMarkers.map((m) => m.id === "ferritin" ? { ...m, history: [...m.history, { date: "2026-10-03", value: 50 }] } : m);
    const first = dailyTip({ date: "2026-10-03", items: [{}] }, labs);
    const again = dailyTip({ date: "2026-10-03", items: [{}] }, labs);
    expect(again.tip.title).toBe(first.tip.title);
  });
});
