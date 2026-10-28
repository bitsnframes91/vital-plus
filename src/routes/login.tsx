import { accountExists, requestPasswordReset } from "@/lib/account.functions";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { readQuestionnaire, clearQuestionnaire } from "@/lib/questionnaire-draft";
import { publicAppUrl } from "@/lib/native-app";
import { SwipeAction } from "@/components/SwipeAction";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: true },
  validateSearch: (search: Record<string, unknown>) => ({ mode: search["mode"] === "register" ? ("register" as const) : ("login" as const) }),
  head: () => ({
    meta: [
      { title: "Anmelden — Vital Plus" },
      { name: "description", content: "Mit E-Mail und Passwort bei Vital Plus anmelden oder ein Konto anlegen." },
      { property: "og:title", content: "Anmelden — Vital Plus" },
      { property: "og:description", content: "Dein Vital-Plus-Konto – deine Werte auf allen Geräten." },
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
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [magic, setMagic] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const sendMagicLink = async () => {
    if (!email) return setMsg("Bitte gib zuerst deine E-Mail-Adresse ein.");
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
        const { exists } = await accountExists({ data: { email } }).catch(() => ({ exists: true }));
        return setMsg(exists ? "E-Mail oder Passwort ist falsch." : "Dieses Konto existiert nicht.");
      }
      if (!signed.user?.email_confirmed_at) { await supabase.auth.signOut(); return setMsg("Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach."); }
      navigate({ to: "/heute" });
    } else {
      const questionnaire = readQuestionnaire();
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: publicAppUrl("/heute"), ...(questionnaire ? { data: { questionnaire } } : {}) } });
      setBusy(false);
      if (error) return setMsg(error.message.includes("registered") ? "Für diese E-Mail gibt es bereits ein Konto." : "Konto konnte nicht angelegt werden (Passwort mind. 8 Zeichen).");
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
        return setMsg("Für diese E-Mail gibt es bereits ein Konto. Bitte melde dich an oder setze dein Passwort zurück.");
      clearQuestionnaire();
      if (!data.session) { setSent(true); return; }
      navigate({ to: "/heute" });
    }
  };

  if (sent) return (
    <AppShell width="narrow">
      <PageHeader eyebrow={translateText("Vital Plus Konto")} title={translateText("Bestätige deine E-Mail")} sub={translateText("Fast geschafft!")} />
      <div className="card-surface mx-4 mt-4 space-y-2 p-5 text-sm">
        <p><Localized>{"Wir haben dir einen Bestätigungslink geschickt an:"}</Localized> <b>{email}</b></p>
        <p className="text-ink/70"><Localized>{"Erst nach dem Klick auf den Link in deinem Postfach ist dein Konto aktiv. Danach gelangst du direkt zu Heute."}</Localized></p>
      </div>
    </AppShell>
  );

  return (
    <AppShell width="narrow">
      <PageHeader eyebrow={translateText("Vital Plus Konto")} title={translateText(mode === "login" ? "Anmelden" : "Konto anlegen")} sub={translateText("Deine Werte sicher gespeichert – auf allen Geräten.")} />
      <div className="card-surface mx-4 mt-4 space-y-3 p-5">
        {mode === "login" && magicSent ? (
          <div className="space-y-2 text-sm">
            <p><Localized>{"Wir haben dir einen Login-Link geschickt an:"}</Localized> <b>{email}</b></p>
            <p className="text-ink/70"><Localized>{"Klicke auf den Link in deinem Postfach, um dich ohne Passwort anzumelden. Bitte prüfe auch deinen Spam-Ordner."}</Localized></p>
            <button type="button" onClick={() => { setMagicSent(false); setMsg(null); }} className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4"><Localized>{"Zurück zur Anmeldung"}</Localized></button>
          </div>
        ) : (
        <form onSubmit={mode === "login" && magic ? (e) => { e.preventDefault(); void sendMagicLink(); } : submit} className="space-y-3">

          <input required type="email" autoComplete="email" placeholder={translateText("E-Mail")} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          {!(mode === "login" && magic) && (
            <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : 1} placeholder={translateText("Passwort")} value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          )}
          {msg && <p className="rounded-xl bg-warn/15 px-3 py-2 text-[13px]"><Localized>{msg}</Localized></p>}
          <SwipeAction type="submit" busy={busy} label={mode === "login" ? (magic ? "Login-Link senden" : "Anmelden") : "Konto anlegen"} />
          {mode === "login" && (
            <button type="button" onClick={() => { setMagic(!magic); setMsg(null); }} className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4">
              <Localized>{magic ? "Stattdessen mit Passwort anmelden" : "Ohne Passwort anmelden (Login-Link per E-Mail)"}</Localized>
            </button>
          )}
        </form>
        )}
        {mode === "login" && !magic && !magicSent && (
          <button
            type="button"
            onClick={async () => {
              if (!email) return setMsg("Bitte gib zuerst deine E-Mail-Adresse ein.");
              setBusy(true);
              const error = await requestPasswordReset({ data: { email, redirectTo: publicAppUrl("/reset-password") } }).then(() => null, (e) => e);
              setBusy(false);
              setMsg(error ? "Senden nicht möglich – bitte in einer Minute erneut versuchen." : "Wenn ein bestätigtes Konto mit dieser E-Mail-Adresse existiert, erhältst du einen Link zum Zurücksetzen deines Passworts.");
            }}
            className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4"
          ><Localized>{" Passwort vergessen? "}</Localized></button>
        )}
      </div>
    </AppShell>
  );
}
