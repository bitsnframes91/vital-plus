import { combinedPlan } from "./goal-plan";

type PlanLike = { date: string; items: { title: string; detail: string; daily?: boolean }[] } | null;

export const fallbackGoals = [
  { id: "protein", title: "Proteinreiches Frühstück", sub: "Ziel 30 g Protein" },
  { id: "omega", title: "Omega-3 einnehmen", sub: "2 Kapseln · morgens" },
  { id: "move", title: "30 Minuten Bewegung", sub: "Spaziergang oder Rad" },
];

// Local calendar day, so daily counters reset at 00:00 in the user's timezone.
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Daily goals come from the combined plan (lab report + onboarding goals); checkmarks reset each day. */
export function dailyGoals(plan: PlanLike, goals: string[] = [], goalOff: Record<string, boolean> = {}) {
  const steps = combinedPlan(plan, goals, goalOff);
  if (!steps.length) return { fromPlan: false, goals: fallbackGoals.map((g) => ({ ...g, key: g.id })) };
  const d = todayKey();
  const list = steps
    .filter((g) => g.daily)
    .map((g) => ({ id: g.key, title: g.title, sub: g.detail, daily: true, key: `${d}:${g.key}` }));
  return { fromPlan: true, goals: list };
}
