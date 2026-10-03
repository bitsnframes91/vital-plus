// Mock data for version 1. Products/prices will later come from the Fairvital Shopware API
// (see src/lib/shopware.ts); lab values will later come from a laboratory API.

export type LabPoint = { date: string; value: number };
export type LabMarker = {
  id: string;
  name: string;
  unit: string;
  target: [number, number];
  history: LabPoint[];
  retestWeeks: number;
  note: string;
};

export const labMarkers: LabMarker[] = [
  {
    id: "vitd",
    name: "Vitamin D (25-OH)",
    unit: "ng/ml",
    target: [30, 60],
    history: [
      { date: "2026-02-10", value: 24 },
      { date: "2026-05-14", value: 31 },
      { date: "2026-08-20", value: 38 },
    ],
    retestWeeks: 12,
    note: "Im Zielbereich. Regelmäßige Kontrolle hilft, den Wert stabil zu halten.",
  },
  {
    id: "ferritin",
    name: "Ferritin",
    unit: "µg/l",
    target: [30, 150],
    history: [
      { date: "2026-02-10", value: 18 },
      { date: "2026-08-20", value: 22 },
    ],
    retestWeeks: 8,
    note: "Unter dem Zielbereich. Bitte mit Ärztin oder Arzt besprechen.",
  },
  {
    id: "b12",
    name: "Holo-TC (Vitamin B12)",
    unit: "pmol/l",
    target: [50, 150],
    history: [
      { date: "2026-02-10", value: 62 },
      { date: "2026-08-20", value: 71 },
    ],
    retestWeeks: 24,
    note: "Im Zielbereich.",
  },
  {
    id: "omega",
    name: "Omega-3-Index",
    unit: "%",
    target: [8, 11],
    history: [
      { date: "2026-02-10", value: 5.1 },
      { date: "2026-08-20", value: 6.8 },
    ],
    retestWeeks: 16,
    note: "Steigend, aber noch unter dem Zielbereich.",
  },
];

export type Product = {
  shopwareId: string;
  name: string;
  short: string;
  url: string;
  relatedMarker?: string;
};

export const products: Product[] = [
  {
    shopwareId: "sw-placeholder-d3k2",
    name: "Vitamin D3 + K2 Tropfen",
    short: "Hilft, deinen Zielbereich stabil zu halten.",
    url: "https://www.fairvital.com",
    relatedMarker: "vitd",
  },
  {
    shopwareId: "sw-placeholder-omega",
    name: "Omega-3 Algenöl",
    short: "Pflanzliche Quelle für EPA und DHA.",
    url: "https://www.fairvital.com",
    relatedMarker: "omega",
  },
];

export type Meal = {
  id: string;
  label: string;
  name: string;
  protein: number;
  kcal: number;
  fiber: number;
  carbs: number;
  fat: number;
  time: string;
  date: string; // ISO day, e.g. 2026-10-03
};
export const initialMeals: Meal[] = [
  { id: "m1", label: "Frühstück", name: "Skyr mit Beeren & Walnüssen", protein: 32, kcal: 380, fiber: 6, carbs: 34, fat: 14, time: "07:40", date: new Date().toISOString().slice(0, 10) },
  { id: "m2", label: "Mittagessen", name: "Linsen-Bowl mit Gemüse", protein: 22, kcal: 460, fiber: 12, carbs: 58, fat: 12, time: "12:40", date: new Date().toISOString().slice(0, 10) },
];

export type Supplement = { id: string; name: string; dose: string; time: string; fairvital: boolean };
export const initialSupplements: Supplement[] = [
  { id: "s1", name: "Omega-3 Algenöl", dose: "2 Kapseln", time: "morgens", fairvital: true },
  { id: "s2", name: "Vitamin D3 + K2", dose: "2 Tropfen", time: "morgens", fairvital: true },
  { id: "s3", name: "Magnesium", dose: "300 mg", time: "abends", fairvital: false },
];

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

export const status = (m: LabMarker) => {
  const v = m.history[m.history.length - 1]!.value;
  if (v < m.target[0]) return { label: "Niedrig", tone: "warn" as const };
  if (v > m.target[1]) return { label: "Hoch", tone: "warn" as const };
  return { label: "Optimal", tone: "ok" as const };
};
