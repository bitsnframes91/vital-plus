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
  image: string;
  relatedMarker?: string;
};

export const products: Product[] = [
  {
    shopwareId: "73905",
    name: "Vitamin D3 + K2 MK7",
    short: "1000 I.E. + 100 µg · 50 ml",
    url: "https://fairvital.com/Vitamin-D3-K2-MK7-1000-I.E.-100-mg-50-ml-fuer-Knochen-Immunsystem-uvm.-Fairvital-73905",
    image: imgVitd.url,
    relatedMarker: "vitd",
  },
  {
    shopwareId: "73412",
    name: "Flachsöl Omega 3-6-9",
    short: "Mit Vitamin E · 120 Softgels",
    url: "https://fairvital.com/Flachsoel-Leinoel-Omega-3-6-9-mit-Vitamin-E-120-Softgels-fuer-Zellschutz-vor-oxidativem-Stress-Hochdosiert-Fairvital-73412",
    image: imgOmega.url,
    relatedMarker: "omega",
  },
  {
    shopwareId: "79824",
    name: "Eisen 20mg + C",
    short: "240 Tabletten · vegan",
    url: "https://fairvital.com/Eisen-20mg-C-240-Tabletten-Schluckfreundlich-Fuer-Energie-Immunsystem-uvm.-Vegan-Fairvital-79824",
    image: imgFerritin.url,
    relatedMarker: "ferritin",
  },
  {
    shopwareId: "82609",
    name: "B-12 + Folsäure sublingual",
    short: "90 Tabletten · mit Vitamin C",
    url: "https://fairvital.com/B-12-Folsaeure-sublingual-90-Tabletten-mit-Vitamin-C-fuer-Immunsystem-gegen-Muedigkeit-uvm.-Fairvital-82609",
    image: imgB12.url,
    relatedMarker: "b12",
  },
  {
    shopwareId: "101018",
    name: "Folsäure 5000µg",
    short: "180 Tabletten · vegan",
    url: "https://fairvital.com/Folsaeure-5000-g-180-Tabletten-ueber-100-Bedarfsabdeckung-fuer-Blutbildung-Zellteilung-uvm.-vegan-Fairvital-101018",
    image: imgFolate.url,
    relatedMarker: "folate",
  },
  {
    shopwareId: "77950",
    name: "Magnesium Malat Pulver",
    short: "500 g · für Muskeln & Knochen",
    url: "https://fairvital.com/Magnesium-Malat-Pulver-500g-fuer-Musklen-Knochen-Elektrolytgleichgewicht-uvm.-Fairvital-77950",
    image: imgMagnesium.url,
    relatedMarker: "magnesium",
  },
  {
    shopwareId: "52509",
    name: "Zink + Histidin + Vitamin C",
    short: "90 Kapseln · vegan",
    url: "https://fairvital.com/Zink-Histidin-Vitamin-C-90-Kapseln-Schluckfreundlich-fuer-Haare-Haut-uvm.-375-abgedeckter-Bedarf-Vegan-Fairvital-52509",
    image: imgZinc.url,
    relatedMarker: "zinc",
  },
  {
    shopwareId: "80709",
    name: "Selen 200µg",
    short: "90 Tabletten · vegan",
    url: "https://fairvital.com/Selen-200-g-90-Tabletten-Schluckfreundlich-Fuer-Schilddruese-Immunsystem-Haare-uvm.-Vegan-Fairvital-80709",
    image: imgSelenium.url,
    relatedMarker: "selenium",
  },
  {
    shopwareId: "76925",
    name: "Calcium Magnesium Zink",
    short: "250 Tabletten",
    url: "https://fairvital.com/Calcium-Magnesium-Zink-250-Tabletten-fuer-Knochen-Muskeln-Immunsystem-uvm.-Fairvital-76925",
    image: imgCalcium.url,
    relatedMarker: "calcium",
  },
  {
    shopwareId: "72110",
    name: "Kupfer 2mg",
    short: "100 Tabletten · vegan",
    url: "https://fairvital.com/Kupfer-2mg-100-Tabletten-Schluckfreundlich-Fuer-Immunsystem-Eisentransport-uvm.-Vegan-Fairvital-72110",
    image: imgCopper.url,
    relatedMarker: "copper",
  },
  {
    shopwareId: "84309",
    name: "Beta-Carotin 15mg",
    short: "25.000 I.E. · 90 Softgels",
    url: "https://fairvital.com/Beta-Carotin-15mg-natuerlich-25.000-IE-90-Softgels-hochdosiert-Fairvital-84309",
    image: imgVita.url,
    relatedMarker: "vita",
  },
  {
    shopwareId: "98106",
    name: "Acerola mit Hesperidin",
    short: "Mit Vitamin C · 60 Kapseln",
    url: "https://fairvital.com/Acerola-mit-Hesperidin-60-Kapseln-Schluckfreundlich-Mit-Vitamin-C-Fuer-Immunsystem-Kollagenbildung-uvm.-Vegan-Fairvital-98106",
    image: imgVitc.url,
    relatedMarker: "vitc",
  },
  {
    shopwareId: "87950",
    name: "Vitamin E 400 I.E.",
    short: "500 Softgels",
    url: "https://fairvital.com/Vitamin-E-400-I.E.-500-Softgels-Schluckfreundlich-Fuer-Zellschutz-Fairvital-87950",
    image: imgVite.url,
    relatedMarker: "vite",
  },
  {
    shopwareId: "101512",
    name: "Vitamin K Komplex K1 & K2",
    short: "120 Tabletten · vegan",
    url: "https://fairvital.com/Vitamin-K-Komplex-K1-K2-120-Tabletten-fuer-Knochen-Blutgerinnung-ueber-100-Bedarfsabdeckung-vegan-Fairvital-101512",
    image: imgVitk.url,
    relatedMarker: "vitk",
  },
];

// A verified catalog item for general browsing when no measured deficiency matches.
// This is not a recommendation based on the user's lab results.
export const catalogSpotlight: Product = products.find((p) => p.shopwareId === "98106")!;

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
