import type { Meal } from "./data";
import { micronutrients, micronutrientTotals } from "./micronutrients";
import { nutritionTargets } from "./nutrition-targets";

export type ProgressTone = "low" | "partial" | "good" | "missing";
export function completion(value: number | null | undefined, target: number | null | undefined): number | null {
  if (value == null || target == null || !Number.isFinite(value) || !Number.isFinite(target) || value < 0 || target <= 0) return null;
  return Math.min(100, value / target * 100);
}
export function progressTone(percent: number | null): ProgressTone {
  if (percent === null) return "missing";
  return percent < 25 ? "low" : percent < 50 ? "partial" : "good";
}
/** Missing categories earn no recorded completion, but remain explicitly unassessed. */
export function overallCompletion(values: (number | null)[]) {
  const available = values.filter((value): value is number => value !== null);
  return { percent: available.length ? available.reduce((sum, value) => sum + Math.min(100, Math.max(0, value)), 0) / 5 : null, available: available.length };
}
type Body = Parameters<typeof nutritionTargets>[0] & { stepGoal?: number | null };
type Measurements = { steps?: number | null; stepGoal?: number | null; sleepHours?: number | null; sleepGoal?: number | null };
export function wellnessProgress(meals: Meal[], body: Body, water: number | undefined, measurements: Measurements = {}) {
  const targets = nutritionTargets(body);
  const protein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const fiber = meals.reduce((sum, meal) => sum + (meal.fiber || 0), 0);
  const nutrition = meals.length && targets ? ((completion(protein, targets.protein) ?? 0) + (completion(fiber, targets.fiber) ?? 0)) / 2 : null;
  const microValues: number[] = [];
  for (const group of ["vitamins", "minerals"] as const) {
    const totals = micronutrientTotals(meals, group);
    for (const { key, target } of micronutrients[group]) {
      const percent = completion(totals[key], target);
      if (percent !== null) microValues.push(percent);
    }
  }
  const micro = microValues.length ? microValues.reduce((sum, value) => sum + value, 0) / microValues.length : null;
  const values = [nutrition, completion(measurements.steps, measurements.stepGoal ?? body.stepGoal), completion(measurements.sleepHours, measurements.sleepGoal), micro, completion(water, 2)];
  return { values, overall: overallCompletion(values), protein, fiber, targets, microKnown: microValues.length, microTotal: micronutrients.vitamins.length + micronutrients.minerals.length };
}