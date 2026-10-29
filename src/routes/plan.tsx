import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Clock3, ExternalLink, HeartPulse, Salad, Sun } from "lucide-react";
import { StepsIcon } from "@/components/StepsIcon";
import { AppShell, Icon } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { status } from "@/lib/data";
import { todayKey } from "@/lib/daily-goals";
import { suggestedProducts } from "@/lib/plan-products";
import { combinedPlan, goalProducts } from "@/lib/goal-plan";
import { routineTips, type RoutineTip } from "@/lib/deficiency-routines";
import { PlanMascot } from "@/components/PlanMascot";

export const Route = createFileRoute("/plan")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Mein Plan — Vital Plus" },
      { name: "description", content: "Dein persönlicher Plan mit Schritten für heute und Empfehlungen zu niedrigen Laborwerten." },
      { property: "og:title", content: "Mein Plan — Vital Plus" },
      { property: "og:description", content: "Praktische Schritte und Empfehlungen zu niedrigen Laborwerten, auf dich abgestimmt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Plan,
});

function Plan() {
  useLanguage();
  const { s, set } = useStore();
  const [open, setOpen] = useState<number | null>(0);
  const [openRoutine, setOpenRoutine] = useState<string | null>(null);
  const deficient = s.labs.filter((m) => m.history.length && ["low", "very_low"].includes(status(m).level));
  const suggestions = suggestedProducts(s.aiPlan, s.labs);
  const icons = { food: Salad, sun: Sun, walk: StepsIcon, clock: Clock3, heart: HeartPulse } satisfies Record<RoutineTip["icon"], React.ComponentType<{ className?: string }>>;
  const d = todayKey();
  const userGoals = s.onboarded ? s.goals : [];
  const items = combinedPlan(s.aiPlan, userGoals, s.goalOff);
  const labIds = new Set(suggestions.map((e) => e.product.shopwareId));
  const goalSuggestions = goalProducts(userGoals).filter((e) => !labIds.has(e.product.shopwareId));
  const doneCount = items.filter((it) => s.actionsDone[`${d}:${it.key}`]).length;
  const toggleDone = (key: string) => {
    const k = `${d}:${key}`;
    set({ actionsDone: { ...s.actionsDone, [k]: !s.actionsDone[k] } });
  };

  return (
    <AppShell>
      <header className="plan-mascot-header relative bg-card px-6 pb-8 pt-9">
        <PlanMascot />
        <div className="plan-mascot-copy relative">
          <div className="font-data text-[12px] uppercase text-fv-deep"><Localized>{"Plan"}</Localized></div>
          <h1 className="mt-4 text-[29px] font-bold leading-[1.15] text-foreground"><Localized>{"Dein persönlicher Plan"}</Localized></h1>
          <p className="mt-2 text-sm text-muted-foreground"><Localized>{s.aiPlan ? "Aus deinen Zielen und deinem Laborbefund – keine medizinische Beratung." : "Aus deinen Fragebogen-Zielen – keine medizinische Beratung."}</Localized></p>
        </div>
      </header>
      <div className="space-y-3 px-4 pt-4">
        {!items.length && (
          <Link to="/onboarding" className="card-surface block p-5">
            <div className="text-[16px] font-semibold"><Localized>{"Noch kein persönlicher Plan"}</Localized></div>
            <p className="mt-1 text-[14px] text-ink/60"><Localized>{"Wähle im Fragebogen, was dir wichtig ist – oder lade deinen Laborbefund hoch. Daraus entstehen dein Plan und deine Tagesziele."}</Localized></p>
            <span className="mt-2 inline-block text-[14px] font-semibold text-fv-deep"><Localized>{"Fragebogen öffnen →"}</Localized></span>
          </Link>
        )}
        {items.length > 0 && (
          <div className="card-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="eyebrow"><Localized>{s.aiPlan ? `Befund vom ${new Date(s.aiPlan.date).toLocaleDateString(languageLocale())} + deine Ziele` : "Aus deinen Zielen"}</Localized></div>
              <span className="font-data text-[12px] text-fv-deep"><Localized>{"heute "}</Localized><Localized>{doneCount}</Localized><Localized>{"/"}</Localized><Localized>{items.length}</Localized></span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-fv transition-all" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {items.map((it, i) => {
                const done = !!s.actionsDone[`${d}:${it.key}`];
                return (
                  <li key={it.key} className="rounded-[14px] ring-1 ring-border">
                    <div className="flex items-center gap-3 px-3 py-3">
                      <Button variant="ghost" size="icon" onClick={() => toggleDone(it.key)} aria-label={translateText("Heute erledigt")}
                        className={`size-7 shrink-0 rounded-full ${done ? "bg-fv text-ink" : "ring-1 ring-border text-ink/30"}`}>
                        <Icon d="M4 12l5 5L20 6" className="size-4" />
                      </Button>
                      <Button variant="ghost" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="h-auto min-w-0 flex-1 flex-col items-start justify-start whitespace-normal px-0 text-left hover:bg-transparent">
                        <div className={`text-[15px] font-medium ${done ? "text-ink/45 line-through" : ""}`}><Localized>{it.title}</Localized></div>
                        <div className="text-[11px] font-medium text-ink/45"><Localized>{it.source === "labor" ? "Aus deinem Laborbefund" : `Ziel: ${it.goals.join(", ")}`}</Localized></div>
                      </Button>
                      <span className="text-ink/30"><Localized>{open === i ? "–" : "+"}</Localized></span>
                    </div>
                    {open === i && (
                      <div className="border-t px-3 py-3">
                        <p className="text-[14px] text-ink/65"><Localized>{it.detail}</Localized></p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {!s.aiPlan && <Link to="/labor" className="mt-3 block text-[13px] font-semibold text-fv-deep"><Localized>{"Laborbefund hochladen und Plan ergänzen →"}</Localized></Link>}
            <p className="mt-3 border-t pt-3 text-[12px] text-ink/40"><Localized>{"Automatisch erstellt – keine Diagnose. Bitte mit deiner Ärztin oder deinem Arzt besprechen."}</Localized></p>
          </div>
        )}
        {goalSuggestions.length > 0 && (
          <section className="pt-5" aria-label={translateText("Fairvital Empfehlungen zu deinen Zielen")}>
            <h2 className="px-1 text-[18px] font-semibold"><Localized>{"Passend zu deinen Zielen"}</Localized></h2>
            <p className="mb-3 px-1 text-[13px] text-ink/55"><Localized>{"Produktempfehlungen passend zu deinen Zielen im Fragebogen."}</Localized></p>
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {goalSuggestions.map(({ product, goals }) => (
                <a key={product.shopwareId} href={product.url} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-4">
                  <img src={product.image} alt={translateText(product.name)} className="size-16 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-border" loading="lazy" />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-fv-deep"><Localized>{"Shop-Empfehlung"}</Localized></span>
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-ink/45"><Localized>{goals.join(" · ")}</Localized></span>
                    <span className="block text-[15px] font-semibold text-fv-deep underline underline-offset-4"><Localized>{product.name}</Localized></span>
                    <span className="mt-0.5 block text-[12px] text-ink/55"><Localized>{product.short}</Localized></span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-fv-deep"><Localized>{"Im Fairvital Shop ansehen "}</Localized><ExternalLink className="size-3.5" aria-hidden="true" /></span>
                  </span>
                </a>
              ))}
            </div>
            <p className="mt-2 px-1 text-[12px] text-ink/50"><Localized>{"Einnahme bitte ärztlich abklären, besonders bei Vorerkrankungen oder Medikamenten."}</Localized></p>
          </section>
        )}
        {s.aiPlan && (
          <section className="pt-5" aria-label={translateText("Empfehlungen bei niedrigen Werten")}>
            <h2 className="px-1 text-[18px] font-semibold"><Localized>{"Deine niedrigen Werte"}</Localized></h2>
            <p className="mb-3 px-1 text-[13px] text-ink/55"><Localized>{"Ergänzungen und Alltagstipps passend zu deinen gemessenen Werten."}</Localized></p>
            {deficient.length ? <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {deficient.map((marker) => {
                const product = suggestions.find((entry) => entry.marker.id === marker.id)?.product;
                const expanded = openRoutine === marker.id;
                return <article key={marker.id} className="card-surface overflow-hidden p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 text-[17px] font-semibold"><Localized>{marker.name}</Localized></h3>
                    <span className="shrink-0 rounded-full bg-warn/15 px-2.5 py-1 text-[11px] font-semibold uppercase text-ink"><Localized>{"Niedrig"}</Localized></span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink/55"><Localized>{"Zuletzt gemessen: "}</Localized><Localized>{marker.history[marker.history.length - 1]?.value}</Localized> <Localized>{marker.unit}</Localized></p>
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="eyebrow"><Localized>{"Shop-Empfehlung"}</Localized></div>
                    {product ? <a href={product.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3">
                      <img src={product.image} alt={translateText(product.name)} className="size-16 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-border" loading="lazy" />
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-fv-deep underline underline-offset-4"><Localized>{product.name}</Localized></span>
                        <span className="mt-0.5 block text-[12px] text-ink/55"><Localized>{product.short}</Localized></span>
                        <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-fv-deep"><Localized>{"Im Fairvital Shop ansehen "}</Localized><ExternalLink className="size-3.5" aria-hidden="true" /></span>
                      </span>
                    </a> : <p className="mt-2 text-[14px] text-ink/55"><Localized>{"Keine passende Ergänzung zugeordnet."}</Localized></p>}
                    <p className="mt-2 text-[12px] text-ink/55"><Localized>{"Einnahme und mögliche Ursache bitte ärztlich abklären."}</Localized></p>
                  </div>
                  <div className="mt-4 border-t border-border pt-3">
                    <Button variant="ghost" onClick={() => setOpenRoutine(expanded ? null : marker.id)} aria-expanded={expanded} aria-controls={`routine-${marker.id}`}
                      className="h-auto w-full justify-between whitespace-normal px-0 py-2 text-left text-[14px] font-semibold text-fv-deep hover:bg-transparent"><Localized>{" Tipps für deinen Alltag "}</Localized><ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                    </Button>
                    {expanded && <div id={`routine-${marker.id}`} className="space-y-4 pb-1 pt-3">
                      {routineTips(marker).map((tip) => {
                        const TipIcon = icons[tip.icon];
                        return <div key={tip.title} className="flex items-start gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fv text-ink"><TipIcon className="size-5" aria-hidden="true" /></span>
                          <div className="min-w-0"><div className="text-[14px] font-semibold"><Localized>{tip.title}</Localized></div><p className="mt-1 text-[13px] leading-relaxed text-ink/65"><Localized>{tip.text}</Localized></p></div>
                        </div>;
                      })}
                      <p className="border-t border-border pt-3 text-[12px] text-ink/50"><Localized>{"Nachkontrolle in "}</Localized><Localized>{marker.retestWeeks}</Localized><Localized>{" Wochen – Zeitpunkt mit deiner Praxis abstimmen."}</Localized></p>
                    </div>}
                  </div>
                </article>;
              })}
            </div> : <p className="px-1 text-[13px] text-ink/55"><Localized>{"Aktuell keine Werte unter dem Zielbereich."}</Localized></p>}
          </section>
        )}
      </div>
    </AppShell>
  );
}
