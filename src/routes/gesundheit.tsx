import { AppleHealthSection } from "@/components/AppleHealth";
import { useHealthReadings } from "@/components/AppleHealthReadings";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { calcBmi, bmiCategory, stepGoalFor } from "@/lib/bmi";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HealthMascot } from "@/components/HealthMascot";
import { useStore, todayDateKey, dailyValue } from "@/lib/store";
import { StepsIcon } from "@/components/StepsIcon";
import sleepGfx from "@/assets/schlaf.png.asset.json";
import bodyGfx from "@/assets/koerperdaten.png.asset.json";
import { ChevronRight, Minus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gesundheit")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Gesundheit — Vital Plus" },
      { name: "description", content: "Messwerte und Verläufe verständlich an einem Ort: Gewicht, Körperdaten, Schlaf, Schritte und Trends." },
      { property: "og:title", content: "Gesundheit — Vital Plus" },
      { property: "og:description", content: "Messwerte und Verläufe verständlich an einem Ort." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Health,
});

/** Icon that opens the Gesundheitsprofil submenu in Profile on double tap (manual timing so mobile taps work too). */
function EditIcon({ label, children }: { label: string; children: React.ReactNode }) {
  useLanguage();
  const nav = useNavigate();
  const last = useRef(0);
  const open = () => nav({ to: "/profil/$section", params: { section: "personal" } });
  return (
    <div className="flex flex-col items-center">
      <button type="button" aria-label={translateText(`${label} im Gesundheitsprofil ändern (doppelt tippen)`)} onDoubleClick={open}
        onClick={() => { const t = Date.now(); if (t - last.current < 350) { last.current = 0; open(); } else last.current = t; }}
        className="grid size-11 place-items-center rounded-full bg-fresh text-ink transition active:scale-95"><Localized>{children}</Localized></button>
      <span className="mt-1 text-[11px] text-ink/55"><Localized>{"Doppelt tippen zum Ändern"}</Localized></span>
    </div>
  );
}

