import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { publicAppUrl } from "@/lib/native-app";

// Apple identity is confirmed by Apple; only Google keeps fairvitalgo's additional link.
export function needsConfirm(u: Pick<User, "email" | "app_metadata" | "user_metadata"> | null) {
  if (!u?.email) return false;
  const p = u.app_metadata?.provider;
  const social = p === "google";
  return social && !u.user_metadata?.["vivo_confirmed"];
}

async function sendLink(email: string) {
  return supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: publicAppUrl("/bestaetigt") } });
}

export function ConfirmBanner() {
  useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.email || !needsConfirm(user) || user.user_metadata?.["vivo_confirm_sent"]) return;
    sendLink(user.email).then(() => supabase.auth.updateUser({ data: { vivo_confirm_sent: true } }));
  }, [user]);

  if (!user?.email || !needsConfirm(user)) return null;
  const email = user.email;
  const resend = async () => {
    const { error } = await sendLink(email);
    setInfo(error ? "Senden nicht möglich – bitte in einer Minute erneut versuchen." : "Neuer Link wurde gesendet.");
  };
  return (
    <div role="alert" className="sticky top-0 z-40 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-ink">
      <p className="font-semibold text-destructive"><Localized>{"Konto noch nicht bestätigt"}</Localized></p>
      <p className="mt-0.5"><Localized>{"Wir haben dir einen Bestätigungslink an "}</Localized><b><Localized>{email}</Localized></b><Localized>{" gesendet. Bitte öffne dein Postfach und klicke auf den Link, um dein Profil zu aktivieren."}</Localized></p>
      <button onClick={resend} className="mt-1 font-semibold underline"><Localized>{"Link erneut senden"}</Localized></button>
      {info && <span className="ml-2 text-ink/60"><Localized>{info}</Localized></span>}
    </div>
  );
}
