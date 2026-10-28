import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bestaetigt")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "E-Mail bestätigt — Vital Plus" },
      { name: "description", content: "Bestätigung deines Vital-Plus-Kontos." },
      { property: "og:title", content: "E-Mail bestätigt — Vital Plus" },
      { property: "og:description", content: "Bestätigung deines Vital-Plus-Kontos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Confirmed,
});

function Confirmed() {
  useLanguage();
  const [state, setState] = useState<"wait" | "ok" | "fail">("wait");
  useEffect(() => {
    let done = false;
    const confirm = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || done) return false;
      done = true;
      const { error } = await supabase.auth.updateUser({ data: { vivo_confirmed: true } });
      setState(error ? "fail" : "ok");
      return true;
    };
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void confirm(); });
    void confirm();
    const t = setTimeout(() => { if (!done) setState("fail"); }, 6000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);
  return (
    <AppShell width="narrow">
      <PageHeader eyebrow={translateText("Vital Plus Konto")} title={translateText(state === "ok" ? "Konto bestätigt" : state === "fail" ? "Link ungültig" : "Wird bestätigt …")} />
      <div className="card-surface mx-4 mt-4 space-y-3 p-5 text-sm">
        {state === "ok" && <p><Localized>{"Danke! Deine E-Mail-Adresse ist bestätigt und dein Profil ist jetzt aktiv."}</Localized></p>}
        {state === "fail" && <p><Localized>{"Der Link ist abgelaufen oder ungültig. Melde dich an und fordere über den Hinweis oben einen neuen Link an."}</Localized></p>}
        <Link to="/heute" className="inline-block font-semibold text-primary"><Localized>{"Weiter zu Heute →"}</Localized></Link>
      </div>
    </AppShell>
  );
}
