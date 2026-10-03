import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Willkommen — Fairvital Health" },
      { name: "description", content: "Lege in wenigen Schritten dein Gesundheitsprofil an." },
      { property: "og:title", content: "Willkommen — Fairvital Health" },
      { property: "og:description", content: "Dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const goalOptions = ["Gesund altern", "Mehr Energie", "Besser schlafen", "Immunsystem", "Herz & Kreislauf", "Gewicht halten", "Sport & Regeneration"];
const dietOptions = ["Mischkost", "Vegetarisch", "Vegan", "Pescetarisch"];

function Onboarding() {
  const { s, set } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(s.name);
  const [goals, setGoals] = useState<string[]>(s.goals);
  const [diet, setDiet] = useState("Mischkost");
  const [ok, setOk] = useState(false);

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
            return <button key={g} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])} className={`rounded-full px-4 py-2 text-sm ring-1 ring-border ${on ? "bg-ink text-on-ink" : "bg-card"}`}>{g}</button>;
          })}
        </div>
      ),
      valid: goals.length > 0,
    },
    {
      t: "Wie ernährst du dich?",
      body: (
        <div className="grid grid-cols-2 gap-2">
          {dietOptions.map((d) => <button key={d} onClick={() => setDiet(d)} className={`rounded-2xl px-4 py-4 text-sm ring-1 ring-border ${diet === d ? "bg-ink text-on-ink" : "bg-card"}`}>{d}</button>)}
        </div>
      ),
      valid: true,
    },
    {
      t: "Deine Daten, deine Entscheidung.",
      body: (
        <label className="flex items-start gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-border">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 accent-[var(--fv-deep)]" />
          <span className="text-ink/70">Ich willige ein, dass meine Gesundheitsdaten zur Darstellung in der App verarbeitet werden. Fairvital Health ersetzt keine ärztliche Beratung.</span>
        </label>
      ),
      valid: ok,
    },
  ];
  const cur = steps[step]!;

  const next = () => {
    if (step < steps.length - 1) return setStep(step + 1);
    set({ name, goals, onboarded: true });
    nav({ to: "/heute" });
  };

  return (
    <div className="min-h-screen w-full bg-mist sm:grid sm:place-items-center sm:p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background sm:min-h-[860px] sm:overflow-hidden sm:rounded-[28px] sm:ring-1 sm:ring-border">
        <div className="relative overflow-hidden bg-header px-6 pb-10 pt-10">
          <div className="relative">
            <div className="font-data text-[12px] uppercase tracking-normal text-on-ink/40">Fairvital Health · Schritt {step + 1}/{steps.length}</div>
            <div className="mt-3 flex gap-1">
              {steps.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-fv" : "bg-on-ink/15"}`} />)}
            </div>
            <h1 className="mt-6 text-[32px] font-semibold leading-[1.05] text-on-ink">{cur.t}</h1>
          </div>
        </div>
        <div className="flex-1 px-6 pt-6">{cur.body}</div>
        <div className="flex gap-2 px-6 pb-8 pt-6">
          {step > 0 && <button onClick={() => setStep(step - 1)} className="rounded-full px-5 py-3 text-sm ring-1 ring-border">Zurück</button>}
          <button disabled={!cur.valid} onClick={next} className="flex-1 rounded-full bg-ink py-3 text-sm font-medium text-on-ink disabled:opacity-40">
            {step === steps.length - 1 ? "Los geht's" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}
