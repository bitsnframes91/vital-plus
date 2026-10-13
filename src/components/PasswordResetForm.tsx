import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/account.functions";
import { publicAppUrl } from "@/lib/native-app";
import { Button } from "@/components/ui/button";

export function PasswordResetForm({ initialEmail = "" }: { initialEmail?: string }) {
  useLanguage();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return sent ? <p role="status" className="text-sm leading-6 text-muted-foreground"><Localized>{"Wenn ein Konto mit dieser E-Mail-Adresse existiert, erhältst du einen Link zum Zurücksetzen deines Passworts. Bitte prüfe auch deinen Spam-Ordner."}</Localized></p> : (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      if (busy) return;
      setBusy(true); setError("");
      try {
        await requestPasswordReset({ data: { email: email.trim(), redirectTo: publicAppUrl("/reset-password") } });
        setSent(true);
      } catch {
        setError("Senden nicht möglich – bitte in einer Minute erneut versuchen.");
      } finally { setBusy(false); }
    }}>
      <p className="text-sm leading-6 text-muted-foreground"><Localized>{"Gib deine E-Mail-Adresse ein, um einen Link zum Zurücksetzen deines Passworts zu erhalten."}</Localized></p>
      <label className="block text-sm" htmlFor="profile-reset-email"><Localized>{"E-Mail-Adresse"}</Localized></label>
      <input id="profile-reset-email" required type="email" autoComplete="email" value={email} disabled={busy} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-input bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-ring" />
      {error && <p role="alert" className="text-sm text-destructive"><Localized>{error}</Localized></p>}
      <Button type="submit" disabled={busy} className="w-full bg-fresh text-ink hover:bg-fresh/90"><Localized>{busy ? "Bitte warten…" : "Reset-Link senden"}</Localized></Button>
    </form>
  );
}