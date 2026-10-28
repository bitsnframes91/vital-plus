import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Star, Pointer, LayoutGrid, Palette, Gauge, CircleEllipsis, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profil/feedback")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Feedback geben — Vital Plus" },
      { name: "description", content: "Teile dein Feedback zur Vital Plus App: Sterne, Themen und Nachricht." },
      { property: "og:title", content: "Feedback geben — Vital Plus" },
      { property: "og:description", content: "Hilf uns, die Vital Plus App zu verbessern." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedbackPage,
});

const topics: { label: string; icon: LucideIcon }[] = [
  { label: "Bedienung", icon: Pointer },
  { label: "Funktionen", icon: LayoutGrid },
  { label: "Design", icon: Palette },
  { label: "Geschwindigkeit", icon: Gauge },
  { label: "Andere", icon: CircleEllipsis },
];

function FeedbackPage() {
  useLanguage();
  const [rating, setRating] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const toggle = (label: string) =>
    setSelected(s => (s.includes(label) ? s.filter(x => x !== label) : [...s, label]));

  const submit = async () => {
    setBusy(true);
    setErr("");
    const client = supabase.from("app_feedback" as Parameters<typeof supabase.from>[0]) as unknown as {
      insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
    };
    const { error } = await client.insert({
      rating,
      topics: selected,
      message: message.trim(),
    });
    setBusy(false);
    if (error) {
      setErr("Feedback konnte nicht gesendet werden. Bitte später erneut versuchen.");
      return;
    }
    setDone(true);
  };

  return <AppShell width="narrow">
    <header className="flex min-h-20 items-center gap-2 px-3 py-5">
      <Button variant="ghost" size="icon" asChild className="shrink-0"><Link to="/profil/$section" params={{ section: "help" }} aria-label={translateText("Zurück zum Kundenservice")}><ArrowLeft className="size-5!" /></Link></Button>
      <h1 className="flex-1 text-center text-[17px] font-bold leading-6"><Localized>{"Feedback geben"}</Localized></h1><span className="w-9" aria-hidden="true" />
    </header>
    <p className="px-4 text-sm leading-5 text-muted-foreground"><Localized>{"Deine Meinung hilft uns, die App zu verbessern."}</Localized></p>
    <div className="space-y-4 px-4 pt-4 pb-10">
      <section className="rounded-2xl bg-card p-4">
        <h2 className="text-[15px] font-bold"><Localized>{"Wie zufrieden bist du mit der App?"}</Localized></h2>
        <div className="mt-4 flex items-center justify-between px-1" role="radiogroup" aria-label={translateText("Zufriedenheit von 1 bis 5")}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={translateText(`${n} von 5 Sternen`)}
              onClick={() => setRating(n)}
              className="p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <Star className={`size-9! ${n <= rating ? "fill-fresh text-fresh" : "text-muted-foreground/70"}`} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[13px] text-muted-foreground">
          <span><Localized>{"Sehr unzufrieden"}</Localized></span>
          <span><Localized>{"Sehr zufrieden"}</Localized></span>
        </div>
      </section>
      <section className="rounded-2xl bg-card p-4">
        <h2 className="text-[15px] font-bold"><Localized>{"Was können wir verbessern?"}</Localized></h2>
        <p className="mt-1 text-[13px] text-muted-foreground"><Localized>{"Du kannst mehrere Optionen auswählen."}</Localized></p>
        <div className="mt-3 flex flex-wrap gap-2">
          {topics.map(({ label, icon: Icon }) => {
            const on = selected.includes(label);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(label)}
                className={`flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${on ? "bg-fresh text-ink ring-1 ring-fresh" : "bg-muted text-foreground"}`}
              >
                <Icon className="size-4.5!" strokeWidth={1.7} /> <Localized>{label}</Localized>
              </button>
            );
          })}
        </div>
      </section>
      <section className="rounded-2xl bg-card p-4">
        <h2 className="text-[15px] font-bold"><Localized>{"Dein Feedback"}</Localized></h2>
        <div className="relative mt-3">
          <textarea
            value={message}
            maxLength={500}
            onChange={e => setMessage(e.target.value)}
            placeholder={translateText("Schreib uns, was du denkst …")}
            aria-label={translateText("Dein Feedback")}
            className="min-h-36 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 pb-8 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />
          <span className="pointer-events-none absolute right-3 bottom-3 text-[13px] text-muted-foreground"><Localized>{message.length}</Localized><Localized>{"/500"}</Localized></span>
        </div>
      </section>
      {err && <p className="px-1 text-sm text-destructive"><Localized>{err}</Localized></p>}
      <Button disabled={busy || rating === 0} onClick={submit} className="h-12 w-full rounded-full bg-fresh text-[15px] font-medium text-ink hover:bg-fresh/90 disabled:opacity-50">
        <Localized>{busy ? "Wird gesendet…" : "Feedback senden"}</Localized>
      </Button>
    </div>
    <Dialog open={done} onOpenChange={open => { if (!open) { setDone(false); setRating(0); setSelected([]); setMessage(""); } }}>
      <DialogContent className="max-w-sm rounded-3xl text-center">
        <DialogHeader><DialogTitle className="text-center"><Localized>{"Danke für dein Feedback!"}</Localized></DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground"><Localized>{"Wir lesen jedes Feedback sorgfältig."}</Localized></p>
        <Button onClick={() => { setDone(false); setRating(0); setSelected([]); setMessage(""); }} className="mx-auto h-11 rounded-full bg-fresh px-6 text-sm font-medium text-ink hover:bg-fresh/90"><Localized>{"Schließen"}</Localized></Button>
      </DialogContent>
    </Dialog>
  </AppShell>;
}
