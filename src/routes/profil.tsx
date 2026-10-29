import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserRound, LockKeyhole, Settings, Shield, MessageSquare, FileText, Mail, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteAccount, requestAccountDeletionCode } from "@/lib/account.functions";
import { AppShell } from "@/components/AppShell";
import { ProfileMascot } from "@/components/ProfileMascot";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profil")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Profil & Meine Daten — Vitalplus" },
      { name: "description", content: "Dein Vitalplus Profil, deine Daten und Einstellungen verwalten." },
      { property: "og:title", content: "Profil & Meine Daten — Vitalplus" },
      { property: "og:description", content: "Du entscheidest, wer deine Gesundheitsdaten sieht." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (q: Record<string, unknown>): { action?: "delete" } => q['action'] === "delete" ? { action: "delete" } : {},
  component: Profile,
});

function MenuRow({ category, title, sub, icon: Icon, onClick }: { category: string; title: string; sub: string; icon: LucideIcon; onClick: () => void }) {
  useLanguage();
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground"><Localized>{category}</Localized></h2>
      <Button variant="outline" onClick={onClick} className="h-auto min-h-20 w-full justify-start gap-3 whitespace-normal rounded-2xl border-border bg-card px-3 py-3 text-left shadow-none">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-fresh text-ink"><Icon className="size-6!" strokeWidth={1.6} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold leading-5"><Localized>{title}</Localized></span><span className="mt-0.5 block text-[12px] font-normal leading-5 text-muted-foreground"><Localized>{sub}</Localized></span></span>
        <ChevronRight className="size-5! text-muted-foreground" strokeWidth={1.7} />
      </Button>
    </section>
  );
}

