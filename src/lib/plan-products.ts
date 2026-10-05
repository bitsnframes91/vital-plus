import { products, status, type LabMarker, type Product } from "./data";

const markerAliases: Record<string, string[]> = {
  vitd: ["vitd", "vitamin d", "25 oh vitamin d", "25 hydroxy vitamin d", "calcidiol"],
  omega: ["omega", "omega 3", "omega 3 index", "epa dha"],
  ferritin: ["ferritin", "iron", "eisen", "transferrin saturation", "transferrinsattigung", "hamoglobin", "hemoglobin", "hamatokrit", "hematocrit"],
  b12: ["b12", "vitamin b12", "holo tc", "holotranscobalamin", "cobalamin"],
  folate: ["folate", "folsaure", "folic acid", "vitamin b9"],
  magnesium: ["magnesium"],
  zinc: ["zinc", "zink"],
  selenium: ["selenium", "selen"],
  calcium: ["calcium", "kalzium"],
  copper: ["copper", "kupfer"],
  vita: ["vitamin a", "retinol"],
  vitc: ["vitamin c", "ascorbic acid", "ascorbinsaure"],
  vite: ["vitamin e", "tocopherol"],
  vitk: ["vitamin k", "phyllochinone", "menaquinone"],
};

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export function markerCategory(marker: LabMarker) {
  const markerText = normalize(`${marker.id} ${marker.name}`);
  return Object.entries(markerAliases).find(([, aliases]) =>
    aliases.some((alias) => markerText.includes(normalize(alias))),
  )?.[0];
}

function productForMarker(marker: LabMarker) {
  return products.find((candidate) => candidate.relatedMarker === markerCategory(marker));
}

// Offer only catalog matches for a measured value below range, never for a normal or high value.
export function suggestedProducts(plan: { items: unknown[] } | null, labs: LabMarker[]): { marker: LabMarker; product: Product }[] {
  if (!plan?.items.length) return [];
  const seen = new Set<string>();
  return labs.flatMap((marker) => {
    if (!marker.history.length || status(marker).label !== "Niedrig") return [];
    const product = productForMarker(marker);
    if (!product || seen.has(product.shopwareId)) return [];
    seen.add(product.shopwareId);
    return product ? [{ marker, product }] : [];
  });
}

// The daily recommendation must come from this analyzed report, not the seeded example values.
export function reportMarkers(plan: { date: string } | null, labs: LabMarker[]): LabMarker[] {
  if (!plan) return [];
  return labs.filter((marker) => marker.history.at(-1)?.date === plan.date);
}

export function todaySuggestion(plan: { date: string; items: unknown[] } | null, labs: LabMarker[]) {
  if (!plan) return undefined;
  return suggestedProducts(plan, reportMarkers(plan, labs))[0];
}