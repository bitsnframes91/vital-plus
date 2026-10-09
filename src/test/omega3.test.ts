import { describe, expect, it } from "vitest";
import { omega3Summary, parseOmega3 } from "../lib/omega3";
describe("Omega-3 intake from meals", () => {
  it("adds every logged meal without rounding away small amounts", () => {
    expect(omega3Summary([{ omega3Mg: 1200.5 }, { omega3Mg: 350.25 }])).toEqual({ total: 1550.75, available: true, partial: false });
  });
  it("keeps legacy estimates unavailable rather than inventing zero", () => {
    expect(omega3Summary([{}])).toEqual({ total: 0, available: false, partial: true });
    expect(omega3Summary([]).available).toBe(false);
  });
  it("distinguishes known zero from missing data and marks partial totals", () => {
    expect(omega3Summary([{ omega3Mg: 0 }])).toEqual({ total: 0, available: true, partial: false });
    expect(omega3Summary([{ omega3Mg: 200 }, {}])).toEqual({ total: 200, available: true, partial: true });
  });
  it("rejects negative, nonfinite and nonnumeric estimates", () => {
    for (const invalid of [-2, Infinity, NaN, null, "200", undefined]) expect(parseOmega3(invalid)).toBeUndefined();
    expect(parseOmega3(0.25)).toBe(0.25);
  });
});
