/** Adult EU label reference intakes; amounts are mg except entries marked µg. */
export const micronutrients = {
  vitamins: [
    { key: "a", target: 800, unit: "µg" }, { key: "d", target: 5, unit: "µg" },
    { key: "e", target: 12, unit: "mg" }, { key: "k", target: 75, unit: "µg" },
    { key: "c", target: 80, unit: "mg" }, { key: "b1", target: 1.1, unit: "mg" },
    { key: "b2", target: 1.4, unit: "mg" }, { key: "b3", target: 16, unit: "mg" },
    { key: "b6", target: 1.4, unit: "mg" }, { key: "folate", target: 200, unit: "µg" },
    { key: "b12", target: 2.5, unit: "µg" }, { key: "biotin", target: 50, unit: "µg" },
    { key: "b5", target: 6, unit: "mg" },
  ],
  minerals: [
    { key: "potassium", target: 2000, unit: "mg" }, { key: "chloride", target: 800, unit: "mg" },
    { key: "calcium", target: 800, unit: "mg" }, { key: "phosphorus", target: 700, unit: "mg" },
    { key: "magnesium", target: 375, unit: "mg" }, { key: "iron", target: 14, unit: "mg" },
    { key: "zinc", target: 10, unit: "mg" }, { key: "copper", target: 1, unit: "mg" },
    { key: "manganese", target: 2, unit: "mg" }, { key: "fluoride", target: 3.5, unit: "mg" },
    { key: "selenium", target: 55, unit: "µg" }, { key: "chromium", target: 40, unit: "µg" },
    { key: "molybdenum", target: 50, unit: "µg" }, { key: "iodine", target: 150, unit: "µg" },
  ],
} as const;

export type MicronutrientAmounts = Partial<Record<"vitamins" | "minerals", Record<string, number>>>;

/** Reject unknown, missing or invalid amounts rather than fabricating zero measurements. */
export function parseMicronutrients(input: unknown): MicronutrientAmounts | undefined {
  if (!input || typeof input !== "object") return undefined;
  const result: MicronutrientAmounts = {};
  for (const group of ["vitamins", "minerals"] as const) {
    const values = (input as Record<string, unknown>)[group];
    if (!values || typeof values !== "object") continue;
    const valid: Record<string, number> = {};
    for (const { key } of micronutrients[group]) {
      const value = (values as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) valid[key] = value;
    }
    if (Object.keys(valid).length) result[group] = valid;
  }
  return Object.keys(result).length ? result : undefined;
}

export function micronutrientSummary(meals: { micronutrients?: MicronutrientAmounts | undefined }[], group: "vitamins" | "minerals") {
  const entries = micronutrients[group];
  const known = entries.filter(({ key }) => meals.some(m => typeof m.micronutrients?.[group]?.[key] === "number"));
  const reached = known.filter(({ key, target }) => meals.reduce((total, meal) => {
    const amount = meal.micronutrients?.[group]?.[key];
    return total + (typeof amount === "number" && Number.isFinite(amount) && amount >= 0 ? amount : 0);
  }, 0) >= target).length;
  return { reached, total: entries.length, available: known.length > 0, partial: meals.some(m => !m.micronutrients?.[group]) || known.length < entries.length };
}

export const micronutrientPrompt = `Schätze zusätzlich micronutrients je Portion anhand üblicher Lebensmitteldaten, ohne Laborwerte abzuleiten. Gruppen und Einheiten: ${JSON.stringify(micronutrients)}. Format: "micronutrients":{"vitamins":{"a":number,...},"minerals":{"calcium":number,...}}. Verwende nur die angegebenen keys und Einheiten. Nicht zuverlässig schätzbare Mengen weglassen, nicht erfinden.`;