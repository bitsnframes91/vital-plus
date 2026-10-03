type PlanLike = { date: string; items: { title: string; detail: string; daily?: boolean }[] } | null;

export const fallbackGoals = [
  { id: "protein", title: "Proteinreiches Frühstück", sub: "Ziel 30 g Protein" },
  { id: "omega", title: "Omega-3 einnehmen", sub: "2 Kapseln · morgens" },
  { id: "move", title: "30 Minuten Bewegung", sub: "Spaziergang oder Rad" },
];

export const todayKey = () => new Date().toISOString().slice(0, 10);

/** Daily goals come from the user's plan; checkmarks reset each day. */
export function dailyGoals(plan: PlanLike) {
  if (!plan || !plan.items.length) return { fromPlan: false, goals: fallbackGoals.map((g) => ({ ...g, key: g.id })) };
  const d = todayKey();
  const goals = plan.items
    .map((it, i) => ({ id: `plan-${i}`, title: it.title, sub: it.detail, daily: it.daily !== false }))
    .filter((g) => g.daily)
    .map((g) => ({ ...g, key: `${d}:${g.id}` }));
  return { fromPlan: true, goals };
}
