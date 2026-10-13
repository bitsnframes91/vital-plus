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
      if (authError) { setError(authError.code === "email_not_confirmed" ? "Bitte bestätige zuerst deine E-Mail über den Link in deinem Postfach." : "E-Mail oder Passwort ist falsch."); return; }
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
          {mode === "login" && <form onSubmit={e => { e.preventDefault(); void signIn(); }} className="mb-4 space-y-3">
            <input aria-label={translateText("E-Mail")} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={translateText("E-Mail")} className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring" />
            <input aria-label={translateText("Passwort")} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder={translateText("Passwort")} className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring" />
            <Link to="/login" search={{ mode: "login" }} className="block text-right text-xs text-muted-foreground underline"><Localized>{"Passwort vergessen?"}</Localized></Link>
          </form>}
          {error && <p role="alert" className="mb-3 text-sm text-destructive"><Localized>{error}</Localized></p>}
          <SwipeAction busy={busy} label={mode === "new" ? "Los geht’s" : "Anmelden"} onComplete={mode === "new" ? () => { clearQuestionnaire(); return navigate({ to: "/onboarding" }); } : signIn} />
        </>}
      </div>
    </main>
  </div>;
}
