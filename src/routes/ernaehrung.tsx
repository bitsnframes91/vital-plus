import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { StatusFace, type StatusMood } from "@/components/StatusFace";
import { AppShell } from "@/components/AppShell";
import { NutritionMascot } from "@/components/NutritionMascot";
import { useStore } from "@/lib/store";
import { mealFromVoice, mealNutrition } from "@/lib/ai.functions";
import { mealFromPhoto } from "@/lib/food-photo.functions";
import { prepareFoodPhoto } from "@/lib/food-photo/image";
import { currentLanguage } from "@/lib/language";
import { Camera, LoaderCircle } from "lucide-react";
import { blobToBase64, recordWav } from "@/lib/record-wav";
import { Button } from "@/components/ui/button";
import { NutritionProfileFields } from "@/components/NutritionProfileFields";
import { nutrientStatus, nutritionTargets, type NutritionProfile } from "@/lib/nutrition-targets";
import type { Meal } from "@/lib/data";
import { micronutrientGaps, nutritionGaps } from "@/lib/nutrition-products";
import { micronutrientSummary } from "@/lib/micronutrients";
import { omegaSummary } from "@/lib/omega3";
import voiceCardBg from "@/assets/voice-card-bg.png";

export const Route = createFileRoute("/ernaehrung")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Ernährung — Vitalplus" },
      { name: "description", content: "Ernährungstagebuch: Mahlzeiten erfassen und Kalorien, Protein, Ballaststoffe, Kohlenhydrate und Fett im Blick behalten." },
      { property: "og:title", content: "Ernährung — Vitalplus" },
      { property: "og:description", content: "Mahlzeiten einfach erfassen und Nährwerte verstehen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Nutrition,
});

