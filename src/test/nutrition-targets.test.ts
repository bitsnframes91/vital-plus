import { describe, expect, it } from "vitest";
import { nutritionStatus, nutritionTargets, nutrientStatus } from "../lib/nutrition-targets";
import { mealPlanContext } from "../lib/meal-plan-context";
describe("nutrition targets", () => {
  it("calculates adult maintenance targets from the saved profile", () => {
    expect(nutritionTargets({ age: 35, sex: "female", activity: "moderate", weightKg: 70, heightCm: 165 })).toEqual({ kcal: 2163, protein: 70, fiber: 30, fat: 72, carbs: 309 });
  });
  it("does not fabricate targets without age, sex or activity", () => {
    expect(nutritionTargets({ weightKg: 70, heightCm: 165 })).toBeNull();
    expect(nutritionTargets({ age: 16, sex: "female", activity: "light", weightKg: 70, heightCm: 165 })).toBeNull();
  });
  it("treats diverse as a valid sex for maintenance targets", () => {
    expect(nutritionTargets({ age: 35, sex: "diverse", activity: "moderate", weightKg: 70, heightCm: 165 })).toEqual({ kcal: 2163, protein: 70, fiber: 30, fat: 72, carbs: 309 });
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
  it("protein: sad when clearly below, smiling at or above the target", () => {
    expect(nutrientStatus("protein", 40, 70)).toBe("bad");
    expect(nutrientStatus("protein", 56, 70)).toBe("near");
    expect(nutrientStatus("protein", 70, 70)).toBe("good");
    expect(nutrientStatus("protein", 110, 70)).toBe("good");
  });
  it("fiber: sad when clearly below, happy at or above the target", () => {
    expect(nutrientStatus("fiber", 12, 30)).toBe("bad");
    expect(nutrientStatus("fiber", 24, 30)).toBe("near");
    expect(nutrientStatus("fiber", 30, 30)).toBe("good");
    expect(nutrientStatus("fiber", 45, 30)).toBe("good");
  });
  it("carbs: happy when low or within, sad when clearly above", () => {
    expect(nutrientStatus("carbs", 100, 309)).toBe("good");
    expect(nutrientStatus("carbs", 309, 309)).toBe("good");
    expect(nutrientStatus("carbs", 380, 309)).toBe("near");
    expect(nutrientStatus("carbs", 420, 309)).toBe("bad");
  });
  it("fat: happy when low or within, sad when clearly above", () => {
    expect(nutrientStatus("fat", 20, 72)).toBe("good");
    expect(nutrientStatus("fat", 72, 72)).toBe("good");
    expect(nutrientStatus("fat", 85, 72)).toBe("near");
    expect(nutrientStatus("fat", 100, 72)).toBe("bad");
  });
  it("kcal: smiling within the target, sad only when clearly over", () => {
    expect(nutrientStatus("kcal", 1000, 2163)).toBe("good");
    expect(nutrientStatus("kcal", 2163, 2163)).toBe("good");
    expect(nutrientStatus("kcal", 2500, 2163)).toBe("near");
    expect(nutrientStatus("kcal", 2900, 2163)).toBe("bad");
  });
  it("includes recorded meal input in plan preparation", () => {
    expect(mealPlanContext([{ name: "Lachs mit Gemüse", date: "2026-10-05", kcal: 500, protein: 35, fiber: 8, carbs: 40, fat: 20 }])).toContain('"name":"Lachs mit Gemüse"');
  });
});