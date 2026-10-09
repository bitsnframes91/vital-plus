import type { Meal } from "./data";
import { micronutrientSummary } from "./micronutrients";
import { nutrientStatus, type nutritionTargets } from "./nutrition-targets";
import { omega3Summary } from "./omega3";

export type NutritionAlert = {
  key: string; title: string; value: number; target?: number; unit: string;
  mood: "neutral" | "bad"; label: string;
  to: "/ernaehrung" | "/ernaehrung/vitamine" | "/ernaehrung/mineralien" | "/ernaehrung/omega-fette";
};

/** Mirrors Ernährung card statuses; an unassessed Omega amount is not a deficiency. */
export function nutritionAlerts(meals: Meal[], targets: ReturnType<typeof nutritionTargets>): NutritionAlert[] {
  if (!meals.length) return [];
  const alerts: NutritionAlert[] = [];
  for (const group of ["vitamins", "minerals"] as const) {
    const summary = micronutrientSummary(meals, group);
    if (!summary.available) continue;
    const status = nutrientStatus("protein", summary.reached, summary.total);
    if (status === "good") continue;
    alerts.push({ key: group, title: group === "vitamins" ? "Vitamine" : "Mineralien", value: summary.reached, target: summary.total, unit: "", mood: status === "bad" ? "bad" : "neutral", label: "Tagesziele erreicht · ca.", to: group === "vitamins" ? "/ernaehrung/vitamine" : "/ernaehrung/mineralien" });
  }
  const omega = omega3Summary(meals);
  if (omega.available) alerts.push({ key: "omega3", title: "Omega-3", value: omega.total, unit: "mg", mood: "neutral", label: "Kein Richtwert gesetzt", to: "/ernaehrung/omega-fette" });
  if (targets) {
    for (const [key, title, unit] of [["protein", "Protein", "g"], ["fiber", "Ballaststoffe", "g"], ["kcal", "Kalorien", "kcal"], ["carbs", "Kohlenhydrate", "g"], ["fat", "Fett", "g"]] as const) {
      const value = meals.reduce((sum, meal) => sum + (meal[key] || 0), 0);
      const status = nutrientStatus(key, value, targets[key]);
      if (status === "good") continue;
      alerts.push({ key, title, value, target: targets[key], unit, mood: status === "bad" ? "bad" : "neutral", label: key === "protein" || key === "fiber" ? "Unter dem Tagesrichtwert" : "Über dem Tagesrichtwert", to: "/ernaehrung" });
    }
  }
  return alerts;
}