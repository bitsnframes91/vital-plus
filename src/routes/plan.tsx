import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Clock3, ExternalLink, HeartPulse, Salad, Sun, Footprints } from "lucide-react";
import { AppShell, Icon, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { status } from "@/lib/data";
import { todayKey } from "@/lib/daily-goals";
import { suggestedProducts } from "@/lib/plan-products";
import { routineTips, type RoutineTip } from "@/lib/deficiency-routines";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Mein Plan — Vivo" },
      { name: "description", content: "Dein persönlicher Plan mit Schritten für heute und Empfehlungen zu niedrigen Laborwerten." },
      { property: "og:title", content: "Mein Plan — Vivo" },
      { property: "og:description", content: "Praktische Schritte und Empfehlungen zu niedrigen Laborwerten, auf dich abgestimmt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Plan,
});

function Plan() {
  const { s, set } = useStore();
  const [open, setOpen] = useState<number | null>(0);
  const [openRoutine, setOpenRoutine] = useState<string | null>(null);
  const deficient = s.labs.filter((m) => m.history.length && status(m).label === "Niedrig");
  const suggestions = suggestedProducts(s.aiPlan, s.labs);
  const icons = { food: Salad, sun: Sun, walk: Footprints, clock: Clock3, heart: HeartPulse } satisfies Record<RoutineTip["icon"], typeof Salad>;
  const d = todayKey();
  const items = s.aiPlan?.items ?? [];
  const doneCount = items.filter((_, i) => s.actionsDone[`${d}:plan-${i}`]).length;
  const toggleDaily = (i: number) =>
    s.aiPlan && set({ aiPlan: { ...s.aiPlan, items: items.map((it, j) => (j === i ? { ...it, daily: it.daily === false } : it)) } });
  const toggleDone = (i: number) => {
    const k = `${d}:plan-${i}`;
    set({ actionsDone: { ...s.actionsDone, [k]: !s.actionsDone[k] } });
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Plan" title="Dein persönlicher Plan" sub="Auf Basis deines Laborbefunds – keine medizinische Beratung." />
      <div className="space-y-3 px-4 pt-4">
        {!s.aiPlan && (
          <Link to="/labor" className="card-surface block p-5">
            <div className="text-[16px] font-semibold">Noch kein persönlicher Plan</div>
            <p className="mt-1 text-[14px] text-ink/60">Lade deinen Laborbefund als PDF hoch. Daraus erstellen wir deinen Plan und deine Tagesziele.</p>
            <span className="mt-2 inline-block text-[14px] font-semibold text-fv-deep">Befund hochladen →</span>
          </Link>
        )}
        {s.aiPlan && (
          <div className="card-surface p-5">
            <div className="flex items-baseline justify-between">
              <div className="eyebrow">Befund vom {new Date(s.aiPlan.date).toLocaleDateString("de-DE")}</div>
              <span className="font-data text-[12px] text-fv-deep">heute {doneCount}/{items.length}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-fv transition-all" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {items.map((it, i) => {
                const done = !!s.actionsDone[`${d}:plan-${i}`];
                const daily = it.daily !== false;
                return (
                  <li key={i} className="rounded-[14px] ring-1 ring-border">
                    <div className="flex items-center gap-3 px-3 py-3">
                      <Button variant="ghost" size="icon" onClick={() => toggleDone(i)} aria-label="Heute erledigt"
                        className={`size-7 shrink-0 rounded-full ${done ? "bg-fv text-ink" : "ring-1 ring-border text-ink/30"}`}>
                        <Icon d="M4 12l5 5L20 6" className="size-4" />
                      </Button>
                      <Button variant="ghost" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-0 text-left hover:bg-transparent">
                        <div className={`text-[15px] font-medium ${done ? "text-ink/45 line-through" : ""}`}>{it.title}</div>
                      </Button>
                      <span className="text-ink/30">{open === i ? "–" : "+"}</span>
                    </div>
                    {open === i && (
                      <div className="border-t px-3 py-3">
                        <p className="text-[14px] text-ink/65">{it.detail}</p>
                        <label className="mt-3 flex items-center justify-between text-[13px]">
                          <span>In meinen Tageszielen anzeigen</span>
                          <Button variant="ghost" size="icon" onClick={() => toggleDaily(i)} role="switch" aria-label="In meinen Tageszielen anzeigen" aria-checked={daily}
                            className={`h-6 w-11 rounded-full p-0.5 transition ${daily ? "bg-fv" : "bg-ink/15"}`}>
                            <span className={`block size-5 rounded-full bg-card transition ${daily ? "translate-x-5" : ""}`} />
                          </Button>
                        </label>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t pt-3 text-[12px] text-ink/40">Automatisch erstellt – keine Diagnose. Bitte mit deiner Ärztin oder deinem Arzt besprechen.</p>
          </div>
        )}
        {s.aiPlan && (
          <section className="pt-5" aria-label="Empfehlungen bei niedrigen Werten">
            <h2 className="px-1 text-[18px] font-semibold">Deine niedrigen Werte</h2>
            <p className="mb-3 px-1 text-[13px] text-ink/55">Ergänzungen und Alltagstipps passend zu deinen gemessenen Werten.</p>
            {deficient.length ? <div className="space-y-3">
              {deficient.map((marker) => {
                const product = suggestions.find((entry) => entry.marker.id === marker.id)?.product;
                const expanded = openRoutine === marker.id;
                return <article key={marker.id} className="card-surface overflow-hidden p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 text-[17px] font-semibold">{marker.name}</h3>
                    <span className="shrink-0 rounded-full bg-warn/15 px-2.5 py-1 text-[11px] font-semibold uppercase text-ink">Niedrig</span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink/55">Zuletzt gemessen: {marker.history[marker.history.length - 1]?.value} {marker.unit}</p>
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="eyebrow">Fairvital Ergänzung</div>
                    {product ? <a href={product.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-between gap-2 text-[15px] font-semibold text-fv-deep underline underline-offset-4">
                      <span>{product.name} im Fairvital Shop ansehen</span><ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                    </a> : <p className="mt-2 text-[14px] text-ink/55">Keine passende Ergänzung zugeordnet.</p>}
                    <p className="mt-2 text-[12px] text-ink/55">Einnahme und mögliche Ursache bitte ärztlich abklären.</p>
                  </div>
                  <div className="mt-4 border-t border-border pt-3">
                    <Button variant="ghost" onClick={() => setOpenRoutine(expanded ? null : marker.id)} aria-expanded={expanded} aria-controls={`routine-${marker.id}`}
                      className="h-auto w-full justify-between whitespace-normal px-0 py-2 text-left text-[14px] font-semibold text-fv-deep hover:bg-transparent">
                      Tipps für deinen Alltag <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                    </Button>
                    {expanded && <div id={`routine-${marker.id}`} className="space-y-4 pb-1 pt-3">
                      {routineTips(marker).map((tip) => {
                        const TipIcon = icons[tip.icon];
                        return <div key={tip.title} className="flex items-start gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fv/10 text-fv-deep"><TipIcon className="size-5" aria-hidden="true" /></span>
                          <div className="min-w-0"><div className="text-[14px] font-semibold">{tip.title}</div><p className="mt-1 text-[13px] leading-relaxed text-ink/65">{tip.text}</p></div>
                        </div>;
                      })}
                      <p className="border-t border-border pt-3 text-[12px] text-ink/50">Nachkontrolle in {marker.retestWeeks} Wochen – Zeitpunkt mit deiner Praxis abstimmen.</p>
                    </div>}
                  </div>
                </article>;
              })}
            </div> : <p className="px-1 text-[13px] text-ink/55">Aktuell keine Werte unter dem Zielbereich.</p>}
          </section>
        )}
      </div>
    </AppShell>
  );
}
