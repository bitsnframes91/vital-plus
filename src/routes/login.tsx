import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { shopLogin, shopRegister } from "@/lib/shop-account.functions";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({ mode: search['mode'] === "register" ? "register" as const : "login" as const }),
  head: () => ({
    meta: [
      { title: "Anmelden — Vivo" },
      { name: "description", content: "Mit deinem Fairvital Shop-Konto anmelden oder ein neues Konto anlegen." },
      { property: "og:title", content: "Anmelden — Vivo" },
      { property: "og:description", content: "Ein Konto für Shop und Gesundheits-App." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const field = "w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function Login() {
  const { mode: initialMode } = Route.useSearch();
  const { set } = useStore();
  const navigate = useNavigate();
  const login = useServerFn(shopLogin);
  const register = useServerFn(shopRegister);
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [f, setF] = useState({ email: "", password: "", firstName: "", lastName: "", street: "", zipcode: "", city: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = mode === "login" ? await login({ data: { email: f.email, password: f.password } }) : await register({ data: f });
      if (r.ok) {
        set({ account: { email: r.email, firstName: r.firstName, lastName: r.lastName, contextToken: r.contextToken }, name: r.firstName });
        navigate({ to: "/heute" });
      } else {
        setMsg(r.error);
        if (r.pendingConfirmation) setMode("login");
      }
    } catch {
      setMsg(mode === "register" ? "Bitte alle Felder prüfen (Passwort mind. 8 Zeichen)." : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Fairvital Konto" title={mode === "login" ? "Anmelden" : "Konto anlegen"} sub="Ein Konto für fairvital.com und diese App." />
      <form onSubmit={submit} className="card-surface mx-4 mt-4 space-y-3 p-5">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(["login", "register"] as const).map((m) => (
            <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-full py-1.5 text-sm ${mode === m ? "bg-card font-medium" : "text-ink/55"}`}>
              {m === "login" ? "Anmelden" : "Neu hier"}
            </button>
          ))}
        </div>
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Vorname" value={f.firstName} onChange={up("firstName")} className={field} />
            <input required placeholder="Nachname" value={f.lastName} onChange={up("lastName")} className={field} />
          </div>
        )}
        <input required type="email" autoComplete="email" placeholder="E-Mail" value={f.email} onChange={up("email")} className={field} />
        <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : 1} placeholder="Passwort" value={f.password} onChange={up("password")} className={field} />
        {mode === "register" && (
          <>
            <input required placeholder="Straße und Hausnummer" value={f.street} onChange={up("street")} className={field} />
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <input required placeholder="PLZ" value={f.zipcode} onChange={up("zipcode")} className={field} />
              <input required placeholder="Ort" value={f.city} onChange={up("city")} className={field} />
            </div>
            <p className="text-[12px] text-ink/45">Dein Konto wird auch im Fairvital Shop angelegt. Mit der Registrierung akzeptierst du die Datenschutzerklärung von fairvital.com.</p>
          </>
        )}
        {msg && <p className="rounded-xl bg-warn/15 px-3 py-2 text-[13px]">{msg}</p>}
        <button disabled={busy} className="w-full rounded-full bg-ink py-2.5 text-sm font-medium text-on-ink disabled:opacity-50">
          {busy ? "Bitte warten…" : mode === "login" ? "Mit Shop-Konto anmelden" : "Konto anlegen"}
        </button>
        {mode === "login" && (
          <a href="https://www.fairvital.com/account/recover" target="_blank" rel="noreferrer" className="block text-center text-[13px] text-fv-deep">Passwort vergessen?</a>
        )}
      </form>
    </AppShell>
  );
}
