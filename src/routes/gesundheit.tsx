import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/gesundheit")({
  head: () => ({
    meta: [
      { title: "Gesundheit & Supplemente — Fairvital Health" },
      { name: "description", content: "Deine aktuellen Vitalstoffe, Ziele und Gesundheitsdaten an einem Ort." },
      { property: "og:title", content: "Gesundheit & Supplemente — Fairvital Health" },
      { property: "og:description", content: "Supplemente verwalten und Gesundheitsziele verfolgen." },
    ],
  }),
  component: Health,
});

function Health() {
  const { s, set } = useStore();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    set({ supplements: [...s.supplements, { id: crypto.randomUUID(), name, dose: dose || "–", time: "morgens", fairvital: false }] });
    setName(""); setDose("");
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Gesundheit" title="Deine Ziele & Vitalstoffe" sub="Alles, was du aktuell einnimmst – auch Produkte anderer Hersteller." />
      <div className="space-y-4 px-4 pt-4">
        <div className="card-surface p-5">
          <div className="eyebrow">Deine Ziele</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.goals.map((g) => <span key={g} className="rounded-full bg-accent px-3 py-1 text-[12px] text-accent-foreground">{g}</span>)}
          </div>
        </div>

        <div>
          <div className="eyebrow px-1 pb-2">Aktuelle Supplemente</div>
          <div className="space-y-2">
            {s.supplements.map((x) => (
              <div key={x.id} className="card-surface flex items-center gap-3 rounded-[16px] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium">{x.name}</div>
                  <div className="font-data text-[11px] text-ink/45">{x.dose} · {x.time}</div>
                </div>
                {x.fairvital && <span className="rounded-full bg-fv/10 px-2 py-0.5 font-data text-[9px] uppercase tracking-[0.14em] text-fv-deep">Fairvital</span>}
                <button onClick={() => set({ supplements: s.supplements.filter((y) => y.id !== x.id) })} className="text-ink/30" aria-label="Entfernen">×</button>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={add} className="card-surface space-y-3 p-5">
          <div className="eyebrow">Supplement hinzufügen</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, z. B. Zink" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dosierung laut Packung" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="w-full rounded-full bg-ink py-2.5 text-sm font-medium text-on-ink">Hinzufügen</button>
        </form>

        <div className="rounded-[20px] border border-dashed p-5 text-[12px] text-ink/50">
          <div className="eyebrow mb-1">Bald verfügbar</div>
          Apple Health, Google Health Connect und Wearables.
        </div>
      </div>
    </AppShell>
  );
}