function Profile() {
  useLanguage();
  const navigate = useNavigate();
  const { s, set } = useStore();
  const { action } = Route.useSearch();
  const pathname = useLocation({ select: location => location.pathname });
  const [step, setStep] = useState<null | "confirm" | "code">(action === "delete" ? "confirm" : null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (action === "delete" && pathname === "/profil") setStep("confirm"); }, [action, pathname]);
  const openMenu = (section: string) => navigate({ to: "/profil/$section", params: { section } });
  const del = useServerFn(deleteAccount);
  const requestCode = useServerFn(requestAccountDeletionCode);
  const [resume, setResume] = useState(false);
  const close = () => { setStep(null); setCode(""); setErr(""); if (action) void navigate({ to: "/profil", search: {}, replace: true }); };
  const sendCode = async () => {
    setBusy(true); setErr("");
    try {
      const res = await requestCode();
      setBusy(false);
      if (res.ok) return setStep("code");
      if (res.reason === "cooldown") { setStep("code"); return setErr("Ein Code wurde gerade erst gesendet. Bitte warte 60 Sekunden und versuche es dann erneut – oder nutze den letzten Code aus deinem Postfach."); }
      if (res.reason === "limited") { setStep("code"); return setErr("Es wurden in kurzer Zeit zu viele E-Mails gesendet. Bitte versuche es in etwa einer Stunde erneut – oder nutze den letzten Code aus deinem Postfach."); }
      return setErr("Code konnte nicht gesendet werden. Bitte später erneut versuchen.");
    } catch {
      setBusy(false);
      setErr("Code konnte nicht gesendet werden. Bitte später erneut versuchen.");
    }
  };
  const confirmDelete = async () => {
    setBusy(true); setErr("");
    try {
      const res = await del({ data: { code: resume ? null : code } });
      if (!res.ok) {
        setBusy(false);
        if (res.reason === "cleanup_failed") { setResume(true); return setErr("Das Löschen wurde bestätigt, aber noch nicht abgeschlossen. Bitte tippe erneut auf „Endgültig löschen“."); }
        if (res.reason === "locked") return setErr("Zu viele falsche Versuche. Bitte fordere einen neuen Code an.");
        return setErr("Der Code ist ungültig oder abgelaufen.");
      }
      localStorage.removeItem("fv-health-v1");
      await supabase.auth.signOut();
      location.href = "/";
    } catch {
      setErr("Löschen nicht möglich. Bitte versuche es erneut.");
      setBusy(false);
    }
  };
  if (pathname !== "/profil") return <Outlet />;
  return (
    <AppShell>
      <header className="profile-mascot-header relative overflow-hidden bg-header px-5 pb-5 pt-6">
        <div className="profile-mascot-copy relative"><h1 className="text-[29px] font-bold leading-tight"><Localized>{"Profil"}</Localized></h1><p className="mt-1 text-sm text-muted-foreground"><Localized>{"Deine Daten gehören dir."}</Localized></p></div>
        <ProfileMascot />
      </header>
      <div className="space-y-4 px-4 pt-4">
        <MenuRow category={translateText("Persönlich")} title={translateText("Gesundheitsprofil bearbeiten")} sub={translateText("Name, Größe, Gewicht, Ziele und mehr")} icon={UserRound} onClick={() => openMenu("personal")} />
        <MenuRow category={translateText("Konto")} title={translateText("Konto & Sicherheit")} sub={translateText("E-Mail-Adresse, Passwort, Konto löschen")} icon={LockKeyhole} onClick={() => s.account ? openMenu("security") : navigate({ to: "/login", search: { mode: "login" } })} />
        <MenuRow category={translateText("Einstellungen")} title={translateText("App-Einstellungen")} sub={translateText("Benachrichtigungen, Sprache, Design")} icon={Settings} onClick={() => openMenu("settings")} />
        <MenuRow category={translateText("Privatsphäre")} title={translateText("Meine Daten")} sub={translateText("Deine Daten herunterladen")} icon={Shield} onClick={() => openMenu("privacy")} />
        <MenuRow category={translateText("Hilfe")} title={translateText("Kundenservice kontaktieren")} sub={translateText("Telefon oder E-Mail")} icon={MessageSquare} onClick={() => openMenu("help")} />
        <MenuRow category={translateText("Rechtliches")} title={translateText("Rechtliches")} sub={translateText("Allgemeine Geschäftsbedingungen, Impressum")} icon={FileText} onClick={() => openMenu("legal")} />
        <div className="border-t border-border pt-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-[13px] text-muted-foreground">
          <div className="eyebrow mb-1"><Localized>{"Vitalplus Konto"}</Localized></div>
          <div className="mt-3 flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-fresh text-ink"><Mail className="size-6" strokeWidth={1.6} /></span>
          <div className="min-w-0 flex-1">
          {s.account ? (
            <>
              <p className="break-words text-foreground"><Localized>{"Angemeldet als "}</Localized><Localized>{s.account.email}</Localized><Localized>{"."}</Localized></p><p className="mt-1 text-xs"><Localized>{"Deine Daten werden automatisch gesichert."}</Localized></p>
              <Button variant="link" onClick={() => openMenu("account")} className="mt-1 h-auto px-0 py-1 text-[13px] font-semibold text-fv-deep"><Localized>{" Konto verwalten → "}</Localized></Button>
            </>
          ) : (
            <><Localized>{" Lege ein Konto mit E-Mail und Passwort an, um deine Werte auf allen Geräten zu sichern. "}</Localized><Link to="/login" search={{ mode: "login" }} className="mt-3 block text-[13px] font-medium text-fv-deep"><Localized>{"Anmelden oder Konto anlegen →"}</Localized></Link>
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
          ><Localized>{" Abmelden "}</Localized></Button>
        )}
      </div>
      <Dialog open={step !== null} onOpenChange={(o) => { if (!o && !busy) close(); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          {step === "confirm" && (
            <>
              <DialogHeader><DialogTitle><Localized>{"Willst du dein Profil wirklich löschen?"}</Localized></DialogTitle></DialogHeader>
              <p className="text-sm text-ink/60"><Localized>{"Alle Werte, Mahlzeiten und dein Plan werden dauerhaft gelöscht. Wir senden dir dazu einen Bestätigungscode an "}</Localized><Localized>{s.account?.email}</Localized><Localized>{"."}</Localized></p>
              {err && <p className="text-sm text-destructive"><Localized>{err}</Localized></p>}
              <div className="flex gap-2">
                <Button onClick={close} className="flex-1 rounded-full py-2.5 text-sm font-medium ring-1 ring-border"><Localized>{"Nein"}</Localized></Button>
                <Button disabled={busy} onClick={sendCode} className="flex-1 rounded-full bg-destructive py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-50">
                  <Localized>{busy ? "Senden…" : "Ja"}</Localized>
                </Button>
              </div>
            </>
          )}
          {step === "code" && (
            <>
              <DialogHeader><DialogTitle><Localized>{"Code eingeben"}</Localized></DialogTitle></DialogHeader>
              <p className="text-sm text-ink/60"><Localized>{"Wir haben einen Code an "}</Localized><Localized>{s.account?.email}</Localized><Localized>{" gesendet."}</Localized></p>
              <input
                inputMode="numeric" maxLength={10} value={code} autoFocus
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl bg-muted px-3 py-3 text-center text-lg tracking-[0.4em] outline-none"
                aria-label={translateText("Bestätigungscode")}
              />
              {err && <p className="text-sm text-destructive"><Localized>{err}</Localized></p>}
              <Button disabled={busy || code.length < 6} onClick={confirmDelete} className="w-full rounded-full bg-destructive py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-50">
                <Localized>{busy ? "Wird gelöscht…" : "Konto endgültig löschen"}</Localized>
              </Button>
              <Button disabled={busy} onClick={sendCode} className="text-[13px] font-medium"><Localized>{"Code erneut senden"}</Localized></Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
