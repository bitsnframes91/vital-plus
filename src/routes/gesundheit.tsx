import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import healthRidge from "@/assets/gesundheit-ridge.jpg.asset.json";

export const Route = createFileRoute("/gesundheit")({
  head: () => ({
    meta: [
      { title: "Gesundheit — Vivo" },
      { name: "description", content: "Messwerte und Verläufe verständlich an einem Ort: Blutwerte, Gewicht, Körperdaten, Schlaf, Schritte und Trends." },
      { property: "og:title", content: "Gesundheit — Vivo" },
      { property: "og:description", content: "Messwerte und Verläufe verständlich an einem Ort." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Health,
});

function IconScale() {
  return (
    <svg className="size-6 text-fv-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M8 21h8M12 6l-6 7h12l-6-7zM6 13a3 3 0 0 0 6 0M12 13a3 3 0 0 0 6 0" />
    </svg>
  );
}
function IconBody() {
  return (
    <svg className="size-6 text-fv-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" /><path d="M12 8v6M8 10l4-2 4 2M9 21l3-7 3 7" />
    </svg>
  );
}
function IconSteps() {
  return (
    <svg className="size-6 text-fv-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="1.6" /><path d="M13 7l-3 5 3 3v6M10 12l-3 2M13 7l3 3 3 1" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg className="size-6 text-fv-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
    </svg>
  );
}

function NumInput({ value, onSave, placeholder, unit }: { value: number | null; onSave: (v: number | null) => void; placeholder: string; unit: string }) {
  const [text, setText] = useState(value?.toString() ?? "");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(text.replace(",", "."));
        onSave(text.trim() && !isNaN(n) ? n : null);
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <button className="shrink-0 rounded-full bg-ink px-4 text-[13px] font-medium text-on-ink">{unit}</button>
    </form>
  );
}

function Health() {
  const { s, set } = useStore();
  const b = s.body;
  const setBody = (p: Partial<typeof b>) => set({ body: { ...b, ...p } });

  return (
    <AppShell>
      <PageHeader eyebrow="Gesundheit" title="Deine Messwerte" sub="Messwerte und Verläufe verständlich an einem Ort." image={healthRidge.url} imageAlt="Läuferin in Bewegung auf einem alpinen Grat vor verschneiten Bergen" imageOverlay="ridge-image-overlay" />
      <div className="grid grid-cols-1 gap-3 px-4 pt-4">
        <div className="card-surface p-5">
          <div className="text-[18px] font-semibold">Blutwerte</div>
          <p className="mt-1 text-[14px] text-ink/55">Laborwerte manuell erfassen und zeitlich vergleichen.</p>
          <Link to="/labor" className="mt-2 inline-block text-[15px] font-semibold text-fv-deep">Meine Blutwerte →</Link>
        </div>

        <div className="card-surface p-5">
          <div className="flex justify-center"><IconScale /></div>
          <div className="mt-2 text-[18px] font-semibold">Gewicht</div>
          <p className="mt-1 text-[14px] text-ink/55">{b.weightKg ? `Aktuell: ${b.weightKg} kg` : "Noch keine Messung"}</p>
          <NumInput value={b.weightKg} onSave={(v) => setBody({ weightKg: v })} placeholder="z. B. 72,5" unit="kg" />
        </div>

        <div className="card-surface p-5">
          <div className="flex justify-center"><IconBody /></div>
          <div className="mt-2 text-[18px] font-semibold">Körperdaten</div>
          <p className="mt-1 text-[14px] text-ink/55">
            {b.waistCm ? `Taillenumfang: ${b.waistCm} cm` : "Gewicht, Taillenumfang und weitere manuelle Messwerte."}
          </p>
          <NumInput value={b.waistCm} onSave={(v) => setBody({ waistCm: v })} placeholder="Taillenumfang" unit="cm" />
        </div>

        <div className="card-surface p-5">
          <div className="text-[18px] font-semibold">Schlaf letzte Nacht</div>
          <p className="mt-1 text-[14px] text-ink/55">
            {b.sleepHours ? `Erfasst: ${b.sleepHours} h` : "Noch keine Schlafdaten vorhanden. Du kannst Schlaf manuell erfassen oder eine Datenquelle vorbereiten."}
          </p>
          <NumInput value={b.sleepHours} onSave={(v) => setBody({ sleepHours: v })} placeholder="Stunden, z. B. 7,5" unit="h" />
        </div>

        <div className="card-surface p-5">
          <div className="flex justify-center"><IconSteps /></div>
          <div className="mt-2 text-[18px] font-semibold">Schritte heute</div>
          <p className="mt-1 text-[14px] text-ink/55">
            {b.steps ? `Heute: ${b.steps.toLocaleString("de-DE")} Schritte` : "Noch keine Schritte für heute. Manuelle Eingabe ist jederzeit möglich."}
          </p>
          <NumInput value={b.steps} onSave={(v) => setBody({ steps: v })} placeholder="z. B. 8000" unit="Speichern" />
        </div>

        <div className="card-surface p-5">
          <div className="flex justify-center"><IconTrend /></div>
          <div className="mt-2 text-[18px] font-semibold">Trends</div>
          <p className="mt-1 text-[14px] text-ink/55">Entwicklungen über Zeit – sachlich, ohne Ursachenbehauptung.</p>
        </div>

        <div className="rounded-[20px] border border-dashed p-5 text-[13px] text-ink/50">
          <div className="eyebrow mb-1">Bald verfügbar</div>
          Apple Health, Google Health Connect und Wearables als automatische Datenquellen.
        </div>
      </div>
    </AppShell>
  );
}
