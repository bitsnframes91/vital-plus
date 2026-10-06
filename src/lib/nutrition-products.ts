import { products, type Product } from "./data";
import { nutrientStatus, type NutrientKey } from "./nutrition-targets";
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
