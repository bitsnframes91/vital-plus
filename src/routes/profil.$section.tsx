import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronRight, UserRound, CalendarDays, UsersRound, Ruler, Weight, Heart, Activity, Mail, KeyRound, Shield, Trash2, Bell, Globe, Moon, Clock, FileText, Download, MessageSquare, CircleHelp, LayoutGrid, Phone, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { activityLevels } from "@/lib/nutrition-targets";
import { PasswordResetForm } from "@/components/PasswordResetForm";
import { AppLockSettings } from "@/components/AppLock";
import { AppSettingsControls } from "@/components/AppSettings";

const titles: Record<string, string> = { personal: "Gesundheitsprofil bearbeiten", security: "Konto & Sicherheit", settings: "App-Einstellungen", privacy: "Datenschutz & Daten", help: "Kundenservice kontaktieren", legal: "Rechtliches", account: "Konto verwalten" };

export const Route = createFileRoute("/profil/$section")({
  head: ({ params }) => {
    const title = `${titles[params.section] ?? "Profil"} — Vivo`;
    const description = `Dein Vivo Profil: ${titles[params.section] ?? "Einstellungen"} verwalten.`;
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: ProfileSubmenu,
});

function Row({ title, sub, icon: Icon, onClick, danger = false, green = false }: { title: string; sub?: string; icon: LucideIcon; onClick: () => void; danger?: boolean; green?: boolean }) {
  return <Button variant="ghost" onClick={onClick} className={`h-auto min-h-16 w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left ${green ? "min-h-20 rounded-2xl bg-card" : "rounded-lg bg-card"} ${danger ? "text-destructive" : "text-foreground"}`}>
    <span className={`grid shrink-0 place-items-center rounded-full ${green ? "size-12 bg-fresh-soft text-fv-deep" : "size-9"}`}><Icon className={`${green ? "size-6!" : "size-5!"}`} strokeWidth={1.6} /></span>
    <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-5">{title}</span>{sub && <span className={`block break-words text-[12px] font-normal leading-4 ${danger ? "text-destructive" : "text-muted-foreground"}`}>{sub}</span>}</span><ChevronRight className="size-4! shrink-0 text-muted-foreground" />
  </Button>;
}

function ProfileSubmenu() {
  const { section } = Route.useParams();
  const navigate = Route.useNavigate();
  const { s, set } = useStore();
  const [detail, setDetail] = useState<{ title: string; text?: string; name?: boolean; data?: boolean; faq?: boolean; password?: boolean; lock?: boolean; target?: boolean } | null>(null);
  const [name, setName] = useState(s.name);
  const [targetWeight, setTargetWeight] = useState("");
  const notice = (title: string, text: string) => setDetail({ title, text });
  const edit = (step: number) => navigate({ to: "/onboarding", search: { step, from: "profile" } });
  const deletion = () => navigate({ to: "/profil", search: { action: "delete" } });
  const download = () => {
    const { account: _account, ...health } = s;
    const url = URL.createObjectURL(new Blob([JSON.stringify(health, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "vivo-meine-daten.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const email = () => notice("E-Mail-Adresse", s.account ? "Deine E-Mail-Adresse wird für die Anmeldung und Kontosicherheit verwendet. Eine Änderung in der App ist noch nicht verfügbar." : "Melde dich an, um dein Konto zu verwalten.");
  const password = () => setDetail({ title: "Passwort ändern", password: true });
  const appLock = () => setDetail({ title: "App Lock", lock: true });
  const privacy = () => notice("Datenschutzerklärung", "Die offizielle Datenschutzerklärung für Vivo wurde noch nicht hinterlegt.");
  const value = (n: number | null | undefined, unit: string) => n == null ? "Nicht angegeben" : `${n} ${unit}`;
  return <AppShell>
    <header className="flex min-h-20 items-center gap-2 px-3 py-5">
      <Button variant="ghost" size="icon" asChild className="shrink-0"><Link to="/profil" aria-label="Zurück zum Profil"><ArrowLeft className="size-5!" /></Link></Button>
      <h1 className="flex-1 text-center text-[17px] font-bold leading-6">{titles[section] ?? "Profil"}</h1><span className="w-9" aria-hidden="true" />
    </header>
    <div className="space-y-4 px-4 pb-6">
      {section === "personal" && <div className="space-y-px overflow-hidden rounded-lg">
        <Row title="Name" sub={s.name || "Nicht angegeben"} icon={UserRound} onClick={() => { setName(s.name); setDetail({ title: "Name", name: true }); }} />
        <Row title="Alter" sub={value(s.body.age, "Jahre")} icon={CalendarDays} onClick={() => edit(4)} />
        <Row title="Geschlecht" sub={({ female: "Weiblich", male: "Männlich", diverse: "Diverse", unspecified: "Keine Angabe" })[s.body.sex ?? "unspecified"]} icon={UsersRound} onClick={() => edit(4)} />
        <Row title="Größe" sub={value(s.body.heightCm, "cm")} icon={Ruler} onClick={() => edit(3)} />
        <Row title="Gewicht" sub={value(s.body.weightKg, "kg")} icon={Weight} onClick={() => edit(3)} />
        <Row title="Zielgewicht" sub={s.body.targetWeightKg ? `${s.body.targetWeightKg} kg` : "Nicht angegeben"} icon={Weight} onClick={() => { setTargetWeight(s.body.targetWeightKg?.toString() ?? ""); setDetail({ title: "Zielgewicht", target: true }); }} />
        <Row title="Aktivitätslevel" sub={activityLevels.find(a => a.value === s.body.activity)?.label ?? "Nicht angegeben"} icon={Activity} onClick={() => edit(4)} />
        <Row title="Gesundheitsziele" sub={s.goals.join(", ") || "Nicht angegeben"} icon={Heart} onClick={() => edit(1)} />
      </div>}
      {(section === "security" || section === "account") && <>
        {section === "account" && <h2 className="eyebrow">Vivo Konto</h2>}
        <div className="space-y-px overflow-hidden rounded-lg"><Row title="E-Mail-Adresse" sub={s.account?.email ?? "Nicht angemeldet"} icon={Mail} onClick={email} /><Row title="Passwort ändern" sub="Reset-Link per E-Mail" icon={KeyRound} onClick={password} /><Row title="App Lock" sub="Gerätecode oder Biometrie" icon={Shield} onClick={appLock} />
        {section === "account" && <Row title="Verbundene Apps" sub="Apple Health, Health Connect" icon={LayoutGrid} onClick={() => notice("Verbundene Apps", "Apple Health und Google Health Connect sind noch nicht verbunden. In dieser Web-App ist kein direkter Zugriff verfügbar.")} />}</div>
        <Row title="Konto löschen" icon={Trash2} danger onClick={deletion} />
      </>}
      {section === "settings" && <AppSettingsControls />}
      {section === "privacy" && <><div className="space-y-2">
        <Row title="Datenschutzerklärung" icon={FileText} onClick={privacy} />
        <Row title="Meine Daten herunterladen" sub="Eine Kopie deiner Daten herunterladen" icon={Download} green onClick={download} />
      </div><Row title="Konto löschen" sub="Alle Daten und dein Konto dauerhaft löschen" icon={Trash2} danger onClick={deletion} /></>}
      {section === "help" && <><p className="text-sm leading-5 text-muted-foreground">Wir sind für dich da. Wähle eine Option, um uns zu kontaktieren.</p><div className="space-y-2">
        <Row title="Anrufen" sub="+49 2234 2190482" icon={Phone} green onClick={() => { window.location.href = "tel:+4922342190482"; }} />
        <Row title="E-Mail" sub="support@vivohealth.com" icon={Mail} green onClick={() => { window.location.href = "mailto:support@vivohealth.com"; }} />
        <Row title="FAQ" sub="Häufige Fragen und Antworten" icon={CircleHelp} green onClick={() => setDetail({ title: "FAQ", faq: true })} />
        <Row title="Feedback geben" sub="Hilf uns, die App zu verbessern" icon={MessageSquare} green onClick={() => navigate({ to: "/profil/feedback" })} />
      </div></>}
      {section === "legal" && <div className="space-y-2">
        <Row title="Allgemeine Geschäftsbedingungen (AGB)" icon={FileText} onClick={() => notice("Allgemeine Geschäftsbedingungen", "Die Nutzungsbedingungen für Vivo wurden noch nicht hinterlegt. Käufe erfolgen ausschließlich im Fairvital-Shop.")} />
        <Row title="Datenschutzerklärung" icon={Shield} onClick={privacy} />
        <Row title="Impressum" icon={FileText} onClick={() => notice("Impressum", "Das offizielle Impressum für Vivo wurde noch nicht hinterlegt.")} />
        <Row title="Lizenzen" sub="Open Source Lizenzen" icon={FileText} onClick={() => notice("Lizenzen", "Vivo verwendet Open-Source-Software, darunter React, TanStack, Radix UI und Lucide. Eine vollständige Lizenzübersicht wurde noch nicht hinterlegt.")} />
      </div>}
      {!titles[section] && <p className="text-sm text-muted-foreground">Dieser Profilbereich ist nicht verfügbar.</p>}
    </div>
    <Dialog open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>{detail?.title}</DialogTitle></DialogHeader>
      {detail?.text && <p className="text-sm leading-6 text-muted-foreground">{detail.text}</p>}
      {detail?.password && <PasswordResetForm initialEmail={s.account?.email ?? ""} />}
      {detail?.lock && <AppLockSettings />}
      {detail?.name && <form className="space-y-4" onSubmit={e => { e.preventDefault(); set({ name: name.trim() }); setDetail(null); }}><label className="block text-sm">Name<input className="mt-2 w-full rounded-lg border border-input bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-ring" value={name} onChange={e => setName(e.target.value)} /></label><Button type="submit" className="w-full bg-fresh text-ink hover:bg-fresh/90">Speichern</Button></form>}
      {detail?.target && <form className="space-y-4" onSubmit={e => { e.preventDefault(); const n = Number(targetWeight.replace(",", ".")); if (targetWeight.trim() && !isNaN(n) && n >= 30 && n <= 300) { set({ body: { ...s.body, targetWeightKg: Math.round(n * 10) / 10 } }); setDetail(null); } }}><label className="block text-sm">Zielgewicht in kg<input type="number" min={30} max={300} step="0.1" inputMode="decimal" className="mt-2 w-full rounded-lg border border-input bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-ring" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} placeholder="z. B. 78" /></label><Button type="submit" className="w-full bg-fresh text-ink hover:bg-fresh/90">Speichern</Button>{s.body.targetWeightKg != null && <Button type="button" variant="ghost" className="w-full" onClick={() => { set({ body: { ...s.body, targetWeightKg: null } }); setDetail(null); }}>Zielgewicht entfernen</Button>}</form>}

      {detail?.data && <div className="space-y-4"><p className="text-sm text-muted-foreground">Deine Werte, Mahlzeiten und Ziele sind deinem Konto zugeordnet.</p><div className="flex items-center justify-between gap-3"><label htmlFor="profile-analytics" className="text-sm">Anonyme Nutzungsstatistik</label><Switch id="profile-analytics" checked={s.consent.analytics} onCheckedChange={analytics => set({ consent: { ...s.consent, analytics } })} /></div><Button onClick={download} className="w-full bg-fresh text-ink hover:bg-fresh/90"><Download /> Daten herunterladen</Button></div>}
      {detail?.faq && <div className="space-y-4 text-sm"><details><summary className="cursor-pointer font-semibold">Wie ändere ich Werte und Ziele?</summary><p className="mt-2 text-muted-foreground">Unter Profil → Gesundheitsprofil bearbeiten öffnest du die passende Frage im Fragebogen.</p></details><details><summary className="cursor-pointer font-semibold">Wie lade ich einen neuen Befund hoch?</summary><p className="mt-2 text-muted-foreground">Unter Labor kannst du alte Werte löschen und einen PDF-Befund oder ein Foto hochladen.</p></details><details><summary className="cursor-pointer font-semibold">Ich habe mein Passwort vergessen.</summary><p className="mt-2 text-muted-foreground">Auf der Anmeldeseite kannst du über „Passwort vergessen?“ einen neuen Link anfordern.</p></details></div>}
    </DialogContent></Dialog>
  </AppShell>;
}
