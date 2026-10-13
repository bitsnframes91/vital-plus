import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg("E-Mail oder Passwort ist falsch.");
      navigate({ to: "/heute" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: publicAppUrl("/heute") } });
      setBusy(false);
      if (error) return setMsg(error.message.includes("registered") ? "Für diese E-Mail gibt es bereits ein Konto." : "Konto konnte nicht angelegt werden (Passwort mind. 8 Zeichen).");
      if (!data.session) { setMsg("Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben."); setMode("login"); return; }
      navigate({ to: "/heute" });
    }
  };

  return (
    <AppShell>
      <PageHeader eyebrow={translateText("Vitalplus Konto")} title={translateText(mode === "login" ? "Anmelden" : "Konto anlegen")} sub={translateText("Deine Werte sicher gespeichert – auf allen Geräten.")} />
      <div className="card-surface mx-4 mt-4 space-y-3 p-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {(["login", "register"] as const).map((m) => (
              <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-full py-1.5 text-sm ${mode === m ? "bg-card font-medium" : "text-ink/55"}`}>
                <Localized>{m === "login" ? "Anmelden" : "Neu hier"}</Localized>
              </button>
            ))}
          </div>
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
              const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: publicAppUrl("/reset-password") });
              setBusy(false);
              setMsg(error ? "Senden nicht möglich – bitte in einer Minute erneut versuchen." : "Wir haben dir einen Link zum Zurücksetzen deines Passworts geschickt.");
            }}
            className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4"
          ><Localized>{" Passwort vergessen? "}</Localized></button>
        )}
      </div>
    </AppShell>
  );
}
