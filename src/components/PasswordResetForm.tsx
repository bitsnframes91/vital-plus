import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function PasswordResetForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return sent ? <p role="status" className="text-sm leading-6 text-muted-foreground">Wenn ein Konto mit dieser E-Mail-Adresse existiert, erhältst du einen Link zum Zurücksetzen deines Passworts. Bitte prüfe auch deinen Spam-Ordner.</p> : (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      if (busy) return;
      setBusy(true); setError("");
      try {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (failure) setError("Senden nicht möglich – bitte in einer Minute erneut versuchen.");
        else setSent(true);
      } catch {
        setError("Senden nicht möglich – bitte prüfe deine Verbindung und versuche es erneut.");
      } finally { setBusy(false); }
    }}>
      <p className="text-sm leading-6 text-muted-foreground">Gib deine E-Mail-Adresse ein, um einen Link zum Zurücksetzen deines Passworts zu erhalten.</p>
      <label className="block text-sm" htmlFor="profile-reset-email">E-Mail-Adresse</label>
      <input id="profile-reset-email" required type="email" autoComplete="email" value={email} disabled={busy} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-input bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-ring" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full bg-fresh text-ink hover:bg-fresh/90">{busy ? "Bitte warten…" : "Reset-Link senden"}</Button>
    </form>
  );
}