import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Localized } from "@/components/Localized";
import { translateText } from "@/lib/language";
import { Button } from "@/components/ui/button";

/** Lets users finish a magic-link sign-in inside the app by typing the emailed code,
 * so tapping the link (which opens the phone's browser) is not required. */
export function MagicCodeEntry({ email }: { email: string }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setError("Code ungültig oder abgelaufen.");
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setBusy(false);
    if (err) return setError("Code ungültig oder abgelaufen.");
    navigate({ to: "/heute" });
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
    </div>
  );
}
