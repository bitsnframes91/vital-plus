import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({ mode: search["mode"] === "register" ? ("register" as const) : ("login" as const) }),
  head: () => ({
    meta: [
      { title: "Anmelden — Vivo" },
      { name: "description", content: "Mit E-Mail, Google oder Apple bei Vivo anmelden oder ein Konto anlegen." },
      { property: "og:title", content: "Anmelden — Vivo" },
      { property: "og:description", content: "Dein Vivo-Konto – deine Werte auf allen Geräten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const field = "w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function Login() {
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
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/heute" } });
      setBusy(false);
      if (error) return setMsg(error.message.includes("registered") ? "Für diese E-Mail gibt es bereits ein Konto." : "Konto konnte nicht angelegt werden (Passwort mind. 8 Zeichen).");
      if (!data.session) { setMsg("Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben."); setMode("login"); return; }
      navigate({ to: "/heute" });
    }
  };

  const social = async (provider: "google" | "apple") => {
    setMsg(null);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) return setMsg("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
    if (r.redirected) return;
    navigate({ to: "/heute" });
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Vivo Konto" title={mode === "login" ? "Anmelden" : "Konto anlegen"} sub="Deine Werte sicher gespeichert – auf allen Geräten." />
      <div className="card-surface mx-4 mt-4 space-y-3 p-5">
        <button type="button" onClick={() => social("google")} className="w-full rounded-full py-2.5 text-sm font-medium ring-1 ring-border">Weiter mit Google</button>
        <button type="button" onClick={() => social("apple")} className="w-full rounded-full bg-ink py-2.5 text-sm font-medium text-on-ink">Weiter mit Apple</button>
        <div className="flex items-center gap-3 text-[12px] text-ink/45"><span className="h-px flex-1 bg-border" />oder mit E-Mail<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {(["login", "register"] as const).map((m) => (
              <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-full py-1.5 text-sm ${mode === m ? "bg-card font-medium" : "text-ink/55"}`}>
                {m === "login" ? "Anmelden" : "Neu hier"}
              </button>
            ))}
          </div>
          <input required type="email" autoComplete="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : 1} placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          {msg && <p className="rounded-xl bg-warn/15 px-3 py-2 text-[13px]">{msg}</p>}
          <button disabled={busy} className="w-full rounded-full bg-fresh py-2.5 text-sm font-medium text-ink disabled:opacity-50">
            {busy ? "Bitte warten…" : mode === "login" ? "Anmelden" : "Konto anlegen"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
