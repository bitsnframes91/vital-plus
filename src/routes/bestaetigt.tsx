import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bestaetigt")({
  head: () => ({
    meta: [
      { title: "E-Mail bestätigt — Vivo" },
      { name: "description", content: "Bestätigung deines Vivo-Kontos." },
      { property: "og:title", content: "E-Mail bestätigt — Vivo" },
      { property: "og:description", content: "Bestätigung deines Vivo-Kontos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Confirmed,
});

function Confirmed() {
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
    <AppShell>
      <PageHeader eyebrow="Vivo Konto" title={state === "ok" ? "Konto bestätigt" : state === "fail" ? "Link ungültig" : "Wird bestätigt …"} />
      <div className="card-surface mx-4 mt-4 space-y-3 p-5 text-sm">
        {state === "ok" && <p>Danke! Deine E-Mail-Adresse ist bestätigt und dein Profil ist jetzt aktiv.</p>}
        {state === "fail" && <p>Der Link ist abgelaufen oder ungültig. Melde dich an und fordere über den Hinweis oben einen neuen Link an.</p>}
        <Link to="/heute" className="inline-block font-semibold text-primary">Weiter zu Heute →</Link>
      </div>
    </AppShell>
  );
}
