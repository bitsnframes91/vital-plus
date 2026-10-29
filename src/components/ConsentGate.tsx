import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { Localized, useLanguage } from "@/components/Localized";
import { LegalLinks } from "@/components/LegalLinks";
import { Button } from "@/components/ui/button";
import { HEALTH_CONSENT_VERSION, canRecordLocalConsent, needsConsentPrompt, type ConsentStatus } from "@/lib/consent-policy";

export const CONSENT_TEXT = "Ich willige ausdrücklich ein, dass Vitalplus meine Gesundheitsdaten (z. B. Körperdaten, Mahlzeiten, Laborwerte und – falls freigegeben – Apple-Health-Werte) zur Darstellung und Auswertung in der App verarbeitet (Art. 9 Abs. 2 lit. a DSGVO). Apple-Health-Werte bleiben auf meinem Gerät. Ich kann die Einwilligung jederzeit widerrufen. Vitalplus ersetzt keine ärztliche Beratung.";

// Account screens (profile, data export, deletion) never depend on health-data consent.
const exempt = (p: string) => p === "/profil" || p.startsWith("/profil/");

let cached: { userId: string; status: ConsentStatus } | null = null;
export function setCachedConsent(userId: string, status: ConsentStatus) { cached = { userId, status }; }

/** Shows health screens only once the signed-in user has an active consent record for the current policy. */
export function ConsentGate({ pathname, children }: { pathname: string; children: ReactNode }) {
  useLanguage();
  const { s, set } = useStore();
  const userId = s.account?.userId ?? null;
  const [status, setStatus] = useState<ConsentStatus | null>(cached && cached.userId === userId ? cached.status : null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void (async () => {
      const { data, error } = await supabase.rpc("health_consent_status", { _version: HEALTH_CONSENT_VERSION });
      if (!alive || error) return;
      let next = data as ConsentStatus;
      // Consent ticked in the questionnaire before the account existed is recorded once identity is verified.
      if (needsConsentPrompt(next) && canRecordLocalConsent(s.consent)) {
        const { error: recErr } = await supabase.rpc("give_health_consent", { _version: HEALTH_CONSENT_VERSION });
        if (!recErr) next = "active";
      }
      if (!alive) return;
      setCachedConsent(userId, next);
      setStatus(next);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (exempt(pathname) || !userId || status === null || status === "active") return <>{children}</>;

  const agree = async () => {
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("give_health_consent", { _version: HEALTH_CONSENT_VERSION });
    setBusy(false);
    if (error) return setErr("Speichern nicht möglich. Bitte versuche es erneut.");
    set({ consent: { ...s.consent, healthDataAt: new Date().toISOString(), healthVersion: HEALTH_CONSENT_VERSION } });
    setCachedConsent(userId, "active");
    setStatus("active");
  };

  return (
    <div className="mx-4 mt-6 space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border" role="region" aria-labelledby="consent-title">
      <h1 id="consent-title" className="text-xl font-semibold"><Localized>{status === "withdrawn" ? "Einwilligung widerrufen" : "Deine Einwilligung ist nötig"}</Localized></h1>
      <p className="text-sm text-muted-foreground"><Localized>{status === "withdrawn" ? "Du hast die Verarbeitung deiner Gesundheitsdaten widerrufen. Diese Bereiche sind pausiert, bis du erneut einwilligst." : "Um Gesundheitsfunktionen zu nutzen, brauchen wir deine ausdrückliche Einwilligung zur aktuellen Datenschutzerklärung."}</Localized></p>
      <label className="flex items-start gap-3 rounded-2xl bg-background p-4 text-sm ring-1 ring-border">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--fv-deep)]" />
        <span className="text-foreground/80"><Localized>{CONSENT_TEXT}</Localized></span>
      </label>
      <LegalLinks prefix="Mehr dazu in unseren" />
      {err && <p role="alert" className="text-sm text-destructive"><Localized>{err}</Localized></p>}
      <Button disabled={!ok || busy} onClick={agree} className="w-full bg-fresh text-ink hover:bg-fresh/90"><Localized>{"Einwilligen"}</Localized></Button>
      <Link to="/profil" className="block text-center text-[13px] font-semibold text-foreground/70 underline underline-offset-4"><Localized>{"Zum Profil (Konto, Daten, Löschen)"}</Localized></Link>
    </div>
  );
}

/** Withdraws health-data consent without deleting the account; the user chooses whether stored health data is kept or erased. */
export function WithdrawConsent() {
  useLanguage();
  const { s } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!s.account) return null;
  const withdraw = async (deleteData: boolean) => {
    if (!window.confirm(deleteData ? "Einwilligung widerrufen und gespeicherte Gesundheitsdaten löschen?" : "Einwilligung widerrufen? Deine gespeicherten Daten bleiben erhalten, werden aber nicht mehr verarbeitet.")) return;
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("withdraw_health_consent", { _delete_data: deleteData });
    setBusy(false);
    if (error) return setMsg("Widerruf nicht möglich. Bitte versuche es erneut.");
    setCachedConsent(s.account!.userId, "withdrawn");
    if (deleteData) localStorage.removeItem("fv-health-v1");
    location.href = "/profil";
  };
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-sm font-semibold"><Localized>{"Einwilligung zu Gesundheitsdaten"}</Localized></p>
      <p className="text-xs text-muted-foreground"><Localized>{"Ein Widerruf löscht dein Konto nicht. KI-Auswertungen und das Speichern von Gesundheitsdaten werden gestoppt."}</Localized></p>
      <Button variant="outline" disabled={busy} onClick={() => withdraw(false)} className="w-full"><Localized>{"Widerrufen, Daten behalten"}</Localized></Button>
      <Button variant="outline" disabled={busy} onClick={() => withdraw(true)} className="w-full text-destructive"><Localized>{"Widerrufen und Gesundheitsdaten löschen"}</Localized></Button>
      {msg && <p role="alert" className="text-sm text-destructive"><Localized>{msg}</Localized></p>}
    </div>
  );
}
