import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type React from "react";
import { initialMeals, initialSupplements, labMarkers as seedLabs, type Meal, type Supplement, type LabMarker } from "./data";
import { supabase } from "@/integrations/supabase/client";
import { questionnaireForAccount } from "./questionnaire-draft";
import { todayKey } from "./daily-goals";
import { HEALTH_CONSENT_VERSION, canRecordLocalConsent, needsConsentPrompt, type ConsentStatus } from "./consent-policy";

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

type CtxValue = {
  s: State;
  set: (p: Partial<State>) => void;
  /** Server-confirmed health-data consent of the signed-in user; null while unknown (signed out, loading, offline). */
  consent: ConsentStatus | null;
  grantConsent: () => Promise<boolean>;
  withdrawConsent: (deleteData: boolean) => Promise<boolean>;
  /** Drops the account's state and unsent saves from this device (after the account was deleted). */
  forgetAccount: () => void;
} | null;
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
  const pending = useRef<(() => Promise<void>) | null>(null);
  const [consent, setConsentState] = useState<ConsentStatus | null>(null);
  const consentRef = useRef<ConsentStatus | null>(null);
  // Newest state, and whether it changed while saving was not allowed yet.
  const latest = useRef<State>(initial);
  const held = useRef(false);

  const cancelPending = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  };

  const push = (next: State) => {
    const uid = userRef.current;
    if (!uid) return;
    // The server rejects health-data writes without active consent (RLS + trigger, error 42501). Until consent
    // is confirmed the newest state stays on this device and is sent once consent becomes active.
    if (consentRef.current !== "active") { held.current = true; return; }
    if (timer.current) clearTimeout(timer.current);
    const send = async () => {
      cancelPending();
      const { account: _a, ...state } = next;
      // Query builders are lazy: the request is only sent once the promise is consumed.
      const { error } = await supabase
        .from("user_data")
        .upsert({ user_id: uid, state: state as any, updated_at: new Date().toISOString() });
      if (!error) return;
      console.error("Vitalplus: saving account data failed", error.message);
      // Consent was withdrawn elsewhere (or a new policy applies): keep the change and check consent again.
      if (error.code === "42501" && userRef.current === uid) { held.current = true; void loadConsent(uid); }
    };
    pending.current = send;
    timer.current = setTimeout(send, 800);
  };

  const setConsent = (status: ConsentStatus | null) => {
    const was = consentRef.current;
    consentRef.current = status;
    setConsentState(status);
    if (status !== "active") { if (pending.current) held.current = true; cancelPending(); }
    else if (was !== "active" && held.current) { held.current = false; push(latest.current); }
  };

  const loadConsent = async (uid: string) => {
    try {
      const { data, error } = await supabase.rpc("health_consent_status", { _version: HEALTH_CONSENT_VERSION });
      if (userRef.current !== uid || error) return;
      let status = data as ConsentStatus;
      // Consent ticked in the questionnaire before the account existed is recorded once identity is verified.
      if (needsConsentPrompt(status) && canRecordLocalConsent(latest.current.consent)) {
        const { error: recErr } = await supabase.rpc("give_health_consent", { _version: HEALTH_CONSENT_VERSION });
        if (userRef.current !== uid) return;
        if (!recErr) status = "active";
      }
      setConsent(status);
    } catch { /* offline: stays unknown and is checked again when the app returns or goes online */ }
  };

  const grantConsent = async () => {
    const uid = userRef.current;
    if (!uid) return false;
    const { error } = await supabase.rpc("give_health_consent", { _version: HEALTH_CONSENT_VERSION });
    if (error || userRef.current !== uid) return false;
    setConsent("active");
    set({ consent: { ...latest.current.consent, healthDataAt: new Date().toISOString(), healthVersion: HEALTH_CONSENT_VERSION } });
    return true;
  };

  const withdrawConsent = async (deleteData: boolean) => {
    const uid = userRef.current;
    if (!uid) return false;
    // Kept data includes a change made just before withdrawing; data about to be erased is not sent.
    if (deleteData) cancelPending(); else await pending.current?.();
    const { error } = await supabase.rpc("withdraw_health_consent", { _delete_data: deleteData });
    if (error || userRef.current !== uid) return false;
    held.current = false;
    setConsent("withdrawn");
    const prev = latest.current;
    const next: State = deleteData
      ? { ...initial, meals: [], labs: [], actionsDone: {}, account: prev.account }
      : { ...prev, consent: { ...prev.consent, healthDataAt: null, healthVersion: null } };
    latest.current = next;
    localStorage.setItem(KEY, JSON.stringify(next));
    setS(next);
    return true;
  };

  const forgetAccount = () => {
    cancelPending();
    held.current = false;
    userRef.current = null;
    consentRef.current = null;
    setConsentState(null);
    localStorage.removeItem(KEY);
    latest.current = initial;
    setS({ ...initial });
  };

  // iOS suspends timers once the app is hidden: send a pending save right away, so a value entered
  // just before leaving or quitting the app is in the account copy that the next launch restores.
  useEffect(() => {
    const flush = () => void pending.current?.();
    // Consent that could not be checked (offline) is checked again once the app is back.
    const recheck = () => { if (userRef.current && consentRef.current === null) void loadConsent(userRef.current); };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else recheck();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", recheck);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", recheck);
    };
  }, []);

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
        cancelPending();
        held.current = false;
        consentRef.current = null;
        setConsentState(null);
        setS((p) => {
          if (signedOut || p.account || hadAccountCache) {
            localStorage.removeItem(KEY);
            latest.current = initial;
            return { ...initial };
          }
          return (latest.current = { ...p, account: null });
        });
        return;
      }
      if (userRef.current === user.id) return;
      cancelPending();
      held.current = false;
      consentRef.current = null;
      setConsentState(null);
      userRef.current = user.id;
      const account = { email: user.email ?? "", userId: user.id };
      const { data, error } = await supabase.from("user_data").select("state").eq("user_id", user.id).maybeSingle();
      if (userRef.current !== user.id) return;
      const questionnaire = error ? null : questionnaireForAccount(data?.state, user.user_metadata?.["questionnaire"]);
      // A new account never inherits data held on this device (privacy: shared devices / previous accounts).
      // New accounts start empty: no demo meals, lab values or completed goals.
      const fresh: State = { ...initial, meals: [], labs: [], actionsDone: {}, account };
      const next = data?.state ? { ...fresh, ...migrate(data.state as any), account } : questionnaire ? { ...fresh, name: questionnaire.name, goals: questionnaire.goals, diet: questionnaire.diet, body: { ...fresh.body, ...questionnaire.body, steps: 0 }, onboarded: true, consent: { ...fresh.consent, healthDataAt: questionnaire.healthConsentAt ?? null, healthVersion: questionnaire.healthConsentVersion ?? null } } : fresh;
      latest.current = next;
      localStorage.setItem(KEY, JSON.stringify(next));
      setS(next);
      // A new account's first save is held until consent is confirmed (see push), then sent automatically.
      if (!data && !error) push(next);
      void loadConsent(user.id);
    };

    supabase.auth.getUser().then(({ data }) => onUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") void onUser(null, true);
      if (event === "SIGNED_IN") void supabase.auth.getUser().then(({ data }) => onUser(data.user));
    });
    return () => {
      sub.subscription.unsubscribe();
      cancelPending();
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
      latest.current = next;
      localStorage.setItem(KEY, JSON.stringify(next));
      push(next);
      return next;
    });
  return <Ctx.Provider value={{ s, set, consent, grantConsent, withdrawConsent, forgetAccount }}>{children}</Ctx.Provider>;
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
