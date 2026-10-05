export type BmiLevel = "good" | "borderline" | "bad";

export function calcBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** WHO bands: 18.5–24.9 good; 17–18.4 and 25–29.9 borderline; below 17 or 30+ bad. */
export function bmiCategory(bmi: number): { level: BmiLevel; label: string; className: string } {
  if (bmi >= 18.5 && bmi < 25) return { level: "good", label: "Normalgewicht – gut", className: "text-bmi-good" };
  if (bmi >= 25 && bmi < 30) return { level: "borderline", label: "Leichtes Übergewicht – grenzwertig", className: "text-bmi-mid" };
  if (bmi >= 17 && bmi < 18.5) return { level: "borderline", label: "Leichtes Untergewicht – grenzwertig", className: "text-bmi-mid" };
  if (bmi >= 30) return { level: "bad", label: "Starkes Übergewicht – zu hoch", className: "text-bmi-bad" };
  return { level: "bad", label: "Starkes Untergewicht – zu niedrig", className: "text-bmi-bad" };
}

/** Daily step target derived from the BMI. */
export function stepGoalFor(bmi: number | null): number | null {
  if (bmi == null) return null;
  const { level } = bmiCategory(bmi);
  if (level === "good") return 8000;
  if (bmi < 18.5) return 6000;
  return level === "borderline" ? 10000 : 7000;
}
