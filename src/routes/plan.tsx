import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { products, status } from "@/lib/data";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Mein Plan — Fairvital Health" },
      { name: "description", content: "Dein persönlicher Plan mit Empfehlungen und Nachkontrollen." },
      { property: "og:title", content: "Mein Plan — Fairvital Health" },
      { property: "og:description", content: "Praktische Schritte und Nachkontrollen, auf dich abgestimmt." },
    ],
  }),
  component: Plan,
});

function Plan() {
  const { s } = useStore();
  const recs = s.labs.map((m) => ({ m, st: status(m), p: products.find((p) => p.relatedMarker === m.id) }));

  return (
    <AppShell>
      <PageHeader eyebrow="Plan" title="Dein persönlicher Plan" sub="Beispielhafte Empfehlungen auf Basis deiner Werte – keine medizinische Beratung." />
      <div className="space-y-3 px-4 pt-4">
        {s.aiPlan && (
          <div className="card-surface p-5">
            <div className="eyebrow">Aus deinem Befund vom {new Date(s.aiPlan.date).toLocaleDateString("de-DE")}</div>
            <ul className="mt-3 space-y-3">
              {s.aiPlan.items.map((it, i) => (
                <li key={i}>
                  <div className="text-[14px] font-medium">{it.title}</div>
                  <div className="text-[13px] text-ink/65">{it.detail}</div>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t pt-3 text-[11px] text-ink/40">Automatisch erstellt – keine Diagnose. Bitte mit deiner Ärztin oder deinem Arzt besprechen.</p>
          </div>
        )}
        {recs.map(({ m, st, p }) => (
          <div key={m.id} className="card-surface p-5">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-medium">{m.name}</div>
              <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/45">{st.label}</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-[13px] text-ink/70">
              <li>· Ernährung: {m.id === "omega" ? "2× pro Woche fetten Seefisch oder Leinöl" : m.id === "ferritin" ? "Hülsenfrüchte mit Vitamin-C-Quelle kombinieren" : "Regelmäßig Zeit im Tageslicht verbringen"}</li>
              <li>· Nachkontrolle in {m.retestWeeks} Wochen</li>
            </ul>
            {p && (
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-[11px] text-ink/45">Optional: {p.name}</span>
                <a href={p.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-fv-deep">fairvital.com →</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
