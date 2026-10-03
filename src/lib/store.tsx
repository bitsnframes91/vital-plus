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
};

const Ctx = createContext<{ s: State; set: (p: Partial<State>) => void } | null>(null);
const KEY = "fv-health-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) try { setS({ ...initial, ...JSON.parse(raw) }); } catch { /* ignore */ }
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
