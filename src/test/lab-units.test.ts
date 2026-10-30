import { describe, expect, it } from "vitest";
import type { LabMarker } from "@/lib/data";
import { europeanLabMarker, europeanLabUnit } from "@/lib/lab-units";

const marker = (unit: string, value: number, target: [number, number]): LabMarker => ({
  id: "platelets", name: "Thrombozyten", unit, target,
  history: [{ date: "2025-01-25", value }], retestWeeks: 12, note: "",
});

describe("European lab units", () => {
  it("converts 2.6 lakhs/Cumm to 260 G/l and the 1.5–4.5 range to 150–450", () => {
    const original = marker("lakhs/Cumm", 2.6, [1.5, 4.5]);
    const result = europeanLabMarker(original);
    expect(result.unit).toBe("G/l");
    expect(result.history[0]?.value).toBe(260);
    expect(result.target).toEqual([150, 450]);
    expect(original.history[0]?.value).toBe(2.6);
  });
  it("converts white cells per mm³ to G/l", () => {
    const result = europeanLabMarker(marker("Zellen/mm³", 7000, [4000, 11000]));
    expect(result.history[0]?.value).toBe(7);
    expect(result.target).toEqual([4, 11]);
    expect(result.unit).toBe("G/l");
  });
  it("keeps the red-cell count unchanged when converting Millionen/mm³ to T/l", () => {
    const result = europeanLabMarker(marker("Millionen/mm³", 4.8, [4, 5.5]));
    expect(result.unit).toBe("T/l");
    expect(result.history[0]?.value).toBe(4.8);
  });
  it("expresses mg% as mg/dl without changing concentrations", () => {
    const result = europeanLabMarker(marker("mg%", 180, [0, 200]));
    expect(result.unit).toBe("mg/dl");
    expect(result.history[0]?.value).toBe(180);
  });
  it("expresses gm% as g/dl without changing haemoglobin", () => {
    const result = europeanLabMarker(marker("gm%", 14, [12, 16]));
    expect(result.unit).toBe("g/dl");
    expect(result.history[0]?.value).toBe(14);
  });
  it("does not convert twice on repeated rendering or saving", () => {
    const once = europeanLabMarker(marker("lakhs/Cumm", 2.6, [1.5, 4.5]));
    expect(europeanLabMarker(once)).toEqual(once);
  });
  it("does not guess unknown units or alter valid conventional European units", () => {
    expect(europeanLabUnit("unknown")).toEqual({ unit: "unknown", factor: 1 });
    expect(europeanLabUnit("mmol/l")).toEqual({ unit: "mmol/l", factor: 1 });
    expect(europeanLabUnit("g/dl")).toEqual({ unit: "g/dl", factor: 1 });
    expect(europeanLabUnit("g/l")).toEqual({ unit: "g/l", factor: 1 });
  });
});