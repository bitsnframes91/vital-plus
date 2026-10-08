import { describe, expect, it } from "vitest";
import { micronutrientSummary, parseMicronutrients } from "../lib/micronutrients";
import { nutrientStatus } from "../lib/nutrition-targets";

describe("micronutrient daily coverage", () => {
  it("does not invent coverage for old meals", () => {
    expect(micronutrientSummary([{}], "vitamins")).toEqual({ reached: 0, total: 13, available: false, partial: true });
  });
  it("adds amounts across meals and counts each reached vitamin once", () => {
    expect(micronutrientSummary([{ micronutrients: { vitamins: { c: 40, b12: 2.5 } } }, { micronutrients: { vitamins: { c: 40 } } }], "vitamins").reached).toBe(2);
  });
  it("counts minerals against their own reference quantities", () => {
    expect(micronutrientSummary([{ micronutrients: { minerals: { calcium: 800, iron: 13 } } }], "minerals")).toMatchObject({ reached: 1, total: 14, available: true });
  });
  it("rejects invalid and unknown AI amounts without rounding micronutrients", () => {
    expect(parseMicronutrients({ vitamins: { b12: 0.8, c: -1, a: Infinity, unknown: 200 } })).toEqual({ vitamins: { b12: 0.8 } });
    expect(parseMicronutrients(null)).toBeUndefined();
  });
  it("uses the same low-intake status logic as protein and fiber", () => {
    expect(nutrientStatus("protein", 6, 13)).toBe("bad");
    expect(nutrientStatus("protein", 11, 13)).toBe("near");
    expect(nutrientStatus("protein", 13, 13)).toBe("good");
  });
});