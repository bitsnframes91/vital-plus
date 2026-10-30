import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type React from "react";
import { initialMeals, initialSupplements, labMarkers as seedLabs, type Meal, type Supplement, type LabMarker } from "./data";
import { supabase } from "@/integrations/supabase/client";
import { questionnaireForAccount } from "./questionnaire-draft";
import { todayKey } from "./daily-goals";

// Health state: kept in the browser and synced to the signed-in user's Lovable Cloud account.
type State = {
  name: string;
  goals: string[];
  diet?: string;
  onboarded: boolean;
  meals: Meal[];
  supplements: Supplement[];
  labs: LabMarker[];
  actionsDone: Record<string, boolean>;
  consent: { practitioner: boolean; analytics: boolean; healthDataAt?: string | null; healthVersion?: string | null };
  account: { email: string; userId: string } | null;
  aiPlan: { date: string; items: { title: string; detail: string; daily?: boolean; en?: { title: string; detail: string }; es?: { title: string; detail: string } }[] } | null;
  body: { weightKg: number | null; waistCm: number | null; sleepHours: number | null; steps: number | null; stepsDate?: string | null; sleepDate?: string | null; heightCm?: number | null; age?: number | null; sex?: "female" | "male" | "diverse" | "unspecified" | null; activity?: string | null; stepGoal?: number | null; targetWeightKg?: number | null };
  weekLog: Record<string, number>;
  weightLog: Record<string, number>;
  fullDays: Record<string, boolean>;
  waterLog: Record<string, number>;
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
  body: { weightKg: null, waistCm: null, sleepHours: null, steps: null, targetWeightKg: null },
  weekLog: {},
  weightLog: {},
  fullDays: {},
  waterLog: {},
};

type CtxValue = { s: State; set: (p: Partial<State>) => void; syncPaused: boolean; resumeSync: () => void } | null;
const g = globalThis as unknown as { __fvStoreCtx?: React.Context<CtxValue> };
const Ctx = g.__fvStoreCtx ?? (g.__fvStoreCtx = createContext<CtxValue>(null));
const KEY = "fv-health-v1";

function migrate(parsed: any) {
  if (Array.isArray(parsed.meals)) {
    const today = todayKey();
    parsed.meals = parsed.meals.map((m: any) => ({ kcal: 0, fiber: 0, carbs: 0, fat: 0, date: today, ...m }));
    parsed.meals = parsed.meals.filter((m: any) => !((m.id === "m1" && m.name === "Skyr mit Beeren & Walnüssen") || (m.id === "m2" && m.name === "Linsen-Bowl mit Gemüse")));
  }
  if (parsed.account && !parsed.account.userId) parsed.account = null;
  // "Gesund altern" was renamed to "Longevity".
  if (Array.isArray(parsed.goals)) parsed.goals = [...new Set(parsed.goals.map((x: string) => (x === "Gesund altern" ? "Longevity" : x)))];
  parsed.weekLog = typeof parsed.weekLog === "object" && parsed.weekLog !== null ? parsed.weekLog : {};
  parsed.weightLog = typeof parsed.weightLog === "object" && parsed.weightLog !== null ? parsed.weightLog : {};
  parsed.fullDays = typeof parsed.fullDays === "object" && parsed.fullDays !== null ? parsed.fullDays : {};
  parsed.waterLog = typeof parsed.waterLog === "object" && parsed.waterLog !== null ? parsed.waterLog : {};
  if (parsed.actionsDone) {
    const today = todayKey();
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

  const [syncPaused, setSyncPaused] = useState(false);
  // Health data is only sent to the account once an active consent exists (the server enforces this too).
  const consentOk = useRef<boolean | null>(null);
  const pending = useRef<State | null>(null);

  const upload = (uid: string, next: State) => {
    const { account: _a, ...state } = next;
    // Query builders are lazy: the request is only sent once the promise is consumed.
    supabase
      .from("user_data")
      .upsert({ user_id: uid, state: state as any, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (!error) { if (pending.current === next) pending.current = null; return; }
        console.error("fairvitalgo: saving account data failed", error.message);
        // Refused by the consent policy: keep the change pending until consent is granted.
        if (error.code === "42501" || /consent|row-level security/i.test(error.message)) { consentOk.current = false; setSyncPaused(true); }
      });
  };

  const push = (next: State) => {
    const uid = userRef.current;
    if (!uid) return;
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (consentOk.current !== true) {
        const { data, error } = await supabase.rpc("has_active_health_consent", { _user_id: uid });
        if (userRef.current !== uid) return;
        consentOk.current = !error && data === true;
      }
      if (!consentOk.current) { setSyncPaused(true); return; }
      setSyncPaused(false);
      if (pending.current) upload(uid, pending.current);
    }, 800);
  };

  /** Call after consent is recorded: saves any changes kept back while consent was missing. */
  const resumeSync = () => {
    consentOk.current = null;
    if (pending.current) push(pending.current);
    else setSyncPaused(false);
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

    const onUser = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null, signedOut = false) => {
      if (!user) {
        userRef.current = null;
        consentOk.current = null; pending.current = null; setSyncPaused(false);
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
      consentOk.current = null; pending.current = null;
      const account = { email: user.email ?? "", userId: user.id };
      const { data, error } = await supabase.from("user_data").select("state").eq("user_id", user.id).maybeSingle();
      if (userRef.current !== user.id) return;
      void supabase.rpc("has_active_health_consent", { _user_id: user.id }).then(({ data: ok, error: cErr }) => {
        if (userRef.current !== user.id || cErr) return;
        if (consentOk.current === null) consentOk.current = ok === true;
        if (ok !== true) setSyncPaused(true);
      });
      const questionnaire = error ? null : questionnaireForAccount(data?.state, user.user_metadata?.["questionnaire"]);
      setS((p) => {
        // A new account never inherits data held on this device (privacy: shared devices / previous accounts).
        // New accounts start empty: no demo meals, lab values or completed goals.
        const fresh: State = { ...initial, meals: [], labs: [], actionsDone: {}, account };
        const next = data?.state ? { ...fresh, ...migrate(data.state as any), account } : questionnaire ? { ...fresh, name: questionnaire.name, goals: questionnaire.goals, diet: questionnaire.diet, body: { ...fresh.body, ...questionnaire.body, steps: 0 }, onboarded: true, consent: { ...fresh.consent, healthDataAt: questionnaire.healthConsentAt ?? null, healthVersion: questionnaire.healthConsentVersion ?? null } } : fresh;
        localStorage.setItem(KEY, JSON.stringify(next));
        if (!data && !error) push(next);
        return next;
      });
    };

    supabase.auth.getUser().then(({ data }) => onUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") void onUser(null, true);
      if (event === "SIGNED_IN") void supabase.auth.getUser().then(({ data }) => onUser(data.user));
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
      const today = todayKey();
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
  return <Ctx.Provider value={{ s, set, syncPaused, resumeSync }}>{children}</Ctx.Provider>;
}

/** Today's date key (local), matching the day-based logs. */
export const todayDateKey = todayKey;

/** Daily counters reset at midnight: steps/sleep only count for the day they were entered. */
export function dailyValue<T>(value: T | null | undefined, date: string | null | undefined): T | null {
  return value != null && date === todayDateKey() ? value : null;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
