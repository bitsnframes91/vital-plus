import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserRound, LockKeyhole, Settings, Shield, MessageSquare, FileText, Mail, ChevronRight, Download, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteAccount } from "@/lib/account.functions";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import profileDesk from "@/assets/profil-desk.jpg.asset.json";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil & Datenschutz — Vivo" },
      { name: "description", content: "Dein Vivo Profil und deine Datenschutz-Einstellungen verwalten." },
      { property: "og:title", content: "Profil & Datenschutz — Vivo" },
      { property: "og:description", content: "Du entscheidest, wer deine Gesundheitsdaten sieht." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function MenuRow({ category, title, sub, icon: Icon, onClick }: { category: string; title: string; sub: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">{category}</h2>
      <Button variant="outline" onClick={onClick} className="h-auto min-h-20 w-full justify-start gap-3 whitespace-normal rounded-2xl border-border bg-card px-3 py-3 text-left shadow-none">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-fresh-soft text-fv-deep"><Icon className="size-6!" strokeWidth={1.6} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold leading-5">{title}</span><span className="mt-0.5 block text-[12px] font-normal leading-5 text-muted-foreground">{sub}</span></span>
        <ChevronRight className="size-5! text-muted-foreground" strokeWidth={1.7} />
      </Button>
    </section>
  );
}

function Profile() {
  const navigate = useNavigate();
  const { s, set } = useStore();
  const [step, setStep] = useState<null | "manage" | "confirm" | "code">(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [panel, setPanel] = useState<null | "personal" | "settings" | "privacy" | "help" | "legal">(null);
  const panelTitles = { personal: "Gesundheitsprofil bearbeiten", settings: "App-Einstellungen", privacy: "Datenschutz & Daten", help: "Kundenservice kontaktieren", legal: "Rechtliches" };
  const exportData = () => {
    const { account: _account, ...health } = s;
    const url = URL.createObjectURL(new Blob([JSON.stringify(health, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "vivo-meine-daten.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const del = useServerFn(deleteAccount);
  const close = () => { setStep(null); setCode(""); setErr(""); };
  const sendCode = async () => {
    setBusy(true); setErr("");
    const { error } = await supabase.auth.reauthenticate();
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      const secs = m.match(/after (\d+) seconds?/)?.[1];
      if (secs) { setStep("code"); return setErr(`Ein Code wurde gerade erst gesendet. Bitte warte ${secs} Sekunden und versuche es dann erneut – oder nutze den letzten Code aus deinem Postfach.`); }
      if (error.status === 429 || m.includes("rate limit")) { setStep("code"); return setErr("Es wurden in kurzer Zeit zu viele E-Mails gesendet. Bitte versuche es in etwa einer Stunde erneut – oder nutze den letzten Code aus deinem Postfach."); }
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
      <header className="relative overflow-hidden bg-header px-5 pb-5 pt-6">
        <img src={profileDesk.url} alt="Ärztin am Schreibtisch" className="absolute inset-0 size-full object-cover object-center" />
        <div className="profile-image-overlay absolute inset-0" aria-hidden="true" />
        <div className="relative"><h1 className="text-[29px] font-bold leading-tight">Profil</h1><p className="mt-1 text-sm text-muted-foreground">Deine Daten gehören dir.</p></div>
      </header>
      <div className="space-y-4 px-4 pt-4">
        <MenuRow category="Persönlich" title="Gesundheitsprofil bearbeiten" sub="Name, Größe, Gewicht, Ziele und mehr" icon={UserRound} onClick={() => setPanel("personal")} />
        <MenuRow category="Konto" title="Konto & Sicherheit" sub="E-Mail-Adresse, Passwort, Konto löschen" icon={LockKeyhole} onClick={() => s.account ? setStep("manage") : navigate({ to: "/login", search: { mode: "login" } })} />
        <MenuRow category="Einstellungen" title="App-Einstellungen" sub="Benachrichtigungen, Sprache, Einheiten" icon={Settings} onClick={() => setPanel("settings")} />
        <MenuRow category="Datenschutz" title="Datenschutz & Daten" sub="Datenschutz, meine Daten herunterladen" icon={Shield} onClick={() => setPanel("privacy")} />
        <MenuRow category="Hilfe" title="Kundenservice kontaktieren" sub="FAQ, Hilfe und Support" icon={MessageSquare} onClick={() => setPanel("help")} />
        <MenuRow category="Rechtliches" title="Rechtliches" sub="Allgemeine Geschäftsbedingungen, Impressum" icon={FileText} onClick={() => setPanel("legal")} />
        <div className="border-t border-border pt-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-[13px] text-muted-foreground">
          <div className="eyebrow mb-1">Vivo Konto</div>
          <div className="mt-3 flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-fresh-soft text-fv-deep"><Mail className="size-6" strokeWidth={1.6} /></span>
          <div className="min-w-0 flex-1">
          {s.account ? (
            <>
              <p className="break-words text-foreground">Angemeldet als {s.account.email}.</p><p className="mt-1 text-xs">Deine Daten werden automatisch gesichert.</p>
              <Button variant="link" onClick={() => setStep("manage")} className="mt-1 h-auto px-0 py-1 text-[13px] font-semibold text-fv-deep">
                Konto verwalten →
              </Button>
            </>
          ) : (
            <>
              Lege ein Konto mit E-Mail und Passwort an, um deine Werte auf allen Geräten zu sichern.
              <Link to="/login" search={{ mode: "login" }} className="mt-3 block text-[13px] font-medium text-fv-deep">Anmelden oder Konto anlegen →</Link>
            </>
          )}
          </div></div>
        </div>
        </div>
        {s.account && (
          <Button variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              await navigate({ to: "/", replace: true });
            }}
            className="h-11 w-full rounded-full border-border bg-transparent text-sm text-destructive shadow-none"
          >
            Abmelden
          </Button>
        )}
      </div>
      <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>{panel ? panelTitles[panel] : ""}</DialogTitle></DialogHeader>
          {panel === "personal" && <div className="space-y-4">
            <label className="block text-sm">Name<input value={s.name} placeholder="Dein Name" onChange={(e) => set({ name: e.target.value })} className="mt-2 w-full rounded-lg border border-input bg-muted px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" /></label>
            <Button asChild className="w-full bg-fresh text-ink hover:bg-fresh/90"><Link to="/onboarding">Fragebogen bearbeiten <ChevronRight /></Link></Button>
          </div>}
          {panel === "settings" && <dl className="divide-y text-sm">
            <div className="flex justify-between py-3"><dt>Sprache</dt><dd className="text-muted-foreground">Deutsch</dd></div>
            <div className="flex justify-between py-3"><dt>Einheiten</dt><dd className="text-muted-foreground">kg · cm · kcal</dd></div>
            <div className="py-3"><dt>Benachrichtigungen</dt><dd className="mt-1 text-muted-foreground">Push-Benachrichtigungen sind noch nicht verfügbar.</dd></div>
          </dl>}
          {panel === "privacy" && <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Deine gespeicherten Werte, Mahlzeiten und Ziele sind deinem Konto zugeordnet. Du kannst sie herunterladen oder dein Konto unter „Konto & Sicherheit“ löschen.</p>
            <div className="flex items-center justify-between gap-3 border-y border-border py-3"><label htmlFor="profile-analytics">Anonyme Nutzungsstatistik<span className="mt-1 block text-xs text-muted-foreground">Hilft uns, die App zu verbessern</span></label><Switch id="profile-analytics" checked={s.consent.analytics} onCheckedChange={(analytics) => set({ consent: { ...s.consent, analytics } })} /></div>
            <Button onClick={exportData} className="w-full bg-fresh text-ink hover:bg-fresh/90"><Download /> Meine Daten herunterladen</Button>
          </div>}
          {panel === "help" && <div className="space-y-3 text-sm">
            <details className="border-b border-border pb-3"><summary className="cursor-pointer font-semibold">Wie ändere ich meine Werte und Ziele?</summary><p className="mt-2 text-muted-foreground">Öffne „Gesundheitsprofil bearbeiten“ und anschließend den Fragebogen.</p></details>
            <details className="border-b border-border pb-3"><summary className="cursor-pointer font-semibold">Wie lade ich einen neuen Befund hoch?</summary><p className="mt-2 text-muted-foreground">Unter Labor kannst du alte Werte löschen und einen PDF-Befund oder ein Foto hochladen.</p></details>
            <details className="border-b border-border pb-3"><summary className="cursor-pointer font-semibold">Ich habe mein Passwort vergessen.</summary><p className="mt-2 text-muted-foreground">Auf der Anmeldeseite kannst du über „Passwort vergessen?“ einen neuen Link anfordern.</p></details>
            <p className="text-muted-foreground">Ein direkter Vivo-Supportkontakt wurde noch nicht hinterlegt.</p>
          </div>}
          {panel === "legal" && <div className="space-y-3 text-sm text-muted-foreground"><p>Vivo ersetzt keine ärztliche Beratung. Bitte besprich medizinische Entscheidungen mit deiner Ärztin oder deinem Arzt.</p><p>Vivo ist unabhängig vom Fairvital-Shop. Käufe und Bestellungen werden ausschließlich auf fairvital.com abgewickelt.</p><p>Impressum, Datenschutzerklärung und Nutzungsbedingungen für Vivo wurden noch nicht hinterlegt.</p></div>}
        </DialogContent>
      </Dialog>
      <Dialog open={step !== null} onOpenChange={(o) => { if (!o && !busy) close(); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          {step === "manage" && (
            <>
              <DialogHeader><DialogTitle>Konto verwalten</DialogTitle></DialogHeader>
              <p className="text-sm text-ink/60">Angemeldet als {s.account?.email}</p>
              <Button variant="outline" asChild><Link to="/login" search={{ mode: "login" }}>Passwort zurücksetzen</Link></Button>
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
