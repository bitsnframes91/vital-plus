import { GENERIC_LOGIN_ERROR } from "@/lib/consent-policy";
import { PasswordResetForm } from "@/components/PasswordResetForm";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { MagicCodeEntry } from "@/components/MagicCodeEntry";
import { LegalLinks } from "@/components/LegalLinks";
import { readQuestionnaire, clearQuestionnaire } from "@/lib/questionnaire-draft";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: true },
  validateSearch: (search: Record<string, unknown>) => ({ mode: search["mode"] === "register" ? ("register" as const) : search["mode"] === "reset" ? ("reset" as const) : ("login" as const) }),
  head: () => ({
    meta: [
      { title: "Anmelden — fairvitalgo" },
      { name: "description", content: "Mit E-Mail und Passwort bei fairvitalgo anmelden oder ein Konto anlegen." },
      { property: "og:title", content: "Anmelden — fairvitalgo" },
      { property: "og:description", content: "Dein fairvitalgo-Konto – deine Werte auf allen Geräten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const field = "w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function Login() {
  useLanguage();
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">(initialMode === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [magic, setMagic] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const sendMagicLink = async () => {
    if (!email) return setMsg("Bitte gib zuerst deine E-Mail-Adresse ein.");
    const last = Number(localStorage.getItem("vitalplus-magic-at") || 0);
    if (Date.now() - last < 60_000) return setMsg("Bitte warte eine Minute, bevor du einen neuen Login-Code anforderst.");
    localStorage.setItem("vitalplus-magic-at", String(Date.now()));
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + "/heute" } });
    setBusy(false);
    if (error) return setMsg("Senden nicht möglich – bitte in einer Minute erneut versuchen.");
    setMagicSent(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "login") {
      const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        if (error.code === "email_not_confirmed") return setMsg("Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach.");
        return setMsg(GENERIC_LOGIN_ERROR);
      }
      if (!signed.user?.email_confirmed_at) { await supabase.auth.signOut(); return setMsg("Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach."); }
      navigate({ to: "/heute" });
    } else {
      const questionnaire = readQuestionnaire();
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/heute", ...(questionnaire ? { data: { questionnaire } } : {}) } });
      setBusy(false);
      // An already-registered email gets the same "check your inbox" screen, so signup cannot be used to probe accounts.
      if (error && !error.message.includes("registered")) return setMsg("Konto konnte nicht angelegt werden (Passwort mind. 8 Zeichen).");
      clearQuestionnaire();
      if (error || !data.session) { setSent(true); return; }
      navigate({ to: "/heute" });
    }
  };

  if (initialMode === "reset") return (
    <AppShell>
      <PageHeader eyebrow={translateText("fairvitalgo Konto")} title={translateText("Passwort vergessen?")} sub={translateText("Deine Werte sicher gespeichert – auf allen Geräten.")} />
      <div className="card-surface mx-4 mt-4 space-y-4 p-5">
        <PasswordResetForm />
        <Link to="/" search={{ mode: "login" }} className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4"><Localized>{"Zurück zur Anmeldung"}</Localized></Link>
      </div>
    </AppShell>
  );

  if (sent) return (
    <AppShell>
      <PageHeader eyebrow={translateText("fairvitalgo Konto")} title={translateText("Bestätige deine E-Mail")} sub={translateText("Fast geschafft!")} />
      <div className="card-surface mx-4 mt-4 space-y-2 p-5 text-sm">
        <p><Localized>{"Wir haben dir einen Bestätigungscode geschickt an:"}</Localized> <b>{email}</b></p>
        <p className="text-ink/70"><Localized>{"Gib den Code hier ein. Danach ist dein Konto aktiv und du gelangst direkt zu Heute."}</Localized></p>
        <p className="text-ink/70"><Localized>{"Bitte prüfe auch deinen Spam-Ordner."}</Localized></p>
        <MagicCodeEntry email={email} type="signup" />
        {/* Shown to everyone so it never reveals whether the email was already registered. */}
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[13px] text-ink/70"><Localized>{"Kein Code erhalten oder schon ein Konto?"}</Localized></p>
          <Link to="/" search={{ mode: "login" }} className="block w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4"><Localized>{"Zur Anmeldung"}</Localized></Link>
          <Link to="/login" search={{ mode: "reset" }} className="block w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4"><Localized>{"Passwort vergessen?"}</Localized></Link>
        </div>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <PageHeader eyebrow={translateText("fairvitalgo Konto")} title={translateText(mode === "login" ? "Anmelden" : "Konto anlegen")} sub={translateText("Deine Werte sicher gespeichert – auf allen Geräten.")} />
      <div className="card-surface mx-4 mt-4 space-y-3 p-5">
        {mode === "login" && magicSent ? (
          <div className="space-y-2 text-sm">
            <p><Localized>{"Wir haben dir einen Login-Code geschickt an:"}</Localized> <b>{email}</b></p>
            <p className="text-ink/70"><Localized>{"Bitte prüfe auch deinen Spam-Ordner."}</Localized></p>
            <MagicCodeEntry email={email} />
            <button type="button" onClick={() => { setMagicSent(false); setMsg(null); }} className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4"><Localized>{"Zurück zur Anmeldung"}</Localized></button>
          </div>
        ) : (
        <form onSubmit={mode === "login" && magic ? (e) => { e.preventDefault(); void sendMagicLink(); } : submit} className="space-y-3">

          <input required type="email" autoComplete="email" placeholder={translateText("E-Mail")} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          {!(mode === "login" && magic) && (
            <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : 1} placeholder={translateText("Passwort")} value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          )}
          {msg && <p className="rounded-xl bg-warn/15 px-3 py-2 text-[13px]"><Localized>{msg}</Localized></p>}
          <button disabled={busy} className="w-full rounded-full bg-fresh py-2.5 text-sm font-medium text-ink disabled:opacity-50">
            <Localized>{busy ? "Bitte warten…" : mode === "login" ? (magic ? "Login-Code senden" : "Anmelden") : "Konto anlegen"}</Localized>
          </button>
          {mode === "login" && (
            <button type="button" onClick={() => { setMagic(!magic); setMsg(null); }} className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4">
              <Localized>{magic ? "Stattdessen mit Passwort anmelden" : "Ohne Passwort anmelden (Login-Code per E-Mail)"}</Localized>
            </button>
          )}
          {mode === "register" && <LegalLinks />}
        </form>
        )}
        {mode === "login" && !magic && !magicSent && (
          <button
            type="button"
            onClick={() => navigate({ to: "/login", search: { mode: "reset" } })}
            className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4"
          ><Localized>{"Passwort vergessen?"}</Localized></button>
        )}
      </div>
    </AppShell>
  );
}
