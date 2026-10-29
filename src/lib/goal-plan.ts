import { products, type Product } from "./data";
import { currentLanguage } from "./language";

// Plan steps and Fairvital products derived from the onboarding goals ("Was ist dir wichtig?").
type GoalStep = { id: string; title: string; detail: string };
type GoalPlan = { steps: GoalStep[]; productIds: string[] };

export const goalPlans: Record<string, GoalPlan> = {
  Longevity: {
    steps: [
      { id: "longevity-plants", title: "30 verschiedene Pflanzen pro Woche", detail: "Gemüse, Obst, Hülsenfrüchte, Nüsse und Kräuter zählen – Vielfalt stärkt Darm und Zellschutz." },
      { id: "move-30", title: "30 Minuten Bewegung", detail: "Zügiges Gehen, Radfahren oder Schwimmen – so, dass du dich noch unterhalten kannst." },
    ],
    productIds: ["73412", "73905"],
  },
  "Mehr Energie": {
    steps: [
      { id: "energy-breakfast", title: "Proteinreiches Frühstück", detail: "Etwa 25–30 g Protein am Morgen, z. B. Skyr, Eier oder Haferflocken mit Nüssen, halten den Blutzucker stabil." },
      { id: "energy-daylight", title: "10 Minuten Tageslicht am Vormittag", detail: "Licht am Morgen stabilisiert deinen Tag-Nacht-Rhythmus und macht wacher." },
    ],
    productIds: ["82609", "79824"],
  },
  "Besser schlafen": {
    steps: [
      { id: "sleep-screen", title: "Bildschirme 60 Minuten vor dem Schlafen aus", detail: "Weniger helles Licht am Abend erleichtert das Einschlafen." },
      { id: "sleep-rhythm", title: "Gleiche Schlafenszeit", detail: "Geh möglichst jeden Tag zur selben Zeit ins Bett – auch am Wochenende." },
    ],
    productIds: ["77950"],
  },
  Immunsystem: {
    steps: [
      { id: "immune-colors", title: "Zwei Portionen buntes Obst und Gemüse", detail: "Paprika, Beeren, Zitrusfrüchte und Brokkoli liefern Vitamin C und Pflanzenstoffe." },
      { id: "move-30", title: "30 Minuten Bewegung", detail: "Regelmäßige, moderate Bewegung an der frischen Luft unterstützt die Abwehr." },
    ],
    productIds: ["98106", "52509"],
  },
  "Herz & Kreislauf": {
    steps: [
      { id: "heart-fish", title: "Omega-3-Quelle einplanen", detail: "Leinsamen, Walnüsse oder zweimal pro Woche fetter Fisch." },
      { id: "heart-walk", title: "Zügiger Spaziergang", detail: "20–30 Minuten in einem Tempo, das dich leicht ins Schwitzen bringt." },
    ],
    productIds: ["73412", "77950"],
  },
  "Gewicht halten": {
    steps: [
      { id: "weight-veg", title: "Halber Teller Gemüse", detail: "Bei Mittag- und Abendessen zuerst Gemüse auffüllen – sättigt mit Ballaststoffen." },
      { id: "weight-water", title: "1,5–2 Liter Wasser trinken", detail: "Ein Glas Wasser vor jeder Mahlzeit hilft, Hunger und Durst zu unterscheiden." },
    ],
    productIds: ["83150"],
  },
  "Sport & Regeneration": {
    steps: [
      { id: "sport-protein", title: "Protein nach dem Training", detail: "Innerhalb von zwei Stunden nach dem Sport eine proteinreiche Mahlzeit." },
      { id: "sport-mobility", title: "10 Minuten Mobility", detail: "Dehnen oder lockere Mobilisation an trainingsfreien Tagen." },
    ],
    productIds: ["77950", "83150"],
  },
  "Stimmung aufhellen": {
    steps: [
      { id: "energy-daylight", title: "10 Minuten Tageslicht am Vormittag", detail: "Tageslicht hebt die Stimmung und stabilisiert den Rhythmus." },
      { id: "mood-connect", title: "Bewusste Pause", detail: "Fünf Minuten Atemübung, ein Telefonat mit einem lieben Menschen oder ein kurzer Spaziergang." },
    ],
    productIds: ["73905", "82609"],
  },
  "Hormon Balance": {
    steps: [
      { id: "hormone-fats", title: "Gesunde Fette einbauen", detail: "Avocado, Nüsse, Leinöl oder Olivenöl liefern Bausteine für den Hormonstoffwechsel." },
      { id: "sleep-rhythm", title: "Gleiche Schlafenszeit", detail: "Ein fester Schlafrhythmus unterstützt einen ausgeglichenen Hormonhaushalt." },
    ],
    productIds: ["73412", "52509"],
  },
  "Menopause-Heldin": {
    steps: [
      { id: "meno-calcium", title: "Calciumreiche Lebensmittel", detail: "Joghurt, Käse, grünes Gemüse oder calciumreiches Mineralwasser für deine Knochen." },
      { id: "meno-strength", title: "Krafttraining 2× pro Woche", detail: "Kurze Einheiten mit dem eigenen Körpergewicht erhalten Muskeln und Knochen." },
    ],
    productIds: ["76925", "73905"],
  },
  Kinderwunsch: {
    steps: [
      { id: "fert-greens", title: "Grünes Blattgemüse", detail: "Spinat, Feldsalat oder Brokkoli liefern natürliches Folat." },
      { id: "fert-alcohol", title: "Alkoholfreier Tag", detail: "Verzichte möglichst auf Alkohol und Nikotin." },
    ],
    productIds: ["101018", "73905"],
  },
  "Male Health": {
    steps: [
      { id: "male-zinc", title: "Zinkreiche Mahlzeit", detail: "Kürbiskerne, Haferflocken, Linsen oder Rindfleisch einplanen." },
      { id: "meno-strength", title: "Krafttraining 2× pro Woche", detail: "Kurze Einheiten mit dem eigenen Körpergewicht erhalten Muskelkraft." },
    ],
    productIds: ["52509", "80709"],
  },
  Konzentration: {
    steps: [
      { id: "focus-blocks", title: "Fokusblöcke mit Pausen", detail: "45 Minuten konzentriert arbeiten, dann 5 Minuten bewegen und Wasser trinken." },
      { id: "heart-fish", title: "Omega-3-Quelle einplanen", detail: "Leinsamen, Walnüsse oder fetter Fisch unterstützen die Gehirnfunktion." },
    ],
    productIds: ["73412", "82609"],
  },
  Fastenzeit: {
    steps: [
      { id: "fast-window", title: "12 Stunden Essenspause über Nacht", detail: "Zum Beispiel von 20 bis 8 Uhr – Wasser und ungesüßter Tee sind erlaubt." },
      { id: "weight-water", title: "1,5–2 Liter Wasser trinken", detail: "Gerade beim Fasten ist ausreichend Flüssigkeit wichtig." },
    ],
    productIds: ["77950", "83150"],
  },
};

