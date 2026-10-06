import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { createLock, readLock, saveLock, supportsAppLock, verifyLock } from "@/lib/app-lock";
import { Button } from "@/components/ui/button";

type LockContext = { enabled: boolean; supported: boolean | null; busy: boolean; error: string; enable: () => Promise<void>; disable: () => Promise<void>; lock: () => void };
const Context = createContext<LockContext | null>(null);
export function useAppLock() {
  const context = useContext(Context);
  if (!context) throw new Error("App Lock provider missing");
  return context;
}
export function AppLockProvider({ children }: { children: ReactNode }) {
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
      <LockKeyhole className="mx-auto size-12 text-fv-deep" /><h1 className="text-2xl font-bold">Vivo ist gesperrt</h1>
      <p className="text-sm text-muted-foreground">Entsperre Vivo mit deiner Gerätebestätigung.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy || owner !== userId} onClick={unlock} className="w-full bg-fresh text-ink hover:bg-fresh/90">{busy ? "Bitte warten…" : "App entsperren"}</Button>
      <Button disabled={busy} variant="ghost" onClick={signOut}>Abmelden und App Lock zurücksetzen</Button>
    </div></div> : children}
  </Context.Provider>;
}
export function AppLockSettings() {
  const { enabled, supported, busy, error, enable, disable, lock } = useAppLock();
  const { s } = useStore();
  return <div className="space-y-4 text-sm leading-6">
    <p>Apple: Face ID, Touch ID oder Gerätecode. Android: unterstützte Biometrie oder Gerätesperre.</p>
    <p className="text-muted-foreground">Dein Gerät entscheidet, welche Methode verfügbar ist. Gesichtserkennung und Muster sind nicht auf allen Android-Geräten unterstützt.</p>
    <p className="text-muted-foreground">App Lock verdeckt Vivo auf diesem Gerät beim erneuten Öffnen oder nach einem App-Wechsel. Es ersetzt keine Kontosicherheit und verschlüsselt keine gespeicherten Daten.</p>
    {!s.account ? <p>Melde dich an, um App Lock einzurichten.</p> : supported === null ? <p>Geräteunterstützung wird geprüft…</p> : !supported && !enabled ? <p role="status">Dieses Gerät oder dieser Browser unterstützt keine passende Gerätebestätigung. App Lock ist hier nicht verfügbar.</p> : <>
      <p className="font-semibold">{enabled ? "Auf diesem Gerät aktiviert" : "Auf diesem Gerät deaktiviert"}</p>
      <Button disabled={busy} onClick={enabled ? disable : enable} className="w-full bg-fresh text-ink hover:bg-fresh/90">{busy ? "Bitte warten…" : enabled ? "App Lock deaktivieren" : "App Lock aktivieren"}</Button>
      {enabled && <Button variant="outline" disabled={busy} className="w-full" onClick={lock}>Jetzt sperren</Button>}
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
}