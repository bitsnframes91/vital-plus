import { products, status, type LabMarker, type Product } from "./data";

// Offer only catalog matches for a measured value below range, never for a high value.
export function suggestedProducts(plan: { items: unknown[] } | null, labs: LabMarker[]): { marker: LabMarker; product: Product }[] {
  if (!plan?.items.length) return [];
  return labs.flatMap((marker) => {
    if (!marker.history.length || status(marker).label !== "Niedrig") return [];
    const product = products.find((candidate) => candidate.relatedMarker === marker.id);
    return product ? [{ marker, product }] : [];
  });
}