export type PlanStep = { key: string; title: string; detail: string; daily: boolean; source: "labor" | "goal"; goals: string[] };

type LabText = { title: string; detail: string };
type LabPlan = { date: string; items: { title: string; detail: string; daily?: boolean; en?: LabText; es?: LabText }[] } | null;

/** Lab-report steps carry AI-written translations; fall back to the German original. */
function labText(it: { title: string; detail: string; en?: LabText; es?: LabText }): LabText {
  const lang = currentLanguage();
  const t = lang === "de" ? undefined : it[lang];
  return t?.title ? { title: t.title, detail: t.detail || it.detail } : { title: it.title, detail: it.detail };
}

/** Combines lab-report steps with onboarding-goal steps; goal steps are deduplicated across goals. */
export function combinedPlan(labPlan: LabPlan, goals: string[], goalOff: Record<string, boolean> = {}): PlanStep[] {
  const lab: PlanStep[] = (labPlan?.items ?? []).map((it, i) => ({ key: `plan-${i}`, ...labText(it), daily: it.daily !== false, source: "labor", goals: [] }));
  const goalSteps = new Map<string, PlanStep>();
  for (const goal of goals) {
    for (const step of goalPlans[goal]?.steps ?? []) {
      const key = `goal-${step.id}`;
      const existing = goalSteps.get(key);
      if (existing) existing.goals.push(goal);
      else goalSteps.set(key, { key, title: step.title, detail: step.detail, daily: !goalOff[key], source: "goal", goals: [goal] });
    }
  }
  return [...lab, ...goalSteps.values()];
}

/** Fairvital products matching the selected goals, each listed once with the goals it supports. */
export function goalProducts(goals: string[]): { product: Product; goals: string[] }[] {
  const out = new Map<string, { product: Product; goals: string[] }>();
  for (const goal of goals) {
    for (const id of goalPlans[goal]?.productIds ?? []) {
      const product = products.find((p) => p.shopwareId === id);
      if (!product) continue;
      const entry = out.get(id);
      if (entry) entry.goals.push(goal);
      else out.set(id, { product, goals: [goal] });
    }
  }
  return [...out.values()];
}
