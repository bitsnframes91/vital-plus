import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Google/Apple sign-ups must additionally confirm their email via a link sent by Vivo.
export function needsConfirm(u: User | null) {
  if (!u?.email) return false;
  const p = u.app_metadata?.provider;
  const social = p === "google" || p === "apple";
  return social && !u.user_metadata?.["vivo_confirmed"];
}

async function sendLink(email: string) {
  return supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + "/bestaetigt" } });
}

export function ConfirmBanner() {
  const [user, setUser] = useState<User | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !needsConfirm(user) || user.user_metadata?.["vivo_confirm_sent"]) return;
    sendLink(user.email!).then(() => supabase.auth.updateUser({ data: { vivo_confirm_sent: true } }));
  }, [user]);

  if (!needsConfirm(user)) return null;
  const resend = async () => {
    const { error } = await sendLink(user!.email!);
    setInfo(error ? "Senden nicht möglich – bitte in einer Minute erneut versuchen." : "Neuer Link wurde gesendet.");
  };
  return (
    <div role="alert" className="sticky top-0 z-40 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-ink">
      <p className="font-semibold text-destructive">Konto noch nicht bestätigt</p>
      <p className="mt-0.5">Wir haben dir einen Bestätigungslink an <b>{user!.email}</b> gesendet. Bitte öffne dein Postfach und klicke auf den Link, um dein Profil zu aktivieren.</p>
      <button onClick={resend} className="mt-1 font-semibold underline">Link erneut senden</button>
      {info && <span className="ml-2 text-ink/60">{info}</span>}
    </div>
  );
}
