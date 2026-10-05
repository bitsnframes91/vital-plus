// Mock data for version 1. Products/prices will later come from the Fairvital Shopware API
// (see src/lib/shopware.ts); lab values will later come from a laboratory API.

import imgVitd from "@/assets/products/vitd.webp.asset.json";
import imgOmega from "@/assets/products/omega.webp.asset.json";
import imgFerritin from "@/assets/products/ferritin.webp.asset.json";
import imgB12 from "@/assets/products/b12.webp.asset.json";
import imgFolate from "@/assets/products/folate.webp.asset.json";
import imgMagnesium from "@/assets/products/magnesium.webp.asset.json";
import imgZinc from "@/assets/products/zinc.webp.asset.json";
import imgSelenium from "@/assets/products/selenium.webp.asset.json";
import imgCalcium from "@/assets/products/calcium.webp.asset.json";
import imgCopper from "@/assets/products/copper.webp.asset.json";
import imgVita from "@/assets/products/vita.webp.asset.json";
import imgVitc from "@/assets/products/vitc.webp.asset.json";
import imgVite from "@/assets/products/vite.webp.asset.json";
import imgVitk from "@/assets/products/vitk.webp.asset.json";

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
    name: "Vitamin D3 + K2",
    short: "Fairvital-Produkte zu Vitamin D ansehen.",
    url: "https://fairvital.com/search?s=Vitamin%20D3%20K2",
    relatedMarker: "vitd",
  },
  {
    shopwareId: "sw-placeholder-omega",
    name: "Omega-3",
    short: "Fairvital-Produkte zu Omega-3 ansehen.",
    url: "https://fairvital.com/search?s=Omega-3",
    relatedMarker: "omega",
  },
  {
    shopwareId: "sw-placeholder-iron",
    name: "Eisen",
    short: "Fairvital-Produkte zu Eisen ansehen.",
    url: "https://fairvital.com/search?s=Eisen",
    relatedMarker: "ferritin",
  },
  {
    shopwareId: "sw-placeholder-b12",
    name: "Vitamin B12",
    short: "Fairvital-Produkte zu Vitamin B12 ansehen.",
    url: "https://fairvital.com/search?s=Vitamin%20B12",
    relatedMarker: "b12",
  },
  {
    shopwareId: "sw-placeholder-folate",
    name: "Folsäure",
    short: "Fairvital-Produkte zu Folsäure ansehen.",
    url: "https://fairvital.com/search?s=Fols%C3%A4ure",
    relatedMarker: "folate",
  },
  {
    shopwareId: "sw-placeholder-magnesium",
    name: "Magnesium",
    short: "Fairvital-Produkte zu Magnesium ansehen.",
    url: "https://fairvital.com/search?s=Magnesium",
    relatedMarker: "magnesium",
  },
  {
    shopwareId: "sw-placeholder-zinc",
    name: "Zink",
    short: "Fairvital-Produkte zu Zink ansehen.",
    url: "https://fairvital.com/search?s=Zink",
    relatedMarker: "zinc",
  },
  {
    shopwareId: "sw-placeholder-selenium",
    name: "Selen",
    short: "Fairvital-Produkte zu Selen ansehen.",
    url: "https://fairvital.com/search?s=Selen",
    relatedMarker: "selenium",
  },
  {
    shopwareId: "sw-placeholder-calcium",
    name: "Calcium",
    short: "Fairvital-Produkte zu Calcium ansehen.",
    url: "https://fairvital.com/search?s=Calcium",
    relatedMarker: "calcium",
  },
  {
    shopwareId: "sw-placeholder-copper",
    name: "Kupfer",
    short: "Fairvital-Produkte zu Kupfer ansehen.",
    url: "https://fairvital.com/search?s=Kupfer",
    relatedMarker: "copper",
  },
  {
    shopwareId: "sw-placeholder-vita",
    name: "Vitamin A",
    short: "Fairvital-Produkte zu Vitamin A ansehen.",
    url: "https://fairvital.com/search?s=Vitamin%20A",
    relatedMarker: "vita",
  },
  {
    shopwareId: "sw-placeholder-vitc",
    name: "Vitamin C",
    short: "Fairvital-Produkte zu Vitamin C ansehen.",
    url: "https://fairvital.com/search?s=Vitamin%20C",
    relatedMarker: "vitc",
  },
  {
    shopwareId: "sw-placeholder-vite",
    name: "Vitamin E",
    short: "Fairvital-Produkte zu Vitamin E ansehen.",
    url: "https://fairvital.com/search?s=Vitamin%20E",
    relatedMarker: "vite",
  },
  {
    shopwareId: "sw-placeholder-vitk",
    name: "Vitamin K",
    short: "Fairvital-Produkte zu Vitamin K ansehen.",
    url: "https://fairvital.com/search?s=Vitamin%20K",
    relatedMarker: "vitk",
  },
];

// A verified catalog item for general browsing when no measured deficiency matches.
// This is not a recommendation based on the user's lab results.
export const catalogSpotlight: Product = {
  shopwareId: "98106",
  name: "Acerola mit Hesperidin · 60 Kapseln",
  short: "Mit Vitamin C · im Fairvital Sortiment entdecken.",
  url: "https://fairvital.com/Acerola-mit-Hesperidin-60-Kapseln-Schluckfreundlich-Mit-Vitamin-C-Fuer-Immunsystem-Kollagenbildung-uvm.-Vegan-Fairvital-98106",
};

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
