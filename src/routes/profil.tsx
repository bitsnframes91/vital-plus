import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteAccount } from "@/lib/account.functions";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import profileDesk from "@/assets/profil-desk.jpg.asset.json";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil & Datenschutz — Vivo" },
      { name: "description", content: "Profil, Freigaben für Behandler und Datenschutz-Einstellungen verwalten." },
      { property: "og:title", content: "Profil & Datenschutz — Vivo" },
      { property: "og:description", content: "Du entscheidest, wer deine Gesundheitsdaten sieht." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Toggle({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      <div className="flex-1">
        <div className="text-[15px] font-medium">{label}</div>
        <div className="text-[12px] text-ink/45">{sub}</div>
      </div>
      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${on ? "bg-fv" : "bg-ink/15"}`}>
        <span className={`size-5 rounded-full bg-card transition ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function Profile() {
  const { s, set } = useStore();
  const [step, setStep] = useState<null | "manage" | "confirm" | "code">(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const del = useServerFn(deleteAccount);
  const close = () => { setStep(null); setCode(""); setErr(""); };
  const sendCode = async () => {
    setBusy(true); setErr("");
    const { error } = await supabase.auth.reauthenticate();
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      const secs = m.match(/after (\d+) seconds?/)?.[1];
      if (secs) return setErr(`Ein Code wurde gerade erst gesendet. Bitte warte ${secs} Sekunden und versuche es dann erneut – oder nutze den letzten Code aus deinem Postfach.`);
      if (error.status === 429 || m.includes("rate limit")) return setErr("Es wurden in kurzer Zeit zu viele E-Mails gesendet. Bitte versuche es in etwa einer Stunde erneut – oder nutze den letzten Code aus deinem Postfach.");
      return setErr("Code konnte nicht gesendet werden. Bitte später erneut versuchen.");
    }
    setStep("code");
  };
  const confirmDelete = async () => {
    setBusy(true); setErr("");
    try {
      await del({ data: { code } });
      localStorage.removeItem("fv-health-v1");
      await supabase.auth.signOut();
      location.href = "/";
    } catch {
      setErr("Der Code ist ungültig oder abgelaufen.");
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <PageHeader
        eyebrow="Einstellungen"
        title={s.name}
        sub="Deine Daten gehören dir."
        image={profileDesk.url}
        imageAlt="Ärztin am Schreibtisch mit Laptop, Klemmbrett und Pflanzen"
        imageOverlay="profile-image-overlay"
        subClass="max-w-[20ch]"
      />
      <div className="space-y-4 px-4 pt-4">
        <div className="card-surface p-5">
          <div className="eyebrow">Name</div>
          <input value={s.name} onChange={(e) => set({ name: e.target.value })} className="mt-2 w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none" />
          <Link to="/onboarding" className="mt-3 inline-block text-[13px] font-medium text-fv-deep">Gesundheitsprofil bearbeiten →</Link>
        </div>
        <div className="card-surface divide-y px-5">
          <a
            href={(() => {
              const lines = s.labs
                .filter((m) => m.history.length)
                .map((m) => {
                  const p = m.history[m.history.length - 1]!;
                  const st = p.value < m.target[0] ? "niedrig" : p.value > m.target[1] ? "hoch" : "im Zielbereich";
                  return `- ${m.name}: ${p.value} ${m.unit} (Ziel ${m.target[0]}–${m.target[1]}, ${st}) – gemessen am ${p.date}`;
                });
              const body = `Guten Tag,\n\nhier sind meine aktuellen Blutwerte:\n\n${lines.join("\n")}\n\nViele Grüße\n${s.name}`;
              return `mailto:?subject=${encodeURIComponent(`Meine Blutwerte – ${s.name}`)}&body=${encodeURIComponent(body)}`;
            })()}
            className="flex w-full items-center gap-3 py-3 text-left"
          >
            <div className="flex-1">
              <div className="text-[15px] font-medium">Behandler-Freigabe</div>
              <div className="text-[12px] text-ink/45">Werte per E-Mail an Ärztin/Therapeut senden</div>
            </div>
            <span className="text-fv-deep">→</span>
          </a>
          <Toggle on={s.consent.analytics} onClick={() => set({ consent: { ...s.consent, analytics: !s.consent.analytics } })} label="Anonyme Nutzungsstatistik" sub="Hilft uns, die App zu verbessern" />
        </div>
        <div className="card-surface p-5 text-[13px] text-ink/55">
          <div className="eyebrow mb-1">Vivo Konto</div>
          {s.account ? (
            <>
              Angemeldet als <span className="font-medium text-ink">{s.account.email}</span>. Deine Daten werden automatisch gesichert.
              <button onClick={() => setStep("manage")} className="mt-3 block text-[13px] font-medium text-fv-deep">
                Konto verwalten →
              </button>
            </>
          ) : (
            <>
              Lege ein Konto mit E-Mail, Google oder Apple an, um deine Werte auf allen Geräten zu sichern.
              <Link to="/login" search={{ mode: "login" }} className="mt-3 block text-[13px] font-medium text-fv-deep">Anmelden oder Konto anlegen →</Link>
            </>
          )}
        </div>
        {s.account && (
          <button onClick={() => void supabase.auth.signOut()} className="w-full rounded-full py-2.5 text-sm text-destructive ring-1 ring-border">
            Abmelden
          </button>
        )}
      </div>
      <Dialog open={step !== null} onOpenChange={(o) => { if (!o && !busy) close(); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          {step === "manage" && (
            <>
              <DialogHeader><DialogTitle>Konto verwalten</DialogTitle></DialogHeader>
              <p className="text-sm text-ink/60">Angemeldet als {s.account?.email}</p>
              <button onClick={() => setStep("confirm")} className="w-full rounded-full py-2.5 text-sm font-medium text-destructive ring-1 ring-destructive/40">
                Profil löschen
              </button>
            </>
          )}
          {step === "confirm" && (
            <>
              <DialogHeader><DialogTitle>Willst du dein Profil wirklich löschen?</DialogTitle></DialogHeader>
              <p className="text-sm text-ink/60">Alle Werte, Mahlzeiten und dein Plan werden dauerhaft gelöscht. Wir senden dir dazu einen Bestätigungscode an {s.account?.email}.</p>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <div className="flex gap-2">
                <button onClick={close} className="flex-1 rounded-full py-2.5 text-sm font-medium ring-1 ring-border">Nein</button>
                <button disabled={busy} onClick={sendCode} className="flex-1 rounded-full bg-destructive py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-50">
                  {busy ? "Senden…" : "Ja"}
                </button>
              </div>
            </>
          )}
          {step === "code" && (
            <>
              <DialogHeader><DialogTitle>Code eingeben</DialogTitle></DialogHeader>
              <p className="text-sm text-ink/60">Wir haben einen Code an {s.account?.email} gesendet.</p>
              <input
                inputMode="numeric" maxLength={10} value={code} autoFocus
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl bg-muted px-3 py-3 text-center text-lg tracking-[0.4em] outline-none"
                aria-label="Bestätigungscode"
              />
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button disabled={busy || code.length < 6} onClick={confirmDelete} className="w-full rounded-full bg-destructive py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-50">
                {busy ? "Wird gelöscht…" : "Konto endgültig löschen"}
              </button>
              <button disabled={busy} onClick={sendCode} className="text-[13px] font-medium text-fv-deep">Code erneut senden</button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
