import { describe, expect, it } from "vitest";
import { calcBmi, bmiCategory } from "@/lib/bmi";

describe("bmi", () => {
  it("calculates 70 kg / 175 cm as 22.9", () => expect(calcBmi(70, 175)).toBe(22.9));
  it("normal is good", () => expect(bmiCategory(22.9).level).toBe("good"));
  it("27 is borderline", () => expect(bmiCategory(27).level).toBe("borderline"));
  it("31 is bad", () => expect(bmiCategory(31).level).toBe("bad"));
  it("missing height gives no bmi", () => expect(calcBmi(70, null)).toBeNull());
});
