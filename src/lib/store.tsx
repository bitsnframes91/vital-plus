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
  body: { weightKg: number | null; waistCm: number | null; sleepHours: number | null; steps: number | null };
  weekLog: Record<string, number>;
  weightLog: Record<string, number>;
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
  weekLog: {},
  weightLog: {},
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
      void supabase.from("user_data").upsert({ user_id: uid, state: state as any, updated_at: new Date().toISOString() });
    }, 800);
  };

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) try { setS({ ...initial, ...migrate(JSON.parse(raw)) }); } catch { /* ignore */ }

    const onUser = async (user: { id: string; email?: string } | null) => {
      if (!user) {
        userRef.current = null;
        setS((p) => ({ ...p, account: null }));
        return;
      }
      if (userRef.current === user.id) return;
      userRef.current = user.id;
      const account = { email: user.email ?? "", userId: user.id };
      const { data } = await supabase.from("user_data").select("state").eq("user_id", user.id).maybeSingle();
      setS((p) => {
        const next = data?.state ? { ...initial, ...migrate(data.state as any), account } : { ...p, account };
        localStorage.setItem(KEY, JSON.stringify(next));
        if (!data) push(next);
        return next;
      });
    };

    supabase.auth.getUser().then(({ data }) => onUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void onUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (p: Partial<State>) =>
    setS((prev) => {
      const next = { ...prev, ...p };
      const today = new Date().toISOString().slice(0, 10);
      if (p.actionsDone) {
        next.weekLog = { ...prev.weekLog, [today]: Object.entries(p.actionsDone).filter(([k, v]) => k.startsWith(today) && v).length };
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
