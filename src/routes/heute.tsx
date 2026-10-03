import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Icon, Sparkbars } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { fmtDate, status } from "@/lib/data";
import { reportMarkers, todaySuggestion } from "@/lib/plan-products";
import { Package } from "lucide-react";
import productImg from "@/assets/product-d3k2.jpg";
import forestHero from "@/assets/forest-mist-hero.jpg";
import { dailyGoals } from "@/lib/daily-goals";

export const Route = createFileRoute("/heute")({
  head: () => ({
    meta: [
      { title: "Heute — Fairvital Health" },
      { name: "description", content: "Dein persönliches Tages-Dashboard für Ernährung, Vitalstoffe und Laborwerte." },
      { property: "og:title", content: "Heute — Fairvital Health" },
      { property: "og:description", content: "Messen, verstehen, handeln, überprüfen – dein Gesundheitsbegleiter von Fairvital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Today,
});

function Today() {
  const { s, set } = useStore();
  const [selectedGoalKey, setSelectedGoalKey] = useState<string | null>(null);
  const suggestion = todaySuggestion(s.aiPlan, s.labs);
  const measured = reportMarkers(s.aiPlan, s.labs);
  const featured = suggestion?.marker ?? measured[0];
  const vals = featured?.history.map((h) => h.value) ?? [];
  const last = featured?.history.at(-1);
  const { fromPlan, goals: actions } = dailyGoals(s.aiPlan);
  const selectedGoal = actions.find((a) => a.key === selectedGoalKey);
  const done = actions.filter((a) => s.actionsDone[a.key]).length;
  const today = new Date().toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" });

  return (
    <AppShell>
      <div className="relative overflow-hidden bg-header px-6 pb-24 pt-9">
        <img src={forestHero} alt="Nebeliger Weg zwischen Bäumen" width={1920} height={960} className="absolute inset-0 size-full object-cover object-center" />
        <div className="today-image-overlay pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="font-data text-[12px] uppercase tracking-normal text-on-ink/40">{today}</span>
            <div className="flex gap-1.5">
              <Link to="/uhr" className="rounded-full px-2.5 py-1 text-[12px] text-on-ink/70 ring-1 ring-on-ink/15">Uhr</Link>
              <Link to="/profil" className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-on-ink/70 ring-1 ring-on-ink/15">
                <span className="size-1.5 rounded-full bg-fv" />Profil
              </Link>
            </div>
          </div>
          <h1 className="mt-5 text-balance text-[36px] font-semibold leading-[1.05] text-on-ink">
            Guten Morgen,<br />{s.name}.
          </h1>
          <p className="mt-2 max-w-[34ch] text-pretty text-sm text-on-ink/55">
            Deine Werte bewegen sich in die richtige Richtung. Heute warten {actions.length - done} Aktionen auf dich.
          </p>
          {!s.onboarded && (
            <Link to="/onboarding" className="mt-4 inline-flex rounded-full bg-fv px-4 py-2 text-sm font-medium text-ink">
              Gesundheitsprofil anlegen →
            </Link>
          )}
        </div>
      </div>

      <div className="relative -mt-14 px-4">
        <div className="glass rounded-[20px] px-5 py-4">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {["Messen", "Verstehen", "Handeln", "Prüfen"].map((w, i) => (
              <div key={w}>
                <div className={`font-data text-[11px] tracking-normal ${i === 2 ? "text-fv" : "text-on-ink/45"}`}>0{i + 1}</div>
                <div className="mt-0.5 text-[12px] font-medium text-on-ink/85">{w}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-4 px-4">
        <div className="flex items-baseline justify-between px-1 pb-2">
          <span className="eyebrow">Tagesziele{fromPlan ? " · aus deinem Plan" : ""}</span>
          <span className="font-data text-[12px] text-fv-deep">{done}/{actions.length}</span>
        </div>
        {!fromPlan && (
          <Link to="/labor" className="mb-2 block rounded-[16px] border border-dashed px-4 py-3 text-[13px] text-ink/55">
            Beispielziele. Lade deinen Laborbefund hoch – dann entstehen deine Tagesziele aus deinem persönlichen Plan →
          </Link>
        )}
        {fromPlan && actions.length === 0 && (
          <Link to="/plan" className="mb-2 block rounded-[16px] border border-dashed px-4 py-3 text-[13px] text-ink/55">
            Keine Schritte für heute ausgewählt. Wähle sie in deinem Plan aus →
          </Link>
        )}
        <div className="space-y-2">
          {actions.map((a) => {
            const ok = s.actionsDone[a.key];
            return (
              <Button
                key={a.key}
                type="button"
                variant="ghost"
                onClick={() => setSelectedGoalKey(a.key)}
                aria-label={`${a.title} – Details öffnen`}
                className="card-surface h-auto min-h-[72px] w-full justify-start gap-3 whitespace-normal rounded-[16px] px-4 py-3 text-left hover:bg-card"
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${ok ? "bg-fv/10 text-fv-deep" : "bg-ink/5 text-ink/40"}`}>
                  <Icon d={ok ? "M4 12l5 5L20 6" : "M12 6v6l4 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18"} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{a.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[12px] text-ink/45">{a.sub} · {ok ? "erreicht" : "ausstehend"}</div>
                </div>
                <Icon d="m9 18 6-6-6-6" className="size-4 shrink-0 text-ink/40" />
              </Button>
            );
          })}
        </div>
      </section>

      <Dialog open={selectedGoalKey !== null && !!selectedGoal} onOpenChange={(open) => { if (!open) setSelectedGoalKey(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] max-w-[420px] overflow-y-auto rounded-lg border-border bg-card p-6">
          {selectedGoal && (
            <>
              <DialogHeader className="pr-5 text-left">
                <span className="eyebrow">Tagesziel{fromPlan ? " · aus deinem Plan" : ""}</span>
                <DialogTitle className="mt-2 text-[22px] leading-snug tracking-normal text-foreground">{selectedGoal.title}</DialogTitle>
                <DialogDescription className="pt-3 text-[16px] leading-relaxed text-muted-foreground">{selectedGoal.sub}</DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                className="mt-4 w-full whitespace-normal py-3"
                variant={s.actionsDone[selectedGoal.key] ? "outline" : "default"}
                onClick={() => {
                  set({ actionsDone: { ...s.actionsDone, [selectedGoal.key]: !s.actionsDone[selectedGoal.key] } });
                  setSelectedGoalKey(null);
                }}
              >
                {s.actionsDone[selectedGoal.key] ? "Erledigung zurücknehmen" : "Als erledigt markieren"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>


      {featured && last && <section className="mt-4 px-4">
        <Link to="/labor" className="card-surface block p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="eyebrow">{featured.name}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-data text-[30px] font-medium">{last}</span>
                <span className="font-data text-[13px] text-ink/45">{featured.unit}</span>
              </div>
              <div className="mt-0.5 max-w-[26ch] text-[12px] text-ink/45">Vom {fmtDate(last.date)} · Zielbereich {featured.target[0]}–{featured.target[1]}</div>
            </div>
            <span className="rounded-full bg-fv/10 px-2.5 py-1 font-data text-[12px] uppercase tracking-normal text-fv-deep">{status(featured).label}</span>
          </div>
          <div className="mt-4"><Sparkbars values={vals} max={featured.target[1]} /></div>
          <div className="mt-3 flex items-center gap-2 border-t pt-3 text-[13px] text-ink/55">
            <Icon d="M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7" className="size-4 text-ink/40" />
            Nachkontrolle empfohlen in {featured.retestWeeks} Wochen.
          </div>
        </Link>
      </section>}

      <section className="mt-4 px-4">
        {suggestion ? <div className="card-surface overflow-hidden">
          <div className="flex gap-3 p-3">
            {suggestion.product.relatedMarker === "vitd"
              ? <img src={productImg} alt="" width={62} height={62} loading="lazy" className="size-[62px] shrink-0 rounded-[12px] object-cover" />
              : <span className="grid size-[62px] shrink-0 place-items-center rounded-[12px] bg-fv/10 text-fv-deep"><Package aria-hidden="true" className="size-7" /></span>}
            <div className="min-w-0 flex-1">
              <div className="font-data text-[11px] uppercase tracking-normal text-fv-deep">Passend zu {suggestion.marker.name}</div>
              <div className="mt-0.5 text-[15px] font-medium">{suggestion.product.name}</div>
              <div className="mt-0.5 text-[12px] text-ink/45">{suggestion.product.short}</div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2.5">
            <span className="text-[12px] text-ink/40">Optional · kein Muss</span>
            <a href={suggestion.product.url} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-fv-deep">Im Fairvital Shop ansehen →</a>
          </div>
        </div> : <Link to={s.aiPlan ? "/plan" : "/labor"} className="card-surface block p-5 text-[14px] text-ink/60">
          {s.aiPlan ? "Keine passende Ergänzung für deine gemessenen Werte nötig. Deinen Plan ansehen →" : "Lade deinen Laborbefund hoch, um passende Ergänzungen zu sehen →"}
        </Link>}
      </section>
    </AppShell>
  );
}
