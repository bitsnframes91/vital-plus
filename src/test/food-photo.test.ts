import { describe, expect, it } from "vitest";
import { normalizeFoodPhoto } from "@/lib/food-photo/schema";
const meal = { foodVisible: true, name: "Lachs mit Gemüse", kcal: 450.4, protein: 32.6, fiber: 6, carbs: 20, fat: 25 };
describe("food-photo estimates", () => {
  it("fills food name, calories and protein from the recognized portion", () => {
    expect(normalizeFoodPhoto(meal)).toEqual({ name: "Lachs mit Gemüse", kcal: 450, protein: 33, fiber: 6, carbs: 20, fat: 25 });
  });
  it("does not fabricate food when none is recognized", () => { expect(normalizeFoodPhoto({ ...meal, foodVisible: false })).toBeNull(); });
  it("rejects invalid nutrition rather than filling negative values", () => { expect(normalizeFoodPhoto({ ...meal, kcal: -1 })).toBeNull(); });
});