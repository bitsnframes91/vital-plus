import { requestPasswordReset } from "@/lib/account.functions";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { readQuestionnaire, clearQuestionnaire } from "@/lib/questionnaire-draft";
import { publicAppUrl } from "@/lib/native-app";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: true },
  validateSearch: (search: Record<string, unknown>) => ({ mode: search["mode"] === "register" ? ("register" as const) : ("login" as const) }),
  head: () => ({
    meta: [
      { title: "Anmelden — Vitalplus" },
      { name: "description", content: "Mit E-Mail und Passwort bei Vitalplus anmelden oder ein Konto anlegen." },
      { property: "og:title", content: "Anmelden — Vitalplus" },
      { property: "og:description", content: "Dein Vitalplus-Konto – deine Werte auf allen Geräten." },
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "login") {
      const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg(error.code === "email_not_confirmed" ? "Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach." : "E-Mail oder Passwort ist falsch.");
      if (!signed.user?.email_confirmed_at) { await supabase.auth.signOut(); return setMsg("Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach."); }
      navigate({ to: "/heute" });
    } else {
      const questionnaire = readQuestionnaire();
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: publicAppUrl("/heute"), ...(questionnaire ? { data: { questionnaire } } : {}) } });
      setBusy(false);
      if (error) return setMsg(error.message.includes("registered") ? "Für diese E-Mail gibt es bereits ein Konto." : "Konto konnte nicht angelegt werden (Passwort mind. 8 Zeichen).");
      clearQuestionnaire();
      if (!data.session) { setSent(true); return; }
      navigate({ to: "/heute" });
    }
  };

  if (sent) return (
    <AppShell>
      <PageHeader eyebrow={translateText("Vitalplus Konto")} title={translateText("Bestätige deine E-Mail")} sub={translateText("Fast geschafft!")} />
      <div className="card-surface mx-4 mt-4 space-y-2 p-5 text-sm">
        <p><Localized>{"Wir haben dir einen Bestätigungslink geschickt an:"}</Localized> <b>{email}</b></p>
        <p className="text-ink/70"><Localized>{"Erst nach dem Klick auf den Link in deinem Postfach ist dein Konto aktiv. Danach gelangst du direkt zu Heute."}</Localized></p>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <PageHeader eyebrow={translateText("Vitalplus Konto")} title={translateText(mode === "login" ? "Anmelden" : "Konto anlegen")} sub={translateText("Deine Werte sicher gespeichert – auf allen Geräten.")} />
      <div className="card-surface mx-4 mt-4 space-y-3 p-5">
        <form onSubmit={submit} className="space-y-3">

          <input required type="email" autoComplete="email" placeholder={translateText("E-Mail")} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : 1} placeholder={translateText("Passwort")} value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          {msg && <p className="rounded-xl bg-warn/15 px-3 py-2 text-[13px]"><Localized>{msg}</Localized></p>}
          <button disabled={busy} className="w-full rounded-full bg-fresh py-2.5 text-sm font-medium text-ink disabled:opacity-50">
            <Localized>{busy ? "Bitte warten…" : mode === "login" ? "Anmelden" : "Konto anlegen"}</Localized>
          </button>
        </form>
        {mode === "login" && (
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
