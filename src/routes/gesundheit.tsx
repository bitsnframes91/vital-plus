import { calcBmi, bmiCategory, stepGoalFor } from "@/lib/bmi";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import healthRidge from "@/assets/gesundheit-ridge.jpg.asset.json";
import { ChevronRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gesundheit")({
  head: () => ({
    meta: [
      { title: "Gesundheit — Vivo" },
      { name: "description", content: "Messwerte und Verläufe verständlich an einem Ort: Blutwerte, Gewicht, Körperdaten, Schlaf, Schritte und Trends." },
      { property: "og:title", content: "Gesundheit — Vivo" },
      { property: "og:description", content: "Messwerte und Verläufe verständlich an einem Ort." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: healthRidge.url },
      { name: "twitter:image", content: healthRidge.url },
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
function HealthTrends() {
  const metrics = [
    { name: "Bewegung", unit: "kcal/Tag", color: "text-trend-move", soft: "bg-trend-move-soft" },
    { name: "Distanz", unit: "km/Tag", color: "text-trend-distance", soft: "bg-trend-distance-soft" },
    { name: "Gehtempo", unit: "min/km", color: "text-trend-walk", soft: "bg-trend-walk-soft" },
    { name: "Lauftempo", unit: "min/km", color: "text-trend-run", soft: "bg-trend-run-soft" },
  ];
  return (
    <section aria-labelledby="health-trends-title" className="card-surface p-5 text-trend-foreground sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="health-trends-title" className="text-[26px] font-bold">Trends</h2>
            <Button asChild variant="ghost" size="icon" className="rounded-full bg-trend-control text-trend-foreground hover:bg-trend-control/80 hover:text-trend-foreground">
              <Link to="/trends" aria-label="Details zu Trends">
              <ChevronRight className="!size-6" />
              </Link>
            </Button>
      </div>
      <div className="mt-6 space-y-7">
        {metrics.map((metric) => (
          <div key={metric.name} className="flex items-center gap-4">
            <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-full ${metric.soft} ${metric.color}`}>
              <Minus className="size-7" strokeWidth={4} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[22px] font-medium leading-tight">{metric.name}</h3>
              <p aria-label={`${metric.name}: noch keine Daten`} className={`mt-1 flex flex-wrap items-baseline gap-1.5 ${metric.color}`}>
                <span className="text-[30px] font-semibold leading-tight">–/–</span>
                <span className="text-[18px] font-semibold">{metric.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NumInput({ value, onSave, placeholder, unit, onDraftChange }: { value: number | null; onSave: (v: number | null) => void; placeholder: string; unit: string; onDraftChange?: (text: string) => void }) {
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
        onChange={(e) => {
          setText(e.target.value);
          onDraftChange?.(e.target.value);
        }}
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
  // Live drafts so BMI and its color react while typing, before saving.
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const toNum = (t: string | null, stored: number | null): number | null => {
    if (t == null) return stored;
    const n = Number(t.replace(",", "."));
    return t.trim() && !isNaN(n) && n > 0 ? n : null;
  };
  const liveWeight = toNum(weightDraft, b.weightKg);
  const liveHeight = toNum(heightDraft, b.heightCm ?? null);
  const bmi = calcBmi(liveWeight, liveHeight);
  const cat = bmi != null ? bmiCategory(bmi) : null;
  const goal = stepGoalFor(bmi);

  return (
    <AppShell>
      <PageHeader eyebrow="Gesundheit" title="Deine Messwerte" sub="Messwerte und Verläufe verständlich an einem Ort." subClass="max-w-[17ch]" image={healthRidge.url} imageAlt="Läuferin in Bewegung auf einem alpinen Grat vor verschneiten Bergen" imageOverlay="ridge-image-overlay" />
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
          <NumInput value={b.weightKg} onSave={(v) => setBody({ weightKg: v, stepGoal: stepGoalFor(calcBmi(v, b.heightCm ?? null)) })} placeholder="z. B. 72,5" unit="kg" />
        </div>

        <div className="card-surface p-5">
          <div className="flex justify-center"><IconBody /></div>
          <div className="mt-2 text-[18px] font-semibold">Körperdaten</div>
          <p className="mt-1 text-[14px] text-ink/55">
            {b.waistCm ? `Taillenumfang: ${b.waistCm} cm` : "Gewicht, Taillenumfang und weitere manuelle Messwerte."}
          </p>
          <p className="mt-1 text-[14px] text-ink/55">{b.heightCm ? `Größe: ${b.heightCm} cm` : "Größe noch nicht erfasst"}</p>
          {bmi != null && cat && (
            <p className={`mt-1 text-[15px] font-semibold ${cat.className}`}>BMI {bmi.toFixed(1).replace(".", ",")} · {cat.label}</p>
          )}
          <NumInput value={b.heightCm ?? null} onSave={(v) => setBody({ heightCm: v, stepGoal: stepGoalFor(calcBmi(b.weightKg, v)) })} placeholder="Größe" unit="cm" />
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
          {b.stepGoal ? <p className="mt-1 text-[14px] text-ink/55">Dein Tagesziel: {b.stepGoal.toLocaleString("de-DE")} Schritte (aus deinem BMI)</p> : null}
          <NumInput value={b.steps ?? b.stepGoal ?? null} onSave={(v) => setBody({ steps: v })} placeholder="z. B. 8000" unit="Speichern" />
        </div>

        <HealthTrends />

        <div className="rounded-[20px] border border-dashed p-5 text-[13px] text-ink/50">
          <div className="eyebrow mb-1">Bald verfügbar</div>
          Apple Health, Google Health Connect und Wearables als automatische Datenquellen.
        </div>
      </div>
    </AppShell>
  );
}
