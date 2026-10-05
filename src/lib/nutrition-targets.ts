export const activityLevels = [
  { value: "sedentary", label: "Wenig aktiv · überwiegend sitzend", factor: 1.2 },
  { value: "light", label: "Leicht aktiv · Sport 1–3 Tage/Woche", factor: 1.375 },
  { value: "moderate", label: "Aktiv · Sport 3–5 Tage/Woche", factor: 1.55 },
  { value: "high", label: "Sehr aktiv · Sport 6–7 Tage/Woche", factor: 1.725 },
] as const;
export type NutritionProfile = { age?: number | null; sex?: "female" | "male" | "unspecified" | null; activity?: string | null };
export function nutritionTargets(body: NutritionProfile & { weightKg?: number | null; heightCm?: number | null }) {
  const { age, sex, weightKg, heightCm } = body;
  const activity = activityLevels.find((a) => a.value === body.activity);
  if (!age || age < 18 || age > 120 || !sex || sex === "unspecified" || !activity || !weightKg || weightKg < 20 || weightKg > 400 || !heightCm || heightCm < 100 || heightCm > 250) return null;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
  const kcal = Math.round(bmr * activity.factor);
  const protein = Math.round(weightKg);
  const fat = Math.round(kcal * 0.3 / 9);
  return { kcal, protein, fiber: 30, carbs: Math.round((kcal - protein * 4 - fat * 9) / 4), fat };
}
export function nutritionStatus(value: number, target: number): "good" | "near" | "over" {
  if (value > target) return "over";
  return value >= target * 0.8 ? "near" : "good";
}