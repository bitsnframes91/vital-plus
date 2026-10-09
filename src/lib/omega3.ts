/** Estimated dietary omega-3 (ALA + EPA + DHA), milligrams per meal. */
export function parseOmega3(input: unknown): number | undefined {
  return typeof input === "number" && Number.isFinite(input) && input >= 0 ? input : undefined;
}
export function omega3Summary(meals: { omega3Mg?: number | undefined }[]) {
  const known = meals.map(meal => parseOmega3(meal.omega3Mg)).filter((amount): amount is number => amount !== undefined);
  return { total: known.reduce((sum, amount) => sum + amount, 0), available: known.length > 0, partial: known.length < meals.length };
}
export const omegaEntries = [
  { key: "omega3Mg", name: "Omega-3" },
  { key: "omega6Mg", name: "Omega-6" },
  { key: "omega9Mg", name: "Omega-9" },
] as const;
export type OmegaAmounts = { omega3Mg?: number | undefined; omega6Mg?: number | undefined; omega9Mg?: number | undefined };
export function parseOmegaAmounts(input: OmegaAmounts): OmegaAmounts {
  return Object.fromEntries(omegaEntries.map(({ key }) => [key, parseOmega3(input[key])]));
}
export function omegaSummary(meals: OmegaAmounts[]) {
  const entries = omegaEntries.map(({ key, name }) => {
    const known = meals.map(meal => parseOmega3(meal[key])).filter((amount): amount is number => amount !== undefined);
    return { key, name, total: known.reduce((sum, amount) => sum + amount, 0), available: known.length > 0, partial: known.length < meals.length };
  });
  return { entries, total: entries.reduce((sum, entry) => sum + entry.total, 0), available: entries.some(entry => entry.available), partial: entries.some(entry => !entry.available || entry.partial) };
}
export const omega3Prompt = `Schätze zusätzlich omega3Mg (ALA + EPA + DHA), omega6Mg (Omega-6-Fettsäuren) und omega9Mg (Omega-9-Fettsäuren, z.B. Ölsäure) je verzehrter Portion in Milligramm. Nicht Gesamtfett oder Omega-3-Index im Blut. Berücksichtige Mengenangaben. Jede Gruppe separat schätzen; fehlende Gruppen nicht aus Gesamtfett oder anderen Gruppen ableiten. Wenn nicht zuverlässig schätzbar, null statt einer erfundenen Zahl. Eine zuverlässig geschätzte Menge von 0 ist erlaubt.`;
