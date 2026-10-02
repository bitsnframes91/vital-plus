import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/ernaehrung")({
  head: () => ({
    meta: [
      { title: "Ernährung — Fairvital Health" },
      { name: "description", content: "Mahlzeiten erfassen und Protein im Blick behalten – ohne Kalorienzählen." },
      { property: "og:title", content: "Ernährung — Fairvital Health" },
      { property: "og:description", content: "Mahlzeiten einfach erfassen und Ernährungsqualität verstehen." },
    ],
  }),
  component: Nutrition,
});

const labels = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];

function Nutrition() {
  const { s, set } = useStore();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("Abendessen");
  const [protein, setProtein] = useState("");
  const total = s.meals.reduce((a, m) => a + m.protein, 0);
  const goal = 90;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const time = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    set({ meals: [...s.meals, { id: crypto.randomUUID(), label, name, protein: Number(protein) || 0, time }] });
    setName(""); setProtein("");
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Ernährung" title="Was hast du heute gegessen?" sub="Qualität statt Kalorien: Wir achten auf Protein, Gemüse und Regelmäßigkeit." />
      <div className="space-y-4 px-4 pt-4">
        <div className="card-surface p-5">
          <div className="eyebrow">Protein heute</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-data text-[26px] font-medium">{total}</span>
            <span className="font-data text-[12px] text-ink/45">/ {goal} g</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-fv" style={{ width: `${Math.min(100, (total / goal) * 100)}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          {s.meals.map((m) => (
            <div key={m.id} className="card-surface flex items-center gap-3 rounded-[16px] px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-data text-[10px] uppercase tracking-[0.14em] text-fv-deep">{m.label}</div>
                <div className="text-[14px] font-medium">{m.name}</div>
                <div className="font-data text-[11px] text-ink/45">{m.protein} g Protein</div>
              </div>
              <span className="font-data text-[10px] text-ink/30">{m.time}</span>
              <button onClick={() => set({ meals: s.meals.filter((x) => x.id !== m.id) })} className="text-ink/30" aria-label="Entfernen">×</button>
            </div>
          ))}
        </div>

        <form onSubmit={add} className="card-surface space-y-3 p-5">
          <div className="eyebrow">Mahlzeit hinzufügen</div>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => (
              <button type="button" key={l} onClick={() => setLabel(l)} className={`rounded-full px-3 py-1 text-[12px] ring-1 ring-border ${label === l ? "bg-ink text-on-ink" : ""}`}>{l}</button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lachs mit Ofengemüse" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="numeric" placeholder="Protein in g (optional)" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="w-full rounded-full bg-ink py-2.5 text-sm font-medium text-on-ink">Speichern</button>
        </form>
      </div>
    </AppShell>
  );
}
