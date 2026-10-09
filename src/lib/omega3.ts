/** Estimated dietary omega-3 (ALA + EPA + DHA), milligrams per meal. */
export function parseOmega3(input: unknown): number | undefined {
  return typeof input === "number" && Number.isFinite(input) && input >= 0 ? input : undefined;
}
export function omega3Summary(meals: { omega3Mg?: number | undefined }[]) {
  const known = meals.map(meal => parseOmega3(meal.omega3Mg)).filter((amount): amount is number => amount !== undefined);
  return { total: known.reduce((sum, amount) => sum + amount, 0), available: known.length > 0, partial: known.length < meals.length };
}
export const omega3Prompt = `Schätze zusätzlich omega3Mg je verzehrter Portion: gesamte Omega-3-Fettsäuren (ALA + EPA + DHA) in Milligramm, nicht Gesamtfett oder Omega-3-Index im Blut. Berücksichtige Mengenangaben. Wenn nicht zuverlässig schätzbar, null statt einer erfundenen Zahl. Eine zuverlässig geschätzte Menge von 0 ist erlaubt.`;
