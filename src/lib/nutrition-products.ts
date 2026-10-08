import { products, type Product } from "./data";
import { nutrientStatus, type NutrientKey } from "./nutrition-targets";
import { micronutrients, micronutrientNames, micronutrientStatus, micronutrientTotals, type MicronutrientAmounts } from "./micronutrients";
import { productUrl } from "./shopware";
import imgPektin from "@/assets/apfelpektin.webp.asset.json";

const apfelpektin: Product = {
  shopwareId: "74010",
  name: "Apfelpektin 500mg",
  short: "100 Tabletten · natürlicher Ballaststoff · vegan",
  url: "https://fairvital.com/Apfelpektin-500mg-100-Tabletten-mit-Vitamin-C-Calcium-fuer-Knochen-Immunsystem-uvm.-Vegan-Fairvital-74010",
  image: imgPektin.url,
};
const spirulina = products.find((p) => p.shopwareId === "83150")!;

/** Only nutrients a supplement can sensibly top up; kcal/carbs/fat never get product suggestions. */
const byNutrient: Partial<Record<NutrientKey, { product: Product; reason: string }>> = {
  protein: { product: spirulina, reason: "Pflanzliche Proteinquelle mit rund 60 % Eiweiß" },
  fiber: { product: apfelpektin, reason: "Natürlicher Ballaststoff aus Äpfeln" },
};

export type NutritionGap = { key: NutrientKey; missing: number; product: Product; reason: string; href: string };

/** Products for today's measured gaps — empty until targets exist and at least one meal is logged. */
export function nutritionGaps(
  totals: Record<NutrientKey, number>,
  targets: Partial<Record<NutrientKey, number>> | null,
  mealCount: number,
): NutritionGap[] {
  if (!targets || mealCount === 0) return [];
  const out: NutritionGap[] = [];
  for (const key of ["protein", "fiber"] as const) {
    const target = targets[key];
    const entry = byNutrient[key];
    if (!target || !entry) continue;
    if (nutrientStatus(key, totals[key], target) === "good") continue;
    out.push({ key, missing: Math.round(target - totals[key]), ...entry, href: productUrl(entry.product) });
  }
  return out;
}

const micro = (id: string, reason: string) => ({ product: products.find((p) => p.shopwareId === id)!, reason });
/** Catalog products that directly supply a vitamin or mineral; nutrients without a fitting product get no suggestion. */
const byMicronutrient: Record<string, { product: Product; reason: string }> = {
  a: micro("84309", "Beta-Carotin als Vorstufe von Vitamin A"),
  d: micro("73905", "Vitamin D3 mit K2 MK7"),
  e: micro("87950", "Hochdosiertes Vitamin E"),
  k: micro("101512", "Vitamin K1 und K2 kombiniert"),
  c: micro("98106", "Natürliches Vitamin C aus Acerola"),
  b12: micro("82609", "Vitamin B12 mit Folsäure"),
  folate: micro("82609", "Folsäure mit Vitamin B12"),
  iron: micro("79824", "Eisen mit Vitamin C für bessere Aufnahme"),
  zinc: micro("52509", "Zink mit Histidin und Vitamin C"),
  selenium: micro("80709", "Selen für den Tagesbedarf"),
  magnesium: micro("77950", "Gut verträgliches Magnesium-Malat"),
  calcium: micro("76925", "Calcium mit Magnesium und Zink"),
  copper: micro("72110", "Kupfer als Spurenelement"),
};

export type MicronutrientGap = { key: string; name: string; missing: number; unit: string; product: Product; reason: string; href: string };

/** Products for measured vitamins/minerals below 70 % of today's reference; one card per product, largest gaps first. */
export function micronutrientGaps(meals: { micronutrients?: MicronutrientAmounts | undefined }[], limit = 4): MicronutrientGap[] {
  const found: (MicronutrientGap & { pct: number })[] = [];
  for (const group of ["vitamins", "minerals"] as const) {
    const totals = micronutrientTotals(meals, group);
    for (const { key, target, unit } of micronutrients[group]) {
      const value = totals[key];
      const entry = byMicronutrient[key];
      if (value === undefined || !entry || micronutrientStatus(value, target) === "good") continue;
      found.push({ key, name: micronutrientNames[key] ?? key, missing: target - value, unit, ...entry, href: productUrl(entry.product), pct: value / target });
    }
  }
  found.sort((a, b) => a.pct - b.pct);
  const seen = new Set<string>();
  return found.filter((g) => !seen.has(g.product.shopwareId) && seen.add(g.product.shopwareId)).slice(0, limit).map(({ pct: _pct, ...g }) => g);
}
