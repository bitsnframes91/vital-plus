import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { NutritionProfileFields } from "@/components/NutritionProfileFields";
import type { NutritionProfile } from "@/lib/nutrition-targets";
import { calcBmi, bmiCategory, stepGoalFor } from "@/lib/bmi";
import { questionnaireReturn } from "@/lib/questionnaire-return";

export const Route = createFileRoute("/onboarding")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Willkommen — Vitalplus" },
      { name: "description", content: "Lege in wenigen Schritten dein Gesundheitsprofil an." },
      { property: "og:title", content: "Willkommen — Vitalplus" },
      { property: "og:description", content: "Starte mit Vitalplus und lege in wenigen Schritten dein persönliches Gesundheitsprofil an." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (q: Record<string, unknown>): { step?: number; from?: "profile" | "health" } => {
    const n = Number(q['step']);
    return Number.isInteger(n) && n >= 0 && n <= 5 ? { step: n, from: questionnaireReturn(q['from']) } : {};
  },
  component: Onboarding,
});

import { goalOptions } from "@/lib/goal-options";
const dietOptions = ["Mischkost", "Vegetarisch", "Vegan", "Pescetarisch"];

function Onboarding() {
  useLanguage();
  const { s, set } = useStore();
  const nav = useNavigate();
  const { step: editStep, from } = Route.useSearch();
  const returnToOrigin = () => from === "profile"
    ? nav({ to: "/profil/$section", params: { section: "personal" } })
    : nav({ to: "/gesundheit" });
  const editing = editStep != null;
  const [step, setStep] = useState(editStep ?? 0);
  const [name, setName] = useState(s.name);
  const [goals, setGoals] = useState<string[]>(s.goals);
  const [diet, setDiet] = useState("Mischkost");
  const [profile, setProfile] = useState<NutritionProfile>({ age: s.body.age ?? null, sex: s.body.sex ?? null, activity: s.body.activity ?? null });
  const [ok, setOk] = useState(false);
  const [weight, setWeight] = useState(s.body.weightKg?.toString() ?? "");
  const [height, setHeight] = useState(s.body.heightCm?.toString() ?? "");
  const parseDe = (v: string) => {
    const clean = v.trim().replace(/\s/g, "").replace(/[^\d,.]/g, "");
    const last = Math.max(clean.lastIndexOf(","), clean.lastIndexOf("."));
    if (last < 0) return Number(clean);
    const int = clean.slice(0, last).replace(/[^\d]/g, "");
    const dec = clean.slice(last + 1).replace(/[^\d]/g, "");
    return Number(`${int}.${dec}`);
  };
  const w = parseDe(weight);
  const h = parseDe(height);
  const bmi = w >= 20 && w <= 400 && h >= 100 && h <= 250 ? calcBmi(w, h) : null;
  const cat = bmi != null ? bmiCategory(bmi) : null;
  const field = "w-full rounded-xl bg-card px-4 py-3 text-base outline-none ring-1 ring-border focus:ring-2 focus:ring-ring";

  const steps = [
    {
      t: "Wie dürfen wir dich nennen?",
      body: <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl bg-card px-4 py-3 text-base outline-none ring-1 ring-border focus:ring-2 focus:ring-ring" />,
      valid: name.trim().length > 0,
    },
    {
      t: "Was ist dir wichtig?",
      body: (
        <div className="flex flex-wrap gap-2">
          {goalOptions.map((g) => {
            const on = goals.includes(g);
            return <Button variant="outline" key={g} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])} className={`rounded-full px-4 py-2 text-sm ring-1 ring-border ${on ? "bg-fresh text-ink hover:bg-fresh hover:text-ink" : "bg-card text-ink"}`}><Localized>{g}</Localized></Button>;
          })}
        </div>
      ),
      valid: goals.length > 0,
    },
    {
      t: "Wie ernährst du dich?",
      body: (
        <div className="grid grid-cols-2 gap-2">
          {dietOptions.map((d) => <Button variant="outline" key={d} onClick={() => setDiet(d)} className={`rounded-2xl px-4 py-4 text-sm ring-1 ring-border ${diet === d ? "bg-fresh text-ink hover:bg-fresh hover:text-ink" : "bg-card text-ink"}`}><Localized>{d}</Localized></Button>)}
        </div>
      ),
      valid: true,
    },
    {
      t: "Gewicht und Größe",
      body: (
        <div className="space-y-3">
          <label className="block text-sm text-ink/70"><Localized>{"Gewicht (kg) "}</Localized><input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={translateText("z. B. 72,5")} className={`mt-1 ${field}`} />
          </label>
          <label className="block text-sm text-ink/70"><Localized>{"Größe (cm) "}</Localized><input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={translateText("z. B. 175")} className={`mt-1 ${field}`} />
          </label>
          <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <div className="eyebrow"><Localized>{"Dein BMI"}</Localized></div>
            {bmi != null && cat ? (
              <>
                <div className={`mt-1 text-[32px] font-semibold ${cat.className}`}><Localized>{bmi.toFixed(1).replace(".", ",")}</Localized></div>
                <div className={`text-[15px] font-semibold ${cat.className}`}><Localized>{cat.label}</Localized></div>
              </>
            ) : (
              <div className="mt-1 text-sm text-ink/55"><Localized>{"Gib Gewicht und Größe ein, um deinen BMI zu sehen."}</Localized></div>
            )}
          </div>
        </div>
      ),
      valid: bmi != null,
    },
    {
      t: "Dein Alltag und Energiebedarf",
      body: <NutritionProfileFields value={profile} onChange={setProfile} />,
      valid: Boolean(profile.age && profile.age >= 18 && profile.age <= 120 && profile.sex && profile.activity),
    },
    {
      t: "Deine Daten, deine Entscheidung.",
      body: (
        <label className="flex items-start gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-border">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 accent-[var(--fv-deep)]" />
          <span className="text-ink/70"><Localized>{"Ich willige ein, dass meine Gesundheitsdaten zur Darstellung in der App verarbeitet werden. Vitalplus ersetzt keine ärztliche Beratung."}</Localized></span>
        </label>
      ),
      valid: ok,
    },
  ];
  const cur = steps[step];
  if (!cur) return null;

  const next = () => {
    if (editing) {
      set({ name, goals, body: { ...s.body, ...profile, ...(bmi != null ? { weightKg: w, heightCm: h, stepGoal: stepGoalFor(bmi) } : {}) } });
      return returnToOrigin();
    }
    if (step < steps.length - 1) return setStep(step + 1);
    set({ name, goals, onboarded: true, body: { ...s.body, ...profile, weightKg: w, heightCm: h, stepGoal: stepGoalFor(bmi), steps: s.body.steps ?? stepGoalFor(bmi) } });
    nav({ to: "/heute" });
  };

  return (
    <div className="min-h-screen w-full bg-mist sm:grid sm:place-items-center sm:p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background sm:min-h-[860px] sm:overflow-hidden sm:rounded-[28px] sm:ring-1 sm:ring-border">
        <div className="relative overflow-hidden bg-header px-6 pb-10 pt-10">
          <div className="relative">
            <div className="font-data text-[12px] uppercase tracking-normal text-on-ink/40"><Localized>{"Vitalplus · Schritt "}</Localized><Localized>{step + 1}</Localized><Localized>{"/"}</Localized><Localized>{steps.length}</Localized></div>
            <div className="mt-3 flex gap-1">
              {steps.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-fv" : "bg-on-ink/15"}`} />)}
            </div>
            <h1 className="mt-6 text-[32px] font-semibold leading-[1.05] text-on-ink"><Localized>{cur.t}</Localized></h1>
          </div>
        </div>
        <div className="flex-1 px-6 pt-6"><Localized>{cur.body}</Localized></div>
        <div className="flex gap-2 px-6 pb-8 pt-6">
          {editing ? <Button onClick={returnToOrigin} className="rounded-full px-5 py-3 text-sm ring-1 ring-border"><Localized>{"Abbrechen"}</Localized></Button> : step > 0 && <Button onClick={() => setStep(step - 1)} className="rounded-full px-5 py-3 text-sm ring-1 ring-border"><Localized>{"Zurück"}</Localized></Button>}
          <Button disabled={!cur.valid} onClick={next} className="flex-1 rounded-full bg-fresh py-3 text-sm font-medium text-ink disabled:opacity-40">
            <Localized>{editing ? "Speichern" : step === steps.length - 1 ? "Los geht's" : "Weiter"}</Localized>
          </Button>
        </div>
      </div>
    </div>
  );
}
