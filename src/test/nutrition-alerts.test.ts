import { describe, expect, it } from "vitest";
import type { Meal } from "../lib/data";
import { nutritionAlerts } from "../lib/nutrition-alerts";
import { micronutrients } from "../lib/micronutrients";

const targets = { protein: 80, fiber: 30, kcal: 2000, carbs: 250, fat: 60 };
const meal: Meal = { id: "m", name: "meal", date: "2026-10-09", time: "12:00", label: "Mittagessen", protein: 20, fiber: 10, kcal: 1000, carbs: 100, fat: 30 };
describe("Heute nutrition priorities", () => {
  it("shows vitamins, minerals, Omega-3 and low protein before other negative cards", () => {
    const result = nutritionAlerts([{ ...meal, omega3Mg: 600, micronutrients: { vitamins: { c: 20 }, minerals: { magnesium: 100 } } }], targets);
    expect(result.map(alert => alert.key)).toEqual(["vitamins", "minerals", "omega3", "protein", "fiber"]);
    expect(result.find(alert => alert.key === "protein")?.mood).toBe("bad");
  });
  it("keeps yellow protein and excludes green protein after the target is reached", () => {
    expect(nutritionAlerts([{ ...meal, protein: 64 }], targets).find(alert => alert.key === "protein")?.mood).toBe("neutral");
    expect(nutritionAlerts([{ ...meal, protein: 80 }], targets).some(alert => alert.key === "protein")).toBe(false);
  });
  it("includes excess calories, carbs and fat rather than low values", () => {
    expect(nutritionAlerts([{ ...meal, kcal: 2600, carbs: 350, fat: 90 }], targets).map(alert => alert.key)).toEqual(["protein", "fiber", "kcal", "carbs", "fat"]);
  });
  it("does not fabricate deficiencies from absent meals, missing amounts or unassessed Omega", () => {
    expect(nutritionAlerts([], targets)).toEqual([]);
    expect(nutritionAlerts([meal], null)).toEqual([]);
    const omega = nutritionAlerts([{ ...meal, omega3Mg: 600 }], null)[0];
    expect(omega.target).toBeUndefined();
    expect(omega.label).toBe("Kein Richtwert gesetzt");
  });
  it("removes vitamin and mineral cards when all their references are reached", () => {
    const vitamins = Object.fromEntries(micronutrients.vitamins.map(entry => [entry.key, entry.target]));
    const minerals = Object.fromEntries(micronutrients.minerals.map(entry => [entry.key, entry.target]));
    expect(nutritionAlerts([{ ...meal, micronutrients: { vitamins, minerals } }], null)).toEqual([]);
  });
});