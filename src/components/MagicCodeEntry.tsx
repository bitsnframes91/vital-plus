import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Localized } from "@/components/Localized";
import { translateText } from "@/lib/language";
import { Button } from "@/components/ui/button";

/** Users wait this long after a code went out before a new one can be requested. */
export const RESEND_SECONDS = 30;

/** Lets users finish a magic-link sign-in inside the app by typing the emailed code,
 * so tapping the link (which opens the phone's browser) is not required. */
export function MagicCodeEntry({ email, type = "email" }: { email: string; type?: "email" | "signup" }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);
  const [until, setUntil] = useState(() => Date.now() + RESEND_SECONDS * 1000);

  // The first code left with the previous screen, so its waiting time starts right away.
  useEffect(() => {
    const tick = () => setWait(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until]);

  const verify = async () => {
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setError("Code ungültig oder abgelaufen.");
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token, type });
    setBusy(false);
    if (err) return setError("Code ungültig oder abgelaufen.");
    navigate({ to: "/heute" });
  };

  const resend = async () => {
    if (wait > 0 || busy) return;
    setBusy(true);
    setError(null);
    setResent(false);
    const emailRedirectTo = window.location.origin + "/heute";
    const { error: err } = type === "signup"
      ? await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo } })
      : await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo } });
    setBusy(false);
    if (err) return setError("Senden nicht möglich – bitte in einer Minute erneut versuchen.");
    setResent(true);
    setUntil(Date.now() + RESEND_SECONDS * 1000);
    setWait(RESEND_SECONDS);
  };

  return (
    <div className="space-y-2 pt-2">
      <p className="text-muted-foreground"><Localized>{"Gib den 6-stelligen Code aus der E-Mail hier ein:"}</Localized></p>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={10}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        aria-label={translateText("Dein Anmeldecode:")}
        placeholder="123456"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg tracking-[0.3em]"
      />
      {error && <p role="alert" className="text-xs text-destructive"><Localized>{error}</Localized></p>}
      <Button type="button" className="w-full" disabled={busy} onClick={verify}><Localized>{"Code bestätigen"}</Localized></Button>
      <button
        type="button"
        onClick={resend}
        disabled={busy || wait > 0}
        className="w-full text-center text-[13px] font-semibold text-ink/70 underline underline-offset-4 disabled:opacity-50"
      >
        <Localized>{wait > 0 ? `Code erneut senden in ${wait}s` : "Code erneut senden"}</Localized>
      </button>
      {resent && <p className="text-center text-xs text-ink/70"><Localized>{"Neuer Code geschickt – prüfe dein Postfach."}</Localized></p>}
    </div>
  );
}
