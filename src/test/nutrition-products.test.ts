import { describe, expect, it } from "vitest";
import { nutritionGaps } from "@/lib/nutrition-products";

const targets = { kcal: 2500, protein: 100, fiber: 30, carbs: 300, fat: 80 };
const totals = { kcal: 3000, protein: 50, fiber: 10, carbs: 400, fat: 120 };

describe("nutritionGaps", () => {
  it("shows nothing before values are analysed", () => {
    expect(nutritionGaps(totals, null, 3)).toEqual([]);
    expect(nutritionGaps(totals, targets, 0)).toEqual([]);
  });
  it("suggests products for low protein and fiber only", () => {
    expect(nutritionGaps(totals, targets, 2).map((g) => g.key)).toEqual(["protein", "fiber"]);
  });
  it("suggests nothing once protein and fiber are reached", () => {
    expect(nutritionGaps({ ...totals, protein: 120, fiber: 30 }, targets, 2)).toEqual([]);
  });
});

import { micronutrientGaps } from "@/lib/nutrition-products";
describe("micronutrientGaps", () => {
  it("suggests products only for measured values below 70 % of reference", () => {
    const meals = [{ micronutrients: { vitamins: { d: 1, c: 80 }, minerals: { magnesium: 100 } } }];
    expect(micronutrientGaps(meals).map((g) => g.key)).toEqual(["d", "magnesium"]);
    expect(micronutrientGaps([])).toEqual([]);
  });
});
