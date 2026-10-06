import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Smile, Meh, Frown } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { mealFromVoice, mealNutrition } from "@/lib/ai.functions";
import { blobToBase64, recordWav } from "@/lib/record-wav";
import { Button } from "@/components/ui/button";
import { NutritionProfileFields } from "@/components/NutritionProfileFields";
import { nutrientStatus, nutritionTargets, type NutritionProfile } from "@/lib/nutrition-targets";
import type { Meal } from "@/lib/data";
import { nutritionGaps } from "@/lib/nutrition-products";
import ernaehrungVeg from "@/assets/ernaehrung-veg.jpg.asset.json";
import voiceCardBg from "@/assets/voice-card-bg.png";

export const Route = createFileRoute("/ernaehrung")({
  head: () => ({
    meta: [
      { title: "Ernährung — Vivo" },
      { name: "description", content: "Ernährungstagebuch: Mahlzeiten erfassen und Kalorien, Protein, Ballaststoffe, Kohlenhydrate und Fett im Blick behalten." },
      { property: "og:title", content: "Ernährung — Vivo" },
      { property: "og:description", content: "Mahlzeiten einfach erfassen und Nährwerte verstehen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Nutrition,
});

const labels = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

function Nutrition() {
  const { s, set } = useStore();
  const [profile, setProfile] = useState<NutritionProfile>({ age: s.body.age ?? null, sex: s.body.sex ?? null, activity: s.body.activity ?? null });
  const [name, setName] = useState("");
  const [label, setLabel] = useState("Abendessen");
  const [protein, setProtein] = useState("");
  const [kcal, setKcal] = useState("");
  const voice = useServerFn(mealFromVoice);
  const estimate = useServerFn(mealNutrition);
  type Est = { name: string; kcal: number; protein: number; fiber: number; carbs: number; fat: number };
  const [est, setEst] = useState<Est | null>(null);
  const [estBusy, setEstBusy] = useState(false);
  const [estErr, setEstErr] = useState<string | null>(null);
  const runEstimate = async (n: string): Promise<Est | null> => {
    setEstBusy(true); setEstErr(null);
    try {
      const r = await estimate({ data: { name: n } });
      if (!r.ok) { setEstErr(r.error); return null; }
      const e: Est = { name: n, kcal: r.kcal, protein: r.protein, fiber: r.fiber, carbs: r.carbs, fat: r.fat };
      setEst(e); setKcal(String(e.kcal)); setProtein(String(e.protein));
      return e;
    } catch { setEstErr("Nährwerte konnten nicht berechnet werden."); return null; }
    finally { setEstBusy(false); }
  };
  useEffect(() => {
    const n = name.trim();
    if (n.length < 3 || est?.name === n) return;
    const t = setTimeout(() => { void runEstimate(n); }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  const rec = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const [vs, setVs] = useState<"idle" | "rec" | "busy">("idle");
  const [vmsg, setVmsg] = useState<string | null>(null);

  const today = todayISO();
  const todayMeals = s.meals.filter((m) => m.date === today);
  const sum = (key: "kcal" | "protein" | "fiber" | "carbs" | "fat") => todayMeals.reduce((a, m) => a + (m[key] || 0), 0);
  const totals = { kcal: sum("kcal"), protein: sum("protein"), fiber: sum("fiber"), carbs: sum("carbs"), fat: sum("fat") };
  const targets = nutritionTargets(s.body);

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
      set({ meals: [...s.meals, ...r.meals.map((m) => ({ ...m, id: crypto.randomUUID(), time, date: today }))] });
      setVmsg(`„${r.transcript}“ – ${r.meals.length} Mahlzeit${r.meals.length > 1 ? "en" : ""} hinzugefügt.`);
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
    if (!n || estBusy) return;
    let e2 = est?.name === n ? est : null;
    if (!e2 && !kcal && !protein) e2 = await runEstimate(n);
    const meal: Meal = {
      id: crypto.randomUUID(), label, name: n,
      protein: Number(protein.replace(",", ".")) || e2?.protein || 0, kcal: Number(kcal.replace(",", ".")) || e2?.kcal || 0,
      fiber: e2?.fiber ?? 0, carbs: e2?.carbs ?? 0, fat: e2?.fat ?? 0,
      time: nowTime(), date: today,
    };
    set({ meals: [...s.meals, meal] });
    setName(""); setProtein(""); setKcal(""); setEst(null);
  };

  const removeMeal = (id: string) => set({ meals: s.meals.filter((x) => x.id !== id) });

  const statCards = [
    { label: "Kalorien", key: "kcal", unit: "kcal" },
    { label: "Protein", key: "protein", unit: "g" },
    { label: "Ballaststoffe", key: "fiber", unit: "g" },
    { label: "Kohlenhydrate", key: "carbs", unit: "g" },
    { label: "Fett", key: "fat", unit: "g" },
  ] as const;
  const feedback = {
    good: { color: "text-bmi-good", Face: Smile, label: "Im grünen Bereich" },
    near: { color: "text-nutrition-near", Face: Meh, label: "Richtwert fast erreicht" },
    bad: { color: "text-bmi-bad", Face: Frown, label: "Deutlich vom Richtwert entfernt" },
  };
  const neutral = { color: "text-muted-foreground", Face: Meh, label: "Kein Richtwert gesetzt" };
  const format = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const gaps = nutritionGaps(totals, targets, s.meals.filter((m) => m.date === today).length);

  return (
    <AppShell>
      <PageHeader eyebrow="Ernährung" title="Was hast du heute gegessen?" sub="Dein Ernährungstagebuch mit Kalorien, Protein, Ballaststoffen, Kohlenhydraten und Fett." subClass="max-w-[26ch]" image={ernaehrungVeg.url} imageAlt="Angeschnittene Orangenscheibe in leuchtend orangefarbenem Saft mit schwebenden Tropfen" imageOverlay="citrus-image-overlay" />
      <div className="space-y-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((c) => {
            const target = targets?.[c.key];
            const state = target ? feedback[nutrientStatus(c.key, totals[c.key], target)] : neutral;
            return <div key={c.key} data-nutrition={c.key} className="card-surface min-w-0 p-4">
              <div className="flex items-center justify-between gap-1"><div className="eyebrow break-words">{c.label}</div><state.Face role="img" aria-label={state.label} className={`size-5 shrink-0 ${state.color}`} /></div>
              <div className={`font-data mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 ${target ? state.color : "text-foreground"}`}>
                <span className="text-[23px] font-semibold">{format(totals[c.key])} {c.unit}</span>
                <span className="text-[13px]">/ {target ? `${format(target)} ${c.unit}` : "—"}</span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">Heute / Tagesrichtwert · ca.</div>
            </div>;
          })}
        </div>
        {gaps.length > 0 && <section className="space-y-3" data-nutrition-gaps>
          <h2 className="text-[17px] font-semibold">Das fehlt dir noch für heute:</h2>
          {gaps.map((g) => <a key={g.key} href={g.href} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
            <img src={g.product.image} alt={g.product.name} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
            <div className="min-w-0 flex-1">
              <div className="eyebrow">{g.key === "protein" ? "Protein" : "Ballaststoffe"} · noch ca. {format(Math.max(g.missing, 0))} g</div>
              <div className="mt-1 text-[15px] font-semibold">{g.product.name}</div>
              <div className="text-xs text-muted-foreground">{g.reason}</div>
              <div className="mt-1 text-xs font-semibold text-fv-deep">Bei Fairvital ansehen →</div>
            </div>
          </a>)}
          <p className="text-[11px] text-muted-foreground">Ergänzung zu einer ausgewogenen Ernährung, kein Ersatz für Mahlzeiten.</p>
        </section>}
        {targets ? <p className="text-[11px] leading-relaxed text-muted-foreground">Geschätzte Richtwerte zum Gewichtserhalt, keine medizinischen Grenzwerte. Mehr Protein oder Ballaststoffe ist nicht automatisch ungesund. Bei Schwangerschaft, Stillzeit oder Erkrankungen ärztlich abstimmen.</p> : <section className="space-y-3 border-y border-border py-4">
          <h2 className="text-[15px] font-semibold">Deine Tagesrichtwerte</h2>
          <NutritionProfileFields value={profile} onChange={setProfile} />
          {(!s.body.weightKg || !s.body.heightCm) && <Link to="/gesundheit" className="block text-sm text-fv-deep underline">Gewicht und Größe ergänzen</Link>}
          {profile.sex === "unspecified" && <p className="text-xs text-muted-foreground">Ohne diese Angabe ist keine persönliche Schätzung möglich.</p>}
          <Button disabled={!profile.age || profile.age < 18 || profile.age > 120 || !profile.sex || !profile.activity} onClick={() => set({ body: { ...s.body, ...profile } })} className="w-full bg-fresh text-ink">Angaben speichern</Button>
        </section>}


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
              <div className="text-[15px] font-medium">{vs === "rec" ? "Ich höre zu… tippen zum Beenden" : vs === "busy" ? "Wird verarbeitet…" : "Erzähl mir, was du gegessen hast"}</div>
              <div className="text-[12px] text-ink/45">z. B. „Mittags hatte ich Nudeln mit Hähnchen und einen Apfel“</div>
            </div>
          </span>
        </button>
        {vmsg && <p className="rounded-xl bg-muted px-4 py-3 text-[13px] text-ink/70">{vmsg}</p>}

        <div className="space-y-4">
          <div className="eyebrow px-1">Ernährungstagebuch</div>
          {days.length === 0 && <p className="text-[14px] text-ink/50">Noch keine Einträge. Sprich oder tippe deine erste Mahlzeit.</p>}
          {days.map((day) => {
            const meals = s.meals.filter((m) => m.date === day);
            const dayKcal = meals.reduce((a, m) => a + (m.kcal || 0), 0);
            return (
              <div key={day} className="card-surface overflow-hidden">
                <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
                  <div className="text-[14px] font-medium">{day === today ? "Heute" : fmtDay(day)}</div>
                  <div className="font-data text-[12px] text-ink/45">ca. {dayKcal} kcal</div>
                </div>
                {meals.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-data text-[12px] uppercase tracking-normal text-fv-deep">{m.label} · {m.time}</div>
                      <div className="text-[15px] font-medium">{m.name}</div>
                      <div className="font-data text-[12px] text-ink/45">
                        {m.kcal} kcal · {m.protein} g Protein · {m.carbs} g KH · {m.fat} g Fett · {m.fiber} g Ballaststoffe
                      </div>
                    </div>
                    <button onClick={() => removeMeal(m.id)} className="text-ink/30" aria-label="Entfernen">×</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <form onSubmit={(e) => void add(e)} className="card-surface space-y-3 p-5">
          <div className="eyebrow">Mahlzeit hinzufügen</div>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => (
              <button type="button" key={l} onClick={() => setLabel(l)} className={`rounded-full px-3 py-1 text-[13px] ring-1 ring-border ${label === l ? "bg-fresh text-ink" : ""}`}>{l}</button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lachs mit Ofengemüse" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-2">
            <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal (automatisch)" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <input value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="numeric" placeholder="Protein in g (automatisch)" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {estBusy && <p className="text-[12px] text-ink/55">Nährwerte werden berechnet…</p>}
          {!estBusy && est?.name === name.trim() && <p className="text-[12px] text-ink/55">Geschätzt: ca. {est.kcal} kcal · {est.protein} g Protein · {est.carbs} g KH · {est.fat} g Fett · {est.fiber} g Ballaststoffe</p>}
          {estErr && <p className="text-[12px] text-destructive">{estErr}</p>}
          <button disabled={estBusy} className="w-full rounded-full bg-fresh py-2.5 text-sm font-semibold text-ink disabled:opacity-60">{estBusy ? "Berechne…" : "Speichern"}</button>
        </form>
      </div>
    </AppShell>
  );
}
