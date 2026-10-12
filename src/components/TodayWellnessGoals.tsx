import { Link } from "@tanstack/react-router";
import { ChevronRight, Droplets, Moon, Salad, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { todayKey } from "@/lib/daily-goals";
import { progressTone, wellnessProgress } from "@/lib/wellness-progress";
import { StepsIcon } from "./StepsIcon";
import { Localized, useLanguage } from "./Localized";
import { translateText } from "@/lib/language";
import goalsGfx from "@/assets/tagesziele.png.asset.json";

function ProgressRing({ percent, large = false, label, toneOverride }: { percent: number | null; large?: boolean; label: string; toneOverride?: ReturnType<typeof progressTone> }) {
  const [arc, setArc] = useState(0);
  useEffect(() => { setArc(percent ?? 0); }, [percent]);
  const tone = toneOverride ?? progressTone(percent);
  const color = { low: "text-goal-low", partial: "text-goal-partial", good: "text-goal-good", missing: "text-muted-foreground" }[tone];
  return <div role="progressbar" aria-label={translateText(label)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent === null ? undefined : Math.round(percent)} aria-valuetext={percent === null ? translateText("Noch keine Daten") : `${Math.round(percent)} %`} className={`relative shrink-0 ${large ? "size-44" : "size-[76px]"}`}>
    <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="7" className="text-goal-track" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="7" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - arc} className={`goal-progress-arc ${color}`} />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className={`${large ? "text-[36px]" : "text-[17px]"} font-bold leading-none text-foreground`}>{percent === null ? "—" : `${Math.round(percent)}%`}</span>
      {large && <span className="mt-2 text-[11px] text-muted-foreground"><Localized>{percent === null ? "Noch keine Daten" : "heute erreicht"}</Localized></span>}
    </div>
  </div>;
}

const STEP_GOAL = 10000;
/** Steps: under a quarter walked is red, otherwise yellow until the full 10.000 are done, then green. */
export function stepsTone(percent: number | null): ReturnType<typeof progressTone> {
  if (percent === null) return "missing";
  return percent >= 100 ? "good" : percent < 25 ? "low" : "partial";
}

export function TodayWellnessGoals() {
  useLanguage();
  const { s } = useStore();
  const [day, setDay] = useState(todayKey);
  useEffect(() => { const timer = setInterval(() => setDay(todayKey()), 30000); return () => clearInterval(timer); }, []);
  const meals = s.meals.filter(meal => meal.date === day);
  const result = wellnessProgress(meals, s.body, s.waterLog[day], { steps: s.body.steps, stepGoal: STEP_GOAL, sleepHours: s.body.sleepHours, sleepGoal: 8 });
  const stepsLeft = Math.max(0, STEP_GOAL - (s.body.steps ?? 0));
  const [nutrition, steps, sleep, micro, water] = result.values;
  const number = (value: number) => value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const tiles = [
    { key: "nutrition", title: "Ernährung", icon: Salad, percent: nutrition ?? null, to: "/ernaehrung" as const, detail: result.targets ? `${number(result.protein)} / ${number(result.targets.protein)} g Protein` : "Persönlicher Richtwert fehlt", sub: result.targets ? `${number(result.fiber)} / ${result.targets.fiber} g Ballaststoffe` : "Körperdaten ergänzen" },
    { key: "steps", title: "Schritte noch zu gehen", icon: StepsIcon, percent: steps ?? null, to: "/gesundheit" as const, detail: stepsLeft ? `${stepsLeft.toLocaleString("de-DE")} Schritte` : "Tagesziel erreicht", sub: `${(s.body.steps ?? 0).toLocaleString("de-DE")} / 10.000 gegangen`, tone: stepsTone(steps ?? null) },
    { key: "sleep", title: "Schlaf", icon: Moon, percent: sleep ?? null, to: "/gesundheit" as const, detail: `${number(s.body.sleepHours ?? 0)} / 8 h`, sub: "Schlaf letzte Nacht" },
    { key: "micro", title: "Vitamine & Mineralstoffe", icon: Sprout, percent: micro ?? null, to: "/ernaehrung/vitamine" as const, detail: `${result.microKnown} / ${result.microTotal} Nährstoffe erfasst`, sub: "Geschätzt · EU-Erwachsenenreferenz" },
    { key: "water", title: "Wasser", icon: Droplets, percent: water ?? null, to: "/ernaehrung" as const, detail: `${number(s.waterLog[day] ?? 0)} / 2,0 Liter`, sub: "Genug getrunken?" },
  ];
  const tone = progressTone(result.overall.percent);
  const surface = { low: "goal-surface-low", partial: "goal-surface-partial", good: "goal-surface-good", missing: "goal-surface-missing" }[tone];
  return <section className="bg-card px-4 pb-6 pt-2" aria-label="Tagesziele" data-wellness-dashboard>
    <div className="flex items-center gap-2 px-1"><img src={goalsGfx.url} alt="" className="vivo-bounce size-7 object-contain" /><h2 className="text-[21px] font-bold"><Localized>{"Tagesziele"}</Localized></h2></div>
    <div className={`goal-surface ${surface} goal-tile mx-1 mb-4 flex flex-col items-center px-3 py-5`}>
      <ProgressRing percent={result.overall.percent} label="Tagesziele" large />
      <p className="mt-3 text-[12px] font-semibold text-muted-foreground"><Localized>{result.overall.available === 5 ? "5 von 5 Kategorien erfasst" : `Zwischenstand · ${result.overall.available} von 5 Kategorien erfasst`}</Localized></p>
    </div>
    <div className="grid grid-cols-2 gap-3 min-[420px]:gap-4">
      {tiles.map(tile => <Link key={tile.key} to={tile.to} data-goal-category={tile.key} className={`goal-tile group min-w-0 bg-card p-3.5 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring ${tile.key === "water" ? "col-span-2 flex items-center justify-between gap-4" : "flex flex-col"}`}>
        <div className="min-w-0"><div className="flex items-center justify-between gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-fresh-soft text-fv-deep"><tile.icon className="size-5" /></span><ChevronRight className="size-3.5 text-muted-foreground" /></div><h3 className="mt-2 text-[13px] font-bold leading-snug"><Localized>{tile.title}</Localized></h3></div>
        <div className={`flex items-center justify-center ${tile.key === "water" ? "order-last" : "my-3"}`}><ProgressRing percent={tile.percent} label={tile.title} toneOverride={"tone" in tile ? tile.tone : undefined} /></div>
        <div className="min-w-0"><p className="text-[11px] font-semibold leading-relaxed"><Localized>{tile.percent === null ? "Noch keine Daten" : tile.detail}</Localized></p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground"><Localized>{tile.sub}</Localized></p></div>
      </Link>)}
    </div>
    <p className="mt-4 px-1 text-[10px] leading-relaxed text-muted-foreground"><Localized>{"Tägliche Zielerfüllung, keine medizinische Bewertung. Jede Kategorie zählt zu 20 %. Nicht erfasste Kategorien bleiben offen."}</Localized></p>
  </section>;
}