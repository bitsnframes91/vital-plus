import { describe, expect, it } from "vitest";
import { nutritionStatus, nutritionTargets } from "../lib/nutrition-targets";
import { mealPlanContext } from "../lib/meal-plan-context";
describe("nutrition targets", () => {
  it("calculates adult maintenance targets from the saved profile", () => {
    expect(nutritionTargets({ age: 35, sex: "female", activity: "moderate", weightKg: 70, heightCm: 165 })).toEqual({ kcal: 2163, protein: 70, fiber: 30, fat: 72, carbs: 309 });
  });
  it("does not fabricate targets without age, sex or activity", () => {
    expect(nutritionTargets({ weightKg: 70, heightCm: 165 })).toBeNull();
    expect(nutritionTargets({ age: 16, sex: "female", activity: "light", weightKg: 70, heightCm: 165 })).toBeNull();
  });
  it("updates targets when weight changes", () => {
    const profile = { age: 35, sex: "female" as const, activity: "moderate", heightCm: 165 };
    expect(nutritionTargets({ ...profile, weightKg: 80 })?.kcal).toBe(2318);
  });
  it("is green below 80 percent", () => expect(nutritionStatus(1599, 2000)).toBe("good"));
  it("is orange from 80 percent through the target", () => {
    expect(nutritionStatus(1600, 2000)).toBe("near");
    expect(nutritionStatus(2000, 2000)).toBe("near");
  });
  it("is red only above the target", () => expect(nutritionStatus(2001, 2000)).toBe("over"));
  it("includes recorded meal input in plan preparation", () => {
    expect(mealPlanContext([{ name: "Lachs mit Gemüse", date: "2026-10-05", kcal: 500, protein: 35, fiber: 8, carbs: 40, fat: 20 }])).toContain('"name":"Lachs mit Gemüse"');
  });
});