import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Neues Passwort — Vivo" },
      { name: "description", content: "Lege ein neues Passwort für dein Vivo-Konto fest." },
      { property: "og:title", content: "Neues Passwort — Vivo" },
      { property: "og:description", content: "Passwort für dein Vivo-Konto zurücksetzen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

const field = "w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "PASSWORD_RECOVERY" || s) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    const t = setTimeout(() => setReady((r) => { if (!r) setMsg("Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an."); return r; }), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setMsg("Die Passwörter stimmen nicht überein.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg("Passwort konnte nicht gespeichert werden (mind. 8 Zeichen).");
    setMsg("Passwort gespeichert – du wirst weitergeleitet…");
    setTimeout(() => navigate({ to: "/heute" }), 1200);
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Vivo Konto" title="Neues Passwort" sub="Lege ein neues Passwort für dein Konto fest." />
      <div className="card-surface mx-4 mt-4 space-y-3 p-5">
        <form onSubmit={submit} className="space-y-3">
          <input required type="password" autoComplete="new-password" minLength={8} placeholder="Neues Passwort" value={pw} onChange={(e) => setPw(e.target.value)} className={field} />
          <input required type="password" autoComplete="new-password" minLength={8} placeholder="Passwort wiederholen" value={pw2} onChange={(e) => setPw2(e.target.value)} className={field} />
          {msg && <p className="rounded-xl bg-warn/15 px-3 py-2 text-[13px]">{msg}</p>}
          <button disabled={busy || !ready} className="w-full rounded-full bg-fresh py-2.5 text-sm font-medium text-ink disabled:opacity-50">
            {busy ? "Bitte warten…" : "Passwort speichern"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
