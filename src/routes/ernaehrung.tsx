import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { mealFromVoice } from "@/lib/ai.functions";
import { blobToBase64, recordWav } from "@/lib/record-wav";
import type { Meal } from "@/lib/data";

export const Route = createFileRoute("/ernaehrung")({
  head: () => ({
    meta: [
      { title: "Ernährung — Fairvital Health" },
      { name: "description", content: "Ernährungstagebuch: Mahlzeiten erfassen und Kalorien, Protein, Ballaststoffe, Kohlenhydrate und Fett im Blick behalten." },
      { property: "og:title", content: "Ernährung — Fairvital Health" },
      { property: "og:description", content: "Mahlzeiten einfach erfassen und Nährwerte verstehen." },
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
  const [name, setName] = useState("");
  const [label, setLabel] = useState("Abendessen");
  const [protein, setProtein] = useState("");
  const [kcal, setKcal] = useState("");
  const voice = useServerFn(mealFromVoice);
  const rec = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const [vs, setVs] = useState<"idle" | "rec" | "busy">("idle");
  const [vmsg, setVmsg] = useState<string | null>(null);

  const today = todayISO();
  const todayMeals = s.meals.filter((m) => m.date === today);
  const sum = (key: "kcal" | "protein" | "fiber" | "carbs" | "fat") => todayMeals.reduce((a, m) => a + (m[key] || 0), 0);
  const totals = { kcal: sum("kcal"), protein: sum("protein"), fiber: sum("fiber"), carbs: sum("carbs"), fat: sum("fat") };
  const proteinGoal = 90;

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

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const meal: Meal = {
      id: crypto.randomUUID(), label, name: name.trim(),
      protein: Number(protein) || 0, kcal: Number(kcal) || 0,
      fiber: 0, carbs: 0, fat: 0,
      time: nowTime(), date: today,
    };
    set({ meals: [...s.meals, meal] });
    setName(""); setProtein(""); setKcal("");
  };

  const removeMeal = (id: string) => set({ meals: s.meals.filter((x) => x.id !== id) });

  const statCards: { label: string; value: string }[] = [
    { label: "Kalorien", value: `ca. ${totals.kcal} kcal` },
    { label: "Protein", value: `ca. ${totals.protein.toFixed(1)} g` },
    { label: "Ballaststoffe", value: `ca. ${totals.fiber.toFixed(1)} g` },
    { label: "Kohlenhydrate", value: `ca. ${totals.carbs.toFixed(1)} g` },
    { label: "Fett", value: `ca. ${totals.fat.toFixed(1)} g` },
  ];

  return (
    <AppShell>
      <PageHeader eyebrow="Ernährung" title="Was hast du heute gegessen?" sub="Dein Ernährungstagebuch mit Kalorien, Protein, Ballaststoffen, Kohlenhydraten und Fett." />
      <div className="space-y-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((c) => (
            <div key={c.label} className="card-surface p-4">
              <div className="eyebrow">{c.label}</div>
              <div className="font-data mt-1 text-[22px] font-medium">{c.value}</div>
              <div className="text-[11px] text-ink/45">Heute erfasst · ca.</div>
            </div>
          ))}
          <div className="card-surface p-4">
            <div className="eyebrow">Protein-Ziel</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-data text-[22px] font-medium">{totals.protein}</span>
              <span className="font-data text-[12px] text-ink/45">/ {proteinGoal} g</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-fv" style={{ width: `${Math.min(100, (totals.protein / proteinGoal) * 100)}%` }} />
            </div>
          </div>
        </div>

        <button onClick={() => void toggleVoice()} disabled={vs === "busy"}
          className={`card-surface flex w-full items-center gap-3 p-5 text-left disabled:opacity-60 ${vs === "rec" ? "ring-2 ring-fv" : ""}`}>
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${vs === "rec" ? "animate-pulse bg-fv text-ink" : "bg-ink text-on-ink"}`}>
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium">{vs === "rec" ? "Ich höre zu… tippen zum Beenden" : vs === "busy" ? "Wird verarbeitet…" : "Erzähl mir, was du gegessen hast"}</div>
            <div className="text-[11px] text-ink/45">z. B. „Mittags hatte ich Nudeln mit Hähnchen und einen Apfel“</div>
          </div>
        </button>
        {vmsg && <p className="rounded-xl bg-muted px-4 py-3 text-[12px] text-ink/70">{vmsg}</p>}

        <div className="space-y-4">
          <div className="eyebrow px-1">Ernährungstagebuch</div>
          {days.length === 0 && <p className="text-[13px] text-ink/50">Noch keine Einträge. Sprich oder tippe deine erste Mahlzeit.</p>}
          {days.map((day) => {
            const meals = s.meals.filter((m) => m.date === day);
            const dayKcal = meals.reduce((a, m) => a + (m.kcal || 0), 0);
            return (
              <div key={day} className="card-surface overflow-hidden">
                <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
                  <div className="text-[13px] font-medium">{day === today ? "Heute" : fmtDay(day)}</div>
                  <div className="font-data text-[11px] text-ink/45">ca. {dayKcal} kcal</div>
                </div>
                {meals.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-data text-[10px] uppercase tracking-[0.14em] text-fv-deep">{m.label} · {m.time}</div>
                      <div className="text-[14px] font-medium">{m.name}</div>
                      <div className="font-data text-[11px] text-ink/45">
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

        <form onSubmit={add} className="card-surface space-y-3 p-5">
          <div className="eyebrow">Mahlzeit hinzufügen</div>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => (
              <button type="button" key={l} onClick={() => setLabel(l)} className={`rounded-full px-3 py-1 text-[12px] ring-1 ring-border ${label === l ? "bg-ink text-on-ink" : ""}`}>{l}</button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lachs mit Ofengemüse" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-2">
            <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal (optional)" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <input value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="numeric" placeholder="Protein in g (optional)" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button className="w-full rounded-full bg-ink py-2.5 text-sm font-medium text-on-ink">Speichern</button>
        </form>
      </div>
    </AppShell>
  );
}
