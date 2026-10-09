import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { createLock, readLock, saveLock, supportsAppLock, verifyLock } from "@/lib/app-lock";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type LockContext = { enabled: boolean; supported: boolean | null; busy: boolean; error: string; enable: () => Promise<void>; disable: () => Promise<void>; lock: () => void };
const Context = createContext<LockContext | null>(null);
export function useAppLock() {
  const context = useContext(Context);
  if (!context) throw new Error("App Lock provider missing");
  return context;
}
export function AppLockProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const { s } = useStore();
  const userId = s.account?.userId;
  const [owner, setOwner] = useState<string | undefined>();
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(true);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => { supportsAppLock().then(setSupported).catch(() => setSupported(false)); }, []);
  useEffect(() => {
    setError("");
    try { const configured = userId ? Boolean(readLock(userId)) : false; setEnabled(configured); setLocked(configured); }
    catch { setEnabled(true); setLocked(true); setError("App Lock konnte nicht geladen werden. Melde dich erneut an."); }
    setOwner(userId);
  }, [userId]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden" && enabled) setLocked(true); };
    const leave = () => { if (enabled) setLocked(true); };
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", leave);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", leave); };
  }, [enabled]);
  const action = async (fn: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await fn(); } catch { setError("Gerätebestätigung fehlgeschlagen oder abgebrochen. Bitte versuche es erneut."); }
    finally { pending.current = false; setBusy(false); }
  };
  const enable = () => action(async () => {
    if (!userId || !supported) throw new Error("Not available");
    const key = await createLock(userId);
    saveLock(userId, key); setEnabled(true); setLocked(false);
  });
  const disable = () => action(async () => {
    if (!userId) return;
    const key = readLock(userId);
    if (!key) throw new Error("Missing key");
    await verifyLock(key); saveLock(userId, null); setEnabled(false); setLocked(false);
  });
  const unlock = () => action(async () => {
    if (!userId) return;
    const key = readLock(userId);
    if (!key) throw new Error("Missing key");
    await verifyLock(key); setLocked(false);
  });
  const signOut = () => action(async () => {
    const { error: failure } = await supabase.auth.signOut();
    if (failure) throw failure;
    // Recovery removes only this device's privacy lock after the account session is ended.
    if (userId) saveLock(userId, null);
    window.location.assign("/");
  });
  const blocked = Boolean(userId && (owner !== userId || (enabled && locked)));
  return <Context.Provider value={{ enabled, supported, busy, error, enable, disable, lock: () => setLocked(true) }}>
    {blocked ? <div className="grid min-h-dvh place-items-center bg-background px-6"><div className="w-full max-w-sm space-y-5 text-center">
      <LockKeyhole className="mx-auto size-12 text-fv-deep" /><h1 className="text-2xl font-bold"><Localized>{"Vitalplus ist gesperrt"}</Localized></h1>
      <p className="text-sm text-muted-foreground"><Localized>{"Entsperre Vitalplus mit deiner Gerätebestätigung."}</Localized></p>
      {error && <p role="alert" className="text-sm text-destructive"><Localized>{error}</Localized></p>}
      <Button disabled={busy || owner !== userId} onClick={unlock} className="w-full bg-fresh text-ink hover:bg-fresh/90"><Localized>{busy ? "Bitte warten…" : "App entsperren"}</Localized></Button>
      <Button disabled={busy} variant="ghost" onClick={signOut}><Localized>{"Abmelden und App Lock zurücksetzen"}</Localized></Button>
    </div></div> : children}
  </Context.Provider>;
}
export function AppLockSettings() {
  useLanguage();
  const { enabled, supported, busy, error, enable, disable } = useAppLock();
  const { s } = useStore();
  const available = !!s.account && supported !== false;
  return <div className="space-y-3 text-sm">
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <label htmlFor="app-lock-toggle" className="font-semibold"><Localized>{"Face ID, Passcode, PIN, Muster"}</Localized></label>
      <Switch id="app-lock-toggle" checked={enabled} disabled={busy || !available || supported === null} onCheckedChange={(on) => (on ? enable() : disable())} />
    </div>
    {!s.account && <p className="text-muted-foreground"><Localized>{"Bitte anmelden."}</Localized></p>}
    {s.account && supported === false && !enabled && <p className="text-muted-foreground"><Localized>{"Auf diesem Gerät nicht verfügbar."}</Localized></p>}
    {error && <p role="alert" className="text-destructive"><Localized>{error}</Localized></p>}
  </div>;
}
