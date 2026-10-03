import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Icon, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { status } from "@/lib/data";
import { todayKey } from "@/lib/daily-goals";
import { suggestedProducts } from "@/lib/plan-products";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Mein Plan — Fairvital Health" },
      { name: "description", content: "Dein persönlicher Plan mit Empfehlungen und Nachkontrollen." },
      { property: "og:title", content: "Mein Plan — Fairvital Health" },
      { property: "og:description", content: "Praktische Schritte und Nachkontrollen, auf dich abgestimmt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Plan,
});

function Plan() {
  const { s, set } = useStore();
  const [open, setOpen] = useState<number | null>(0);
  const recs = s.labs.map((m) => ({ m, st: status(m) }));
  const suggestions = suggestedProducts(s.aiPlan, s.labs);
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
                      <button onClick={() => toggleDone(i)} aria-label="Heute erledigt"
                        className={`grid size-7 shrink-0 place-items-center rounded-full ${done ? "bg-fv text-ink" : "ring-1 ring-border text-ink/30"}`}>
                        <Icon d="M4 12l5 5L20 6" className="size-4" />
                      </button>
                      <button onClick={() => setOpen(open === i ? null : i)} className="min-w-0 flex-1 text-left">
                        <div className={`text-[15px] font-medium ${done ? "text-ink/45 line-through" : ""}`}>{it.title}</div>
                      </button>
                      <span className="text-ink/30">{open === i ? "–" : "+"}</span>
                    </div>
                    {open === i && (
                      <div className="border-t px-3 py-3">
                        <p className="text-[14px] text-ink/65">{it.detail}</p>
                        <label className="mt-3 flex items-center justify-between text-[13px]">
                          <span>In meinen Tageszielen anzeigen</span>
                          <button onClick={() => toggleDaily(i)} role="switch" aria-checked={daily}
                            className={`h-6 w-11 rounded-full p-0.5 transition ${daily ? "bg-fv" : "bg-ink/15"}`}>
                            <span className={`block size-5 rounded-full bg-card transition ${daily ? "translate-x-5" : ""}`} />
                          </button>
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
          <section className="pt-3" aria-label="Fairvital Ergänzungen">
            <h2 className="px-1 text-[18px] font-semibold">Passende Fairvital Ergänzungen</h2>
            <p className="mb-3 px-1 text-[13px] text-ink/55">Optional zu Werten unter dem Zielbereich. Bitte die Einnahme ärztlich abklären.</p>
            {suggestions.length ? (
              <div className="space-y-2">
                {suggestions.map(({ marker, product }) => (
                  <div key={marker.id} className="card-surface p-4">
                    <div className="eyebrow">Zu deinem Wert: {marker.name}</div>
                    <div className="mt-1 text-[16px] font-semibold">{product.name}</div>
                    <p className="mt-1 text-[13px] text-ink/55">{product.short}</p>
                    <a href={product.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[14px] font-semibold text-fv-deep">Im Fairvital Shop ansehen →</a>
                  </div>
                ))}
              </div>
            ) : <p className="px-1 text-[13px] text-ink/55">Derzeit keine passende Ergänzung zu deinen Werten.</p>}
          </section>
        )}
        {recs.map(({ m, st }) => (
          <div key={m.id} className="card-surface p-5">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-medium">{m.name}</div>
              <span className="font-data text-[12px] uppercase tracking-normal text-ink/45">{st.label}</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-[14px] text-ink/70">
              <li>· Ernährung: {m.id === "omega" ? "2× pro Woche fetten Seefisch oder Leinöl" : m.id === "ferritin" ? "Hülsenfrüchte mit Vitamin-C-Quelle kombinieren" : "Regelmäßig Zeit im Tageslicht verbringen"}</li>
              <li>· Nachkontrolle in {m.retestWeeks} Wochen</li>
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
