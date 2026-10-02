import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader, Sparkbars } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { fmtDate, status } from "@/lib/data";

export const Route = createFileRoute("/labor")({
  head: () => ({
    meta: [
      { title: "Laborwerte — Fairvital Health" },
      { name: "description", content: "Laborwerte erfassen, Verlauf verstehen und Nachkontrollen planen." },
      { property: "og:title", content: "Laborwerte — Fairvital Health" },
      { property: "og:description", content: "Deine Blutwerte im Verlauf – verständlich erklärt." },
    ],
  }),
  component: Labs,
});

function Labs() {
  const { s, set } = useStore();
  const [marker, setMarker] = useState(s.labs[0].id);
  const [value, setValue] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(value.replace(",", "."));
    if (isNaN(v)) return;
    const date = new Date().toISOString().slice(0, 10);
    set({ labs: s.labs.map((l) => (l.id === marker ? { ...l, history: [...l.history, { date, value: v }] } : l)) });
    setValue("");
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Labor" title="Deine Laborwerte" sub="Werte erfassen, Verlauf sehen, Nachkontrolle nicht vergessen." />
      <div className="space-y-3 px-4 pt-4">
        {s.labs.map((m) => {
          const vals = m.history.map((h) => h.value);
          const last = m.history[m.history.length - 1];
          const st = status(m);
          return (
            <div key={m.id} className="card-surface p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="eyebrow">{m.name}</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-data text-[24px] font-medium">{last.value}</span>
                    <span className="font-data text-[12px] text-ink/45">{m.unit}</span>
                  </div>
                  <div className="text-[11px] text-ink/45">Ziel {m.target[0]}–{m.target[1]} · {fmtDate(last.date)}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 font-data text-[10px] uppercase tracking-[0.14em] ${st.tone === "ok" ? "bg-fv/10 text-fv-deep" : "bg-warn/15 text-ink"}`}>{st.label}</span>
              </div>
              <div className="mt-4"><Sparkbars values={vals} max={m.target[1]} /></div>
              <p className="mt-3 border-t pt-3 text-[12px] text-ink/55">{m.note} Nachkontrolle in {m.retestWeeks} Wochen.</p>
            </div>
          );
        })}

        <form onSubmit={add} className="card-surface space-y-3 p-5">
          <div className="eyebrow">Neuen Wert eintragen</div>
          <select value={marker} onChange={(e) => setMarker(e.target.value)} className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none">
            {s.labs.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.unit})</option>)}
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="Wert" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="w-full rounded-full bg-ink py-2.5 text-sm font-medium text-on-ink">Speichern</button>
        </form>

        <p className="px-1 text-[11px] text-ink/40">Hinweis: Fairvital Health stellt keine Diagnosen. Bitte besprich auffällige Werte mit deiner Ärztin oder deinem Arzt. Labor-Anbindung folgt.</p>
      </div>
    </AppShell>
  );
}