function HealthTrends() {
  useLanguage();
  const { today } = useHealthReadings();
  const metrics = [
    { name: "Bewegung", value: today?.steps, minDigits: 0, maxDigits: 0, unit: "Schritte", color: "text-trend-move", soft: "bg-trend-move-soft" },
    { name: "Distanz", value: today?.distanceKm, minDigits: 1, maxDigits: 2, unit: "km", color: "text-trend-distance", soft: "bg-trend-distance-soft" },
    { name: "Gehtempo", value: today?.walkingSpeedKmh, minDigits: 1, maxDigits: 1, unit: "km/h", color: "text-trend-walk", soft: "bg-trend-walk-soft" },
    { name: "Lauftempo", value: today?.runningSpeedKmh, minDigits: 1, maxDigits: 1, unit: "km/h", color: "text-trend-run", soft: "bg-trend-run-soft" },
  ];
  return (
    <section aria-labelledby="health-trends-title" className="card-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-fresh text-ink">
            <TrendingUp className="size-6" />
          </span>
          <h2 id="health-trends-title" className="text-[18px] font-semibold"><Localized>{"Trends"}</Localized></h2>
        </div>
        <Button asChild variant="ghost" size="icon" className="rounded-full bg-fresh text-ink hover:bg-fresh/90">
          <Link to="/trends" aria-label={translateText("Details zu Trends")}>
            <ChevronRight className="!size-6" />
          </Link>
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="flex items-center gap-3.5">
            <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-full ${metric.soft} ${metric.color}`}>
              <Minus className="size-5" strokeWidth={4} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-medium leading-tight text-ink"><Localized>{metric.name}</Localized></h3>
              <p className={`mt-0.5 flex flex-wrap items-baseline gap-1 text-[19px] font-semibold leading-tight ${metric.color}`}>
                <span>{metric.value == null ? "–/–" : metric.value.toLocaleString(languageLocale(), { minimumFractionDigits: metric.minDigits, maximumFractionDigits: metric.maxDigits })}</span>
                <span className="text-[13px] font-medium"><Localized>{metric.unit}</Localized></span>
              </p>
              {metric.value != null && <p className="text-[11px] text-muted-foreground">Apple Health</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NumInput({ value, onSave, placeholder, unit, onDraftChange }: { value: number | null; onSave: (v: number | null) => void; placeholder: string; unit: string; onDraftChange?: (text: string) => void }) {
  useLanguage();
  const [text, setText] = useState(value?.toString() ?? "");
  // Keep the field in sync when the stored value changes elsewhere (e.g. cleared).
  useEffect(() => {
    setText(value?.toString() ?? "");
  }, [value]);
  const save = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    onSave(raw.trim() && !isNaN(n) ? n : null);
  };
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save(text);
      }}
    >
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onDraftChange?.(e.target.value);
        }}
        onBlur={() => save(text)}
        inputMode="decimal"
        placeholder={translateText(placeholder)}
        className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <button className="shrink-0 rounded-full bg-fresh px-4 text-[13px] font-medium text-ink"><Localized>{unit}</Localized></button>
    </form>
  );
}

function Health() {
  useLanguage();
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
  // Daily counters reset at midnight: only values entered today count.
  const readings = useHealthReadings();
  // Steps come only from Apple Health; there is no manual step entry.
  const todaySteps = readings.today?.steps ?? null;
  const todaySleep = readings.sleepHours;
  // The doctor asks for whatever is still missing, in page order: Körperdaten, Schritte, Schlaf.
  const missingMessage = !b.weightKg || !b.heightCm
    ? "Gib deine Körperdaten ein."
    : !todaySleep ? "Gib deine Schlafstunden ein." : undefined;

  return (
    <AppShell>
      <header className="health-mascot-header relative overflow-hidden bg-card px-6 pb-8 pt-9">
        <div className="health-mascot-copy relative">
          <span className="font-data text-[12px] uppercase text-fv-deep"><Localized>Gesundheit</Localized></span>
          <h1 className="mt-4 text-[29px] font-bold leading-[1.15] text-foreground"><Localized>Deine Messwerte</Localized></h1>
          <p className="mt-3 text-sm text-muted-foreground"><Localized>Messwerte und Verläufe verständlich an einem Ort.</Localized></p>
        </div>
        <HealthMascot message={missingMessage} />
      </header>
      <div className="grid grid-cols-1 gap-3 px-4 pt-4 md:grid-cols-2">

        <div className="card-surface p-5">
          <EditIcon label={translateText("Körperdaten")}><img src={bodyGfx.url} alt="" className="object-contain size-7" /></EditIcon>
          <div className="mt-2 text-[18px] font-semibold"><Localized>{"Körperdaten"}</Localized></div>
          <p className="mt-1 text-[14px] text-ink/55"><Localized>{b.weightKg ? `Gewicht: ${b.weightKg} kg` : "Gewicht noch nicht erfasst"}</Localized></p>
          <p className="mt-1 text-[14px] text-ink/55"><Localized>{b.heightCm ? `Größe: ${b.heightCm} cm` : "Größe noch nicht erfasst"}</Localized></p>
          {bmi != null && cat && (
            <p className={`mt-1 text-[15px] font-semibold ${cat.className}`}><Localized>{"BMI "}</Localized><Localized>{bmi.toFixed(1).replace(".", ",")}</Localized><Localized>{" · "}</Localized><Localized>{cat.label}</Localized></p>
          )}
          <NumInput value={b.weightKg} onDraftChange={setWeightDraft} onSave={(v) => setBody({ weightKg: v, stepGoal: stepGoalFor(calcBmi(v, liveHeight)) })} placeholder={translateText("Gewicht")} unit="kg" />
          <NumInput value={b.heightCm ?? null} onDraftChange={setHeightDraft} onSave={(v) => setBody({ heightCm: v, stepGoal: stepGoalFor(calcBmi(liveWeight, v)) })} placeholder={translateText("Größe")} unit="cm" />
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2.5">
            <img src={sleepGfx.url} alt="" className="vivo-sway size-7" />
            <div className="text-[18px] font-semibold"><Localized>{"Schlaf letzte Nacht"}</Localized></div>
          </div>
          <p className="mt-1 text-[14px] text-ink/55">
            <Localized>{todaySleep != null ? `Erfasst: ${todaySleep.toLocaleString(languageLocale(), { maximumFractionDigits: 1 })} h` : "Noch keine Schlafdaten vorhanden. Du kannst Schlaf manuell erfassen oder eine Datenquelle vorbereiten."}</Localized>
          </p>
          {readings.sleepSource === "Apple Health" && <p className="mt-1 text-[11px] text-muted-foreground">Apple Health</p>}
          <NumInput value={dailyValue(b.sleepHours, b.sleepDate)} onSave={(v) => setBody({ sleepHours: v, sleepDate: todayDateKey() })} placeholder={translateText("Stunden, z. B. 7,5 (empfohlen: 8 h)")} unit="h" />
        </div>

        <div className="card-surface p-5">
          <EditIcon label={translateText("Alltag und Aktivität")}><StepsIcon /></EditIcon>
          <div className="mt-2 text-[18px] font-semibold"><Localized>{"Schritte heute"}</Localized></div>
          <p className="mt-1 text-[14px] text-ink/55">
            <Localized>{todaySteps != null ? `Heute: ${todaySteps.toLocaleString(languageLocale())} Schritte` : "Noch keine Schritte für heute."}</Localized>
          </p>
          {(goal ?? b.stepGoal) ? <p className="mt-1 text-[14px] text-ink/55"><Localized>{"Dein Tagesziel: "}</Localized><Localized>{(goal ?? b.stepGoal)?.toLocaleString(languageLocale())}</Localized><Localized>{" Schritte"}</Localized></p> : null}
          {todaySteps != null && <p className="mt-1 text-[11px] text-muted-foreground">Apple Health</p>}
        </div>

        <HealthTrends />
        <div className="md:col-span-2"><AppleHealthSection /></div>

        <div className="rounded-[20px] border border-dashed p-5 text-[13px] text-ink/50">
          <div className="eyebrow mb-1"><Localized>{"Bald verfügbar"}</Localized></div><Localized>{"Google Health Connect und Wearables als automatische Datenquellen."}</Localized></div>
      </div>
    </AppShell>
  );
}