const labels = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toLocaleTimeString(languageLocale(), { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString(languageLocale(), { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

function Nutrition() {
  const isChild = useRouterState({ select: (state) => state.location.pathname.replace(/\/$/, "") !== "/ernaehrung" });
  return isChild ? <Outlet /> : <NutritionPage />;
}

function NutritionPage() {
  useLanguage();
  const { s, set } = useStore();
  const [profile, setProfile] = useState<NutritionProfile>({ age: s.body.age ?? null, sex: s.body.sex ?? null, activity: s.body.activity ?? null });
  const [name, setName] = useState("");
  const [label, setLabel] = useState("Abendessen");
  const [protein, setProtein] = useState("");
  const [kcal, setKcal] = useState("");
  const voice = useServerFn(mealFromVoice);
  const estimate = useServerFn(mealNutrition);
  const photoEstimate = useServerFn(mealFromPhoto);
  const photoInput = useRef<HTMLInputElement>(null);
  const estimateVersion = useRef(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoFill, setPhotoFill] = useState(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; estimateVersion.current++; }; }, []);
   type Est = Pick<Meal, "name" | "kcal" | "protein" | "fiber" | "carbs" | "fat" | "micronutrients" | "omega3Mg" | "omega6Mg" | "omega9Mg">;
  const [est, setEst] = useState<Est | null>(null);
  const [estBusy, setEstBusy] = useState(false);
  const [estErr, setEstErr] = useState<string | null>(null);
  const runEstimate = async (n: string): Promise<Est | null> => {
    const version = ++estimateVersion.current;
    setEstBusy(true); setEstErr(null);
    try {
      const r = await estimate({ data: { name: n } });
      if (!mounted.current || version !== estimateVersion.current) return null;
      if (!r.ok) { setEstErr(r.error); return null; }
      const e: Est = { name: n, kcal: r.kcal, protein: r.protein, fiber: r.fiber, carbs: r.carbs, fat: r.fat, micronutrients: r.micronutrients, omega3Mg: r.omega3Mg, omega6Mg: r.omega6Mg, omega9Mg: r.omega9Mg };
      setEst(e); setKcal(String(e.kcal)); setProtein(String(e.protein));
      return e;
    } catch { if (mounted.current && version === estimateVersion.current) setEstErr("Nährwerte konnten nicht berechnet werden."); return null; }
    finally { if (mounted.current && version === estimateVersion.current) setEstBusy(false); }
  };
  const readPhoto = async (file: File) => {
    const version = ++estimateVersion.current;
    setPhotoBusy(true); setEstBusy(false); setEstErr(null); setPhotoFill(0);
    try {
      const blob = await prepareFoodPhoto(file);
      const r = await photoEstimate({ data: { base64: await blobToBase64(blob), mimeType: "image/jpeg", language: currentLanguage() } });
      if (!mounted.current || version !== estimateVersion.current) return;
      if (!r.ok) { setEstErr(r.error); return; }
      const next: Est = { name: r.name, kcal: r.kcal, protein: r.protein, fiber: r.fiber, carbs: r.carbs, fat: r.fat };
      setEst(next); setName(next.name); setKcal(String(next.kcal)); setProtein(String(next.protein)); setPhotoFill(version);
    } catch (error) {
      if (mounted.current && version === estimateVersion.current) setEstErr(error instanceof Error ? error.message : "Das Foto konnte nicht ausgewertet werden.");
    } finally {
      if (mounted.current && version === estimateVersion.current) setPhotoBusy(false);
    }
  };
  useEffect(() => {
    const n = name.trim();
    if (photoBusy || n.length < 3 || est?.name === n) return;
    const t = setTimeout(() => { void runEstimate(n); }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, photoBusy]);
  const rec = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const [vs, setVs] = useState<"idle" | "rec" | "busy">("idle");
  const [vmsg, setVmsg] = useState<string | null>(null);

  const today = todayISO();
  const todayMeals = s.meals.filter((m) => m.date === today);
  const sum = (key: "kcal" | "protein" | "fiber" | "carbs" | "fat") => todayMeals.reduce((a, m) => a + (m[key] || 0), 0);
  const totals = { kcal: sum("kcal"), protein: sum("protein"), fiber: sum("fiber"), carbs: sum("carbs"), fat: sum("fat") };
  const targets = nutritionTargets(s.body);

  // Fill in missing nutrient estimates without replacing saved macro amounts.
  const sRef = useRef(s); sRef.current = s;
  const tried = useRef(new Set<string>());
  useEffect(() => {
    const missing = todayMeals.filter((m) => (!m.micronutrients || m.omega3Mg === undefined || m.omega6Mg === undefined || m.omega9Mg === undefined) && !tried.current.has(m.id));
    if (!missing.length) return;
    missing.forEach((m) => tried.current.add(m.id));
    void (async () => {
      const found: Record<string, Pick<Meal, "micronutrients" | "omega3Mg" | "omega6Mg" | "omega9Mg">> = {};
      for (const m of missing) {
        try { const r = await estimate({ data: { name: m.name } }); if (r.ok) found[m.id] = { micronutrients: m.micronutrients ?? r.micronutrients, omega3Mg: m.omega3Mg ?? r.omega3Mg, omega6Mg: m.omega6Mg ?? r.omega6Mg, omega9Mg: m.omega9Mg ?? r.omega9Mg }; } catch { /* keep unavailable */ }
      }
      if (Object.keys(found).length) set({ meals: sRef.current.meals.map((x) => found[x.id] ? { ...x, ...found[x.id] } : x) });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayMeals.map((m) => `${m.id}:${Boolean(m.micronutrients)}:${m.omega3Mg}:${m.omega6Mg}:${m.omega9Mg}`).join()]);

  // Diary: group meals by day, newest first.
  const days = [...new Set(s.meals.map((m) => m.date))].sort().reverse();

  const toggleVoice = async () => {
    setVmsg(null);
    if (vs === "idle") {
      try { rec.current = await recordWav(); setVs("rec"); }
      catch { setVmsg("Mikrofon nicht verfügbar. Bitte Zugriff erlauben."); }
      return;
    }
    if (vs !== "rec" || !rec.current) return;
    setVs("busy");
    try {
      const blob = await rec.current.stop();
      const r = await voice({ data: { base64: await blobToBase64(blob) } });
      if (!r.ok) { setVmsg(r.error); return; }
      const time = nowTime();
      const drinkMl = r.meals.reduce((a, m) => a + (m.drinkMl ?? 0), 0);
      const next: Partial<typeof s> = { meals: [...s.meals, ...r.meals.map((m) => ({ ...m, id: crypto.randomUUID(), time, date: today }))] };
      if (drinkMl > 0) next.waterLog = { ...s.waterLog, [today]: Math.round(((s.waterLog?.[today] ?? 0) + drinkMl / 1000) * 100) / 100 };
      set(next);
      setVmsg(`„${r.transcript}“ – ${r.meals.length} Mahlzeit${r.meals.length > 1 ? "en" : ""} hinzugefügt.${drinkMl > 0 ? ` ${Math.round(drinkMl)} ml Getränke gezählt.` : ""}`);
    } catch (e) {
      setVmsg(e instanceof Error ? e.message : "Aufnahme fehlgeschlagen.");
    } finally {
      rec.current = null;
      setVs("idle");
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || estBusy || photoBusy) return;
    let e2 = est?.name === n ? est : null;
    if (!e2) e2 = await runEstimate(n);
    const meal: Meal = {
      id: crypto.randomUUID(), label, name: n,
      protein: Number(protein.replace(",", ".")) || e2?.protein || 0, kcal: Number(kcal.replace(",", ".")) || e2?.kcal || 0,
      fiber: e2?.fiber ?? 0, carbs: e2?.carbs ?? 0, fat: e2?.fat ?? 0,
       micronutrients: e2?.micronutrients,
      omega3Mg: e2?.omega3Mg, omega6Mg: e2?.omega6Mg, omega9Mg: e2?.omega9Mg,
      time: nowTime(), date: today,
    };
    set({ meals: [...s.meals, meal] });
    setName(""); setProtein(""); setKcal(""); setEst(null); setPhotoFill(0);
  };

  const removeMeal = (id: string) => set({ meals: s.meals.filter((x) => x.id !== id) });

  const statCards = [
    { label: "Kalorien", key: "kcal", unit: "kcal" },
    { label: "Protein", key: "protein", unit: "g" },
    { label: "Ballaststoffe", key: "fiber", unit: "g" },
    { label: "Kohlenhydrate", key: "carbs", unit: "g" },
  ] as const;
  const feedback: Record<"good" | "near" | "bad", { color: string; mood: StatusMood; label: string }> = {
    good: { color: "text-bmi-good", mood: "good", label: "Im grünen Bereich" },
    near: { color: "text-nutrition-near", mood: "neutral", label: "Richtwert fast erreicht" },
    bad: { color: "text-bmi-bad", mood: "bad", label: "Deutlich vom Richtwert entfernt" },
  };
  const neutral: { color: string; mood: StatusMood; label: string } = { color: "text-muted-foreground", mood: "neutral", label: "Kein Richtwert gesetzt" };
  const format = (n: number) => n.toLocaleString(languageLocale(), { maximumFractionDigits: 1 });
  const gaps = nutritionGaps(totals, targets, s.meals.filter((m) => m.date === today).length);
  const microGaps = micronutrientGaps(s.meals.filter((m) => m.date === today));

  const omega = omegaSummary(todayMeals);

  const waterGoal = 2;
  const water = Math.round((s.waterLog?.[today] ?? 0) * 100) / 100;
  const waterMood: StatusMood = water >= waterGoal ? "good" : water >= 1.5 ? "neutral" : "bad";
  const waterColor = waterMood === "good" ? "text-bmi-good" : waterMood === "neutral" ? "text-nutrition-near" : "text-bmi-bad";
  const liters = (n: number) => n.toLocaleString(languageLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const addWater = (delta: number) => set({ waterLog: { ...s.waterLog, [today]: Math.max(0, Math.round(((s.waterLog?.[today] ?? 0) + delta) * 100) / 100) } });


  return (
    <AppShell>
      <header className="nutrition-mascot-header relative overflow-hidden bg-card px-6 pb-8 pt-9">
        <div className="nutrition-mascot-copy relative">
          <span className="font-data text-[12px] uppercase text-fv-deep"><Localized>Ernährung</Localized></span>
          <h1 className="mt-4 text-[29px] font-bold leading-[1.15] text-foreground"><Localized>Was hast du heute gegessen?</Localized></h1>
          <p className="mt-3 text-sm text-muted-foreground"><Localized>Dein Ernährungstagebuch mit Kalorien, Protein, Ballaststoffen, Kohlenhydraten und Fett – sowie Vitaminen und Mineralien.</Localized></p>
        </div>
        <NutritionMascot message={todayMeals.length === 0 ? "Bitte gib ein, was du gegessen hast." : undefined} />
      </header>
      <div className="space-y-4 px-4 pt-4">
        <button onClick={() => void toggleVoice()} disabled={vs === "busy"}
          className={`card-surface relative w-full overflow-hidden text-left disabled:opacity-60 ${vs === "rec" ? "ring-2 ring-fv" : ""}`}>
          <span aria-hidden className="absolute inset-y-0 right-0 w-[48%]">
            <img src={voiceCardBg} alt="" loading="lazy" width={1200} height={640} className="size-full object-cover object-[65%_center]" />
            <span className="absolute inset-0 bg-gradient-to-r from-card via-card/70 to-card/20" />
          </span>
          <span className={`relative z-10 flex items-center gap-3 p-5`}>
            <span className={`grid size-11 shrink-0 place-items-center rounded-full ${vs === "rec" ? "animate-pulse bg-fresh text-ink" : "bg-fresh text-ink"}`}>
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium"><Localized>{vs === "rec" ? "Ich höre zu… tippen zum Beenden" : vs === "busy" ? "Wird verarbeitet…" : "Erzähl mir, was du gegessen hast"}</Localized></div>
              <div className="text-[12px] text-ink/45"><Localized>{"z. B. „Mittags hatte ich Nudeln mit Hähnchen und einen Apfel“"}</Localized></div>
            </div>
          </span>
        </button>
        {vmsg && <p className="rounded-xl bg-muted px-4 py-3 text-[13px] text-ink/70"><Localized>{vmsg}</Localized></p>}

        <div className="space-y-4">
          <div className="eyebrow px-1"><Localized>{"Ernährungstagebuch"}</Localized></div>
          {days.length === 0 && <p className="text-[14px] text-ink/50"><Localized>{"Noch keine Einträge. Sprich oder tippe deine erste Mahlzeit."}</Localized></p>}
          {days.map((day) => {
            const meals = s.meals.filter((m) => m.date === day);
            const dayKcal = meals.reduce((a, m) => a + (m.kcal || 0), 0);
            return (
              <div key={day} className="card-surface overflow-hidden">
                <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
                  <div className="text-[14px] font-medium"><Localized>{day === today ? "Heute" : fmtDay(day)}</Localized></div>
                  <div className="font-data text-[12px] text-ink/45"><Localized>{"ca. "}</Localized><Localized>{dayKcal}</Localized><Localized>{" kcal"}</Localized></div>
                </div>
                {meals.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-data text-[12px] uppercase tracking-normal text-fv-deep"><Localized>{m.label}</Localized><Localized>{" · "}</Localized><Localized>{m.time}</Localized></div>
                      <div className="text-[15px] font-medium"><Localized>{m.name}</Localized></div>
                      <div className="font-data text-[12px] text-ink/45">
                        <Localized>{m.kcal}</Localized><Localized>{" kcal · "}</Localized><Localized>{m.protein}</Localized><Localized>{" g Protein · "}</Localized><Localized>{m.carbs}</Localized><Localized>{" g KH · "}</Localized><Localized>{m.fat}</Localized><Localized>{" g Fett · "}</Localized><Localized>{m.fiber}</Localized><Localized>{" g Ballaststoffe "}</Localized></div>
                    </div>
                    <button onClick={() => removeMeal(m.id)} className="text-ink/30" aria-label={translateText("Entfernen")}><Localized>{"×"}</Localized></button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <form onSubmit={(e) => void add(e)} className="card-surface space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="eyebrow"><Localized>{"Mahlzeit hinzufügen"}</Localized></div>
            <Button type="button" size="icon" variant="secondary" className="size-9 shrink-0 rounded-full bg-fresh text-ink" disabled={photoBusy || estBusy}
              onClick={() => photoInput.current?.click()} aria-label={translateText("Essen fotografieren")} title={translateText("Essen fotografieren")}><Camera className="size-4" /></Button>
            <input ref={photoInput} type="file" accept="image/*" capture="environment" className="sr-only" aria-label={translateText("Essensfoto auswählen")}
              onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void readPhoto(file); }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => (
              <button type="button" key={l} onClick={() => setLabel(l)} className={`rounded-full px-3 py-1 text-[13px] ring-1 ring-border ${label === l ? "bg-fresh text-ink" : ""}`}><Localized>{l}</Localized></button>
            ))}
          </div>
          <div key={photoFill} className={photoFill ? "food-photo-fill space-y-3" : "space-y-3"}>
          <input aria-label={translateText("Mahlzeit")} disabled={photoBusy} value={name} onChange={(e) => { estimateVersion.current++; setEstBusy(false); setName(e.target.value); }} placeholder={translateText("z. B. Lachs mit Ofengemüse")} className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-2">
            <input aria-label={translateText("Kalorien")} disabled={photoBusy} value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder={translateText("kcal (automatisch)")} className="min-w-0 w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <input aria-label={translateText("Protein in g")} disabled={photoBusy} value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="numeric" placeholder={translateText("Protein in g (automatisch)")} className="min-w-0 w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          </div>
          {(estBusy || photoBusy) && <div role="status" className="flex items-center gap-2 text-[12px] text-muted-foreground"><LoaderCircle className="size-5 motion-safe:animate-spin text-fresh" aria-hidden="true" /><Localized>{"Nährwerte werden berechnet…"}</Localized></div>}
          {photoFill > 0 && !photoBusy && <p className="text-[11px] text-muted-foreground"><Localized>{"Foto-Schätzung · Portionsgröße und Zutaten können abweichen."}</Localized></p>}
          {!estBusy && est?.name === name.trim() && <p className="text-[12px] text-ink/55"><Localized>{"Geschätzt: ca. "}</Localized><Localized>{est.kcal}</Localized><Localized>{" kcal · "}</Localized><Localized>{est.protein}</Localized><Localized>{" g Protein · "}</Localized><Localized>{est.carbs}</Localized><Localized>{" g KH · "}</Localized><Localized>{est.fat}</Localized><Localized>{" g Fett · "}</Localized><Localized>{est.fiber}</Localized><Localized>{" g Ballaststoffe"}</Localized></p>}
          {estErr && <p className="text-[12px] text-destructive"><Localized>{estErr}</Localized></p>}
          <Button type="submit" disabled={estBusy || photoBusy} className="w-full rounded-full bg-fresh text-ink"><Localized>{estBusy || photoBusy ? "Berechne…" : "Speichern"}</Localized></Button>
        </form>
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((c) => {
            const target = targets?.[c.key];
            const state = target ? feedback[nutrientStatus(c.key, totals[c.key], target)] : neutral;
            return <div key={c.key} data-nutrition={c.key} className="card-surface min-w-0 p-4">
              <div className="flex items-center justify-between gap-1"><div className="eyebrow break-words"><Localized>{c.label}</Localized></div><StatusFace mood={state.mood} alt={translateText(state.label)} className="size-5" /></div>
              <div className={`font-data mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 ${target ? state.color : "text-foreground"}`}>
                <span className="text-[23px] font-semibold"><Localized>{format(totals[c.key])}</Localized> <Localized>{c.unit}</Localized></span>
                <span className="text-[13px]"><Localized>{"/ "}</Localized><Localized>{target ? `${format(target)} ${c.unit}` : "—"}</Localized></span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground"><Localized>{"Heute / Tagesrichtwert · ca."}</Localized></div>
            </div>;
          })}
          <div data-nutrition="water" className="card-surface min-w-0 p-4">
            <div className="flex items-center justify-between gap-1"><div className="eyebrow break-words"><Localized>{"Genug getrunken?"}</Localized></div><StatusFace mood={waterMood} alt={waterMood === "good" ? "Tagesziel erreicht" : waterMood === "neutral" ? "Fast am Tagesziel" : "Noch nicht genug getrunken"} className="size-5" /></div>
            <div className={`font-data mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 ${waterColor}`}>
              <span className="text-[23px] font-semibold"><Localized>{liters(water)}</Localized></span>
              <span className="text-[13px]"><Localized>{"/ "}</Localized><Localized>{liters(waterGoal)}</Localized><Localized>{" Liter"}</Localized></span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground"><Localized>{"Heute / Tagesziel"}</Localized></div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <button type="button" onClick={() => addWater(-0.25)} aria-label={translateText("250 ml weniger")} className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-ink/70">−250 ml</button>
              <button type="button" onClick={() => addWater(0.25)} aria-label={translateText("250 ml Wasser hinzufügen")} className="rounded-full bg-fresh px-2.5 py-1 text-[12px] font-semibold text-ink">+250 ml</button>
            </div>
          </div>
          <Link to="/ernaehrung/omega-fette" data-nutrition="omega" className="card-surface block min-w-0 p-4">
            <div className="flex items-center justify-between gap-1"><div className="eyebrow break-words"><Localized>{"Omega fette"}</Localized></div><StatusFace mood="neutral" alt={translateText(omega.available ? "Geschätzte Aufnahme" : "Noch keine Nährstoffdaten")} className="size-5" /></div>
            <div className="font-data mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-foreground"><span className="text-[23px] font-semibold">{omega.available ? format(omega.total) : "—"}</span><span className="text-[13px]">mg</span></div>
            <div className="mt-2 text-[11px] text-muted-foreground"><Localized>{omega.available ? "Heute · geschätzt" : "Noch keine Nährstoffdaten"}</Localized></div>
            {omega.available && omega.partial && <div className="mt-1 text-[11px] text-muted-foreground"><Localized>{"Teilweise erfasst · heute"}</Localized></div>}
          </Link>
          {(["vitamins", "minerals"] as const).map((group) => {
            const summary = micronutrientSummary(todayMeals, group);
            const state = summary.available ? feedback[nutrientStatus("protein", summary.reached, summary.total)] : neutral;
            return <Link key={group} to={group === "vitamins" ? "/ernaehrung/vitamine" : "/ernaehrung/mineralien"} data-nutrition={group} className="card-surface block min-w-0 p-4">
              <div className="flex items-center justify-between gap-1"><div className="eyebrow break-words"><Localized>{group === "vitamins" ? "Vitamine" : "Mineralien"}</Localized></div><StatusFace mood={state.mood} alt={translateText(summary.available ? state.label : "Noch keine Nährstoffdaten")} className="size-5" /></div>
              <div className={`font-data mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 ${state.color}`}><span className="text-[23px] font-semibold">{summary.available ? summary.reached : "—"}</span><span className="text-[13px]">/ {summary.total}</span></div>
              <div className="mt-2 text-[11px] text-muted-foreground"><Localized>{summary.available ? "Tagesziele erreicht · ca." : "Noch keine Nährstoffdaten"}</Localized></div>
              <div className="mt-1 text-[11px] text-muted-foreground"><Localized>{summary.available && summary.partial ? "Teilweise erfasst · heute" : "Heute / Tagesrichtwert · ca."}</Localized></div>
            </Link>;
          })}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground"><Localized>{"Vitamine und Mineralien: geschätzte Mengen aus erfassten Mahlzeiten, verglichen mit EU-Referenzmengen für Erwachsene. Keine Laborwerte oder persönlichen Bedarfswerte."}</Localized></p>
        {(gaps.length > 0 || microGaps.length > 0) && <section className="space-y-3" data-nutrition-gaps>
          <h2 className="text-[17px] font-semibold"><Localized>{"Das fehlt dir noch für heute:"}</Localized></h2>
          {gaps.map((g) => <a key={g.key} href={g.href} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
            <img src={g.product.image} alt={translateText(g.product.name)} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
            <div className="min-w-0 flex-1">
              <div className="eyebrow"><Localized>{g.key === "protein" ? "Protein" : "Ballaststoffe"}</Localized><Localized>{" · noch ca. "}</Localized><Localized>{format(Math.max(g.missing, 0))}</Localized><Localized>{" g"}</Localized></div>
              <div className="mt-1 text-[15px] font-semibold"><Localized>{g.product.name}</Localized></div>
              <div className="text-xs text-muted-foreground"><Localized>{g.reason}</Localized></div>
              <div className="mt-1 text-xs font-semibold text-fv-deep"><Localized>{"Bei Fairvital ansehen →"}</Localized></div>
            </div>
          </a>)}
          {microGaps.map((g) => <a key={g.key} href={g.href} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
            <img src={g.product.image} alt={translateText(g.product.name)} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
            <div className="min-w-0 flex-1">
              <div className="eyebrow"><Localized>{g.name}</Localized><Localized>{" · noch ca. "}</Localized><Localized>{format(Math.max(g.missing, 0))}</Localized>{" "}{g.unit}</div>
              <div className="mt-1 text-[15px] font-semibold"><Localized>{g.product.name}</Localized></div>
              <div className="text-xs text-muted-foreground"><Localized>{g.reason}</Localized></div>
              <div className="mt-1 text-xs font-semibold text-fv-deep"><Localized>{"Bei Fairvital ansehen →"}</Localized></div>
            </div>
          </a>)}
          <p className="text-[11px] text-muted-foreground"><Localized>{"Ergänzung zu einer ausgewogenen Ernährung, kein Ersatz für Mahlzeiten."}</Localized></p>
        </section>}
        {targets ? <p className="text-[11px] leading-relaxed text-muted-foreground"><Localized>{"Geschätzte Richtwerte zum Gewichtserhalt, keine medizinischen Grenzwerte. Mehr Protein oder Ballaststoffe ist nicht automatisch ungesund. Bei Schwangerschaft, Stillzeit oder Erkrankungen ärztlich abstimmen."}</Localized></p> : <section className="space-y-3 border-y border-border py-4">
          <h2 className="text-[15px] font-semibold"><Localized>{"Deine Tagesrichtwerte"}</Localized></h2>
          <NutritionProfileFields value={profile} onChange={setProfile} />
          {(!s.body.weightKg || !s.body.heightCm) && <Link to="/gesundheit" className="block text-sm text-fv-deep underline"><Localized>{"Gewicht und Größe ergänzen"}</Localized></Link>}
          {profile.sex === "unspecified" && <p className="text-xs text-muted-foreground"><Localized>{"Ohne diese Angabe ist keine persönliche Schätzung möglich."}</Localized></p>}
          <Button disabled={!profile.age || profile.age < 18 || profile.age > 120 || !profile.sex || !profile.activity} onClick={() => set({ body: { ...s.body, ...profile } })} className="w-full bg-fresh text-ink"><Localized>{"Angaben speichern"}</Localized></Button>
        </section>}
      </div>
    </AppShell>
  );
}
