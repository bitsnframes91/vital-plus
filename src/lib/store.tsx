import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type React from "react";
import { initialMeals, initialSupplements, labMarkers as seedLabs, type Meal, type Supplement, type LabMarker } from "./data";
import { supabase } from "@/integrations/supabase/client";

// Health state: kept in the browser and synced to the signed-in user's Lovable Cloud account.
type State = {
  name: string;
  goals: string[];
  onboarded: boolean;
  meals: Meal[];
  supplements: Supplement[];
  labs: LabMarker[];
  actionsDone: Record<string, boolean>;
  consent: { practitioner: boolean; analytics: boolean };
  account: { email: string; userId: string } | null;
  aiPlan: { date: string; items: { title: string; detail: string; daily?: boolean }[] } | null;
  body: { weightKg: number | null; waistCm: number | null; sleepHours: number | null; steps: number | null; heightCm?: number | null; age?: number | null; sex?: "female" | "male" | "diverse" | "unspecified" | null; activity?: string | null; stepGoal?: number | null };
  weekLog: Record<string, number>;
  weightLog: Record<string, number>;
  fullDays: Record<string, boolean>;
  goalOff?: Record<string, boolean>;
};

const initial: State = {
  name: "",
  goals: ["Longevity", "Mehr Energie"],
  onboarded: false,
  meals: initialMeals,
  supplements: initialSupplements,
  labs: seedLabs,
  actionsDone: { protein: true, omega: true, move: false },
  consent: { practitioner: false, analytics: false },
  account: null,
  aiPlan: null,
  body: { weightKg: null, waistCm: null, sleepHours: null, steps: null },
  weekLog: {},
  weightLog: {},
  fullDays: {},
};

type CtxValue = { s: State; set: (p: Partial<State>) => void } | null;
const g = globalThis as unknown as { __fvStoreCtx?: React.Context<CtxValue> };
const Ctx = g.__fvStoreCtx ?? (g.__fvStoreCtx = createContext<CtxValue>(null));
const KEY = "fv-health-v1";

function migrate(parsed: any) {
  if (Array.isArray(parsed.meals)) {
    const today = new Date().toISOString().slice(0, 10);
    parsed.meals = parsed.meals.map((m: any) => ({ kcal: 0, fiber: 0, carbs: 0, fat: 0, date: today, ...m }));
  }
  if (parsed.account && !parsed.account.userId) parsed.account = null;
  parsed.weekLog = typeof parsed.weekLog === "object" && parsed.weekLog !== null ? parsed.weekLog : {};
  parsed.weightLog = typeof parsed.weightLog === "object" && parsed.weightLog !== null ? parsed.weightLog : {};
  parsed.fullDays = typeof parsed.fullDays === "object" && parsed.fullDays !== null ? parsed.fullDays : {};
  if (parsed.actionsDone) {
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.weekLog[today] === undefined) {
      parsed.weekLog[today] = Object.entries(parsed.actionsDone).filter(([k, v]) => (k.startsWith(today) || !k.includes(":")) && v).length;
    }
  }
  return parsed;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const userRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (next: State) => {
    const uid = userRef.current;
    if (!uid) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { account: _a, ...state } = next;
      // Query builders are lazy: the request is only sent once the promise is consumed.
      supabase
        .from("user_data")
        .upsert({ user_id: uid, state: state as any, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error("Vivo: saving account data failed", error.message); });
    }, 800);
  };

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    let hadAccountCache = false;
    if (raw) try {
      const cached = migrate(JSON.parse(raw));
      hadAccountCache = Boolean(cached.account);
      // Account data is restored only after the current identity is verified.
      if (!cached.account) setS({ ...initial, ...cached });
    } catch { /* ignore */ }

    const onUser = async (user: { id: string; email?: string } | null, signedOut = false) => {
      if (!user) {
        userRef.current = null;
        if (timer.current) clearTimeout(timer.current);
        setS((p) => {
          if (signedOut || p.account || hadAccountCache) {
            localStorage.removeItem(KEY);
            return { ...initial };
          }
          return { ...p, account: null };
        });
        return;
      }
      if (userRef.current === user.id) return;
      if (timer.current) clearTimeout(timer.current);
      userRef.current = user.id;
      const account = { email: user.email ?? "", userId: user.id };
      const { data } = await supabase.from("user_data").select("state").eq("user_id", user.id).maybeSingle();
      if (userRef.current !== user.id) return;
      setS((p) => {
        // A new account never inherits data held on this device (privacy: shared devices / previous accounts).
        // New accounts start empty: no demo meals, lab values or completed goals.
        const fresh: State = { ...initial, meals: [], labs: [], actionsDone: {}, account };
        const next = data?.state ? { ...fresh, ...migrate(data.state as any), account } : fresh;
        localStorage.setItem(KEY, JSON.stringify(next));
        if (!data) push(next);
        return next;
      });
    };

    supabase.auth.getUser().then(({ data }) => onUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void onUser(session?.user ?? null, event === "SIGNED_OUT");
    });
    return () => {
      sub.subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (p: Partial<State>) =>
    setS((prev) => {
      const next = { ...prev, ...p };
      const today = new Date().toISOString().slice(0, 10);
      if (p.actionsDone) {
        next.weekLog = { ...prev.weekLog, [today]: Object.entries(p.actionsDone).filter(([k, v]) => (k.startsWith(today) || !k.includes(":")) && v).length };
      }
      if (p.body && p.body.weightKg != null) {
        next.weightLog = { ...prev.weightLog, [today]: p.body.weightKg };
      }
      localStorage.setItem(KEY, JSON.stringify(next));
      push(next);
      return next;
    });
  return <Ctx.Provider value={{ s, set }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
