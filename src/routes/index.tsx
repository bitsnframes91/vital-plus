import { KeyRound, Link2 } from "lucide-react";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText } from "@/lib/language";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import startseiteProduce from "@/assets/startseite-produce.png.asset.json";
import { Button } from "@/components/ui/button";
import { SwipeAction } from "@/components/SwipeAction";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { clearQuestionnaire } from "@/lib/questionnaire-draft";
import { accountExists } from "@/lib/account.functions";
import { VivoBrand } from "@/components/VivoBrand";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Vitalplus — Gesünder leben. Glücklicher sein." },
      { name: "description", content: "Vitalplus: dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern." },
      { property: "og:title", content: "Vitalplus — Gesünder leben. Glücklicher sein." },
      { property: "og:description", content: "Dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  useLanguage();
  const navigate = useNavigate();
  const { s } = useStore();
  const [mode, setMode] = useState<"new" | "login">("new");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magic, setMagic] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const sendMagicLink = async () => {
    if (!email.trim()) { setError("Bitte gib zuerst deine E-Mail-Adresse ein."); return; }
    const last = Number(localStorage.getItem("vitalplus-magic-at") || 0);
    if (Date.now() - last < 60_000) { setError("Bitte warte eine Minute, bevor du einen neuen Login-Link anforderst."); return; }
    localStorage.setItem("vitalplus-magic-at", String(Date.now()));
    setBusy(true); setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + "/heute" } });
      if (otpError) { setError("Senden nicht möglich – bitte in einer Minute erneut versuchen."); return; }
      setMagicSent(true);
    } catch { setError("Senden nicht möglich – bitte in einer Minute erneut versuchen."); }
    finally { setBusy(false); }
  };
  const signIn = async () => {
    if (!email.trim() || !password) { setError("Bitte gib deine E-Mail-Adresse und dein Passwort ein."); return; }
    setBusy(true); setError(null);
    try {
      const { data: signed, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        if (authError.code === "email_not_confirmed") { setError("Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach."); return; }
        const { exists } = await accountExists({ data: { email: email.trim() } }).catch(() => ({ exists: true }));
        setError(exists ? "E-Mail oder Passwort ist falsch." : "Dieses Konto existiert nicht."); return;
      }
      if (!signed.user?.email_confirmed_at) { await supabase.auth.signOut(); setError("Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach."); return; }
      clearQuestionnaire();
      await navigate({ to: "/heute" });
    } catch { setError("Anmelden ist gerade nicht möglich. Bitte versuche es erneut."); }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-card font-sans text-foreground">
    <main className={`home-entry ${mode === "login" ? "home-entry-login" : ""}`}>
      <img src={startseiteProduce.url} alt={translateText("Vitali mit frischem Obst und Gemüse")} width={768} height={1152} fetchPriority="high" className="home-produce" />
      <header className="home-entry-header relative z-10">
        <Link to="/" aria-label={translateText("Vitalplus Startseite")} className="inline-block"><VivoBrand className="h-auto w-[190px] object-contain sm:w-[240px]" /></Link>
        <h1 className="sr-only">Vitalplus</h1>
        <p className="mt-5 text-[30px] font-semibold leading-tight sm:text-[40px]"><Localized>{"Gesünder leben."}</Localized><br /><Localized>{"Glücklicher sein."}</Localized></p>
      </header>
      <div className="home-entry-controls relative z-10">
        {s.account ? <SwipeAction label="Weiter zu Heute" onComplete={() => navigate({ to: "/heute" })} /> : <>
          <div className="mb-4 flex justify-center gap-5 rounded-full bg-card/95">
            <Button variant="link" onClick={() => { setMode("new"); setError(null); }} aria-pressed={mode === "new"} className={mode === "new" ? "font-bold text-ink underline underline-offset-4" : "text-muted-foreground"}><Localized>{"Neu hier"}</Localized></Button>
            <Button variant="link" onClick={() => { setMode("login"); setError(null); }} aria-pressed={mode === "login"} className={mode === "login" ? "font-bold text-ink underline underline-offset-4" : "text-muted-foreground"}><Localized>{"Einloggen"}</Localized></Button>
          </div>
          {mode === "login" && (magicSent ? (
            <div className="mb-4 space-y-2 rounded-lg bg-card p-4 text-sm">
              <p><Localized>{"Wir haben dir einen Login-Link geschickt an:"}</Localized> <b>{email}</b></p>
              <p className="text-muted-foreground"><Localized>{"Klicke auf den Link in deinem Postfach, um dich ohne Passwort anzumelden. Bitte prüfe auch deinen Spam-Ordner."}</Localized></p>
              <button type="button" onClick={() => { setMagicSent(false); setError(null); }} className="text-xs font-semibold text-muted-foreground underline"><Localized>{"Zurück zur Anmeldung"}</Localized></button>
            </div>
          ) : (
          <form onSubmit={e => { e.preventDefault(); void (magic ? sendMagicLink() : signIn()); }} className="mb-4 space-y-3">
            <input aria-label={translateText("E-Mail")} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={translateText("E-Mail")} className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring" />
            {!magic && <input aria-label={translateText("Passwort")} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder={translateText("Passwort")} className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring" />}
            {!magic && <div className="flex justify-end text-xs"><Link to="/login" search={{ mode: "reset" }} className="text-muted-foreground underline"><Localized>{"Passwort vergessen?"}</Localized></Link></div>}
            <p className="pt-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"><Localized>{"ODER"}</Localized></p>
            <button type="button" onClick={() => { setMagic(!magic); setError(null); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted">
              {magic ? <KeyRound className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
              <Localized>{magic ? "Mit Passwort anmelden" : "Mit Magischem Link anmelden"}</Localized>
            </button>
          </form>
          ))}
          {error && <p role="alert" className="mb-3 text-sm text-destructive"><Localized>{error}</Localized></p>}
          {!magicSent && <SwipeAction busy={busy} label={mode === "new" ? "Los geht’s" : magic ? "Login-Link senden" : "Anmelden"} onComplete={mode === "new" ? () => { clearQuestionnaire(); return navigate({ to: "/onboarding" }); } : magic ? sendMagicLink : signIn} />}
        </>}
      </div>
    </main>
  </div>;
}
