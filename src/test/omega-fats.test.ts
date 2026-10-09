import { describe, expect, it } from "vitest";
import { omegaSummary, parseOmegaAmounts } from "../lib/omega3";

describe("Omega-3, Omega-6 and Omega-9 from meals", () => {
  it("sums each Omega group separately and totals the groups", () => {
    const summary = omegaSummary([
      { omega3Mg: 1200, omega6Mg: 3000, omega9Mg: 6000 },
      { omega3Mg: 300, omega6Mg: 2000, omega9Mg: 4000 },
    ]);
    expect(summary.entries.map(entry => entry.total)).toEqual([1500, 5000, 10000]);
    expect(summary.total).toBe(16500);
    expect(summary.partial).toBe(false);
  });
  it("preserves legacy Omega-3 without inventing Omega-6 or Omega-9", () => {
    const summary = omegaSummary([{ omega3Mg: 500 }]);
    expect(summary.entries.map(entry => entry.available)).toEqual([true, false, false]);
    expect(summary.partial).toBe(true);
    expect(summary.total).toBe(500);
  });
  it("treats missing estimates as unavailable, but accepts known zero", () => {
    expect(omegaSummary([]).available).toBe(false);
    expect(omegaSummary([{ omega3Mg: 0, omega6Mg: 0, omega9Mg: 0 }]).partial).toBe(false);
    expect(parseOmegaAmounts({ omega3Mg: 0, omega6Mg: -10, omega9Mg: Infinity })).toEqual({ omega3Mg: 0, omega6Mg: undefined, omega9Mg: undefined });
  });
});