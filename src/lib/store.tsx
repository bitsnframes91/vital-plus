import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initialMeals, initialSupplements, labMarkers as seedLabs, type Meal, type Supplement, type LabMarker } from "./data";

// Local demo state (persisted in the browser). Will move to Lovable Cloud once accounts are added.
type State = {
  name: string;
  goals: string[];
  onboarded: boolean;
  meals: Meal[];
  supplements: Supplement[];
  labs: LabMarker[];
  actionsDone: Record<string, boolean>;
  consent: { practitioner: boolean; analytics: boolean };
  account: { email: string; firstName: string; lastName: string; contextToken: string } | null;
  aiPlan: { date: string; items: { title: string; detail: string; daily?: boolean }[] } | null;
  body: { weightKg: number | null; waistCm: number | null; sleepHours: number | null; steps: number | null };
};

const initial: State = {
  name: "Jonas",
  goals: ["Gesund altern", "Mehr Energie"],
  onboarded: false,
  meals: initialMeals,
  supplements: initialSupplements,
  labs: seedLabs,
  actionsDone: { protein: true, omega: true, move: false },
  consent: { practitioner: false, analytics: false },
  account: null,
  aiPlan: null,
  body: { weightKg: null, waistCm: null, sleepHours: null, steps: null },
};

type CtxValue = { s: State; set: (p: Partial<State>) => void } | null;
// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as unknown as { __fvStoreCtx?: React.Context<CtxValue> };
const Ctx = g.__fvStoreCtx ?? (g.__fvStoreCtx = createContext<CtxValue>(null));
const KEY = "fv-health-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) try {
      const parsed = JSON.parse(raw);
      // Migrate older meals that lack nutrient fields or a date.
      if (Array.isArray(parsed.meals)) {
        const today = new Date().toISOString().slice(0, 10);
        parsed.meals = parsed.meals.map((m: any) => ({ kcal: 0, fiber: 0, carbs: 0, fat: 0, date: today, ...m }));
      }
      setS({ ...initial, ...parsed });
    } catch { /* ignore */ }
  }, []);
  const set = (p: Partial<State>) =>
    setS((prev) => {
      const next = { ...prev, ...p };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  return <Ctx.Provider value={{ s, set }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
