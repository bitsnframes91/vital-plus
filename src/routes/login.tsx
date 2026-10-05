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
        <div className="flex items-center gap-3 text-[12px] text-ink/45"><span className="h-px flex-1 bg-border" />oder<span className="h-px flex-1 bg-border" /></div>
        <button type="button" onClick={() => social("google")} aria-label="Sign up with Google" className="flex w-full items-stretch gap-1 rounded-xl bg-card p-1 ring-1 ring-border">
          <span className="flex w-11 items-center justify-center rounded-lg bg-card">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
            </svg>
          </span>
          <span className="flex-1 rounded-lg bg-ink py-2.5 text-center text-sm font-medium text-on-ink">Sign up with Google</span>
        </button>
        <button type="button" onClick={() => social("apple")} aria-label="Sign up with Apple" className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-sm font-medium text-on-ink">
          <svg viewBox="0 0 384 512" className="size-4" aria-hidden="true" fill="currentColor">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
          </svg>
          Sign up with Apple
        </button>
      </div>
    </AppShell>
  );
}
