import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { status } from "@/lib/data";
import { dailyGoals } from "@/lib/daily-goals";

export const Route = createFileRoute("/uhr")({
  head: () => ({
    meta: [
      { title: "Uhr — Vivo" },
      { name: "description", content: "Vivo auf der Smartwatch: Tagesziele und Vitamin D auf einen Blick." },
      { property: "og:title", content: "Uhr — Vivo" },
      { property: "og:description", content: "Glanceable Watch-Screens für Apple Watch und Wear OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Watch,
});


function Watch() {
  useLanguage();
  const { s, set } = useStore();
  const [shape, setShape] = useState<"apple" | "wear">("apple");
  const [screen, setScreen] = useState(0);
  const actions = dailyGoals(s.aiPlan, s.onboarded ? s.goals : [], s.goalOff).goals;
  const done = actions.filter((a) => s.actionsDone[a.key]).length;
  const vitd = s.labs.find((l) => l.id === "vitd");
  const last = vitd?.history.at(-1)?.value ?? "—";
  const next = actions.find((a) => !s.actionsDone[a.key]);
  const pct = actions.length ? done / actions.length : 0;
  const C = 2 * Math.PI * 44;

  const screens = [
    // Ring
    <div key="ring" className="flex h-full flex-col items-center justify-center">
      <svg viewBox="0 0 100 100" className="size-[110px] -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-on-ink/10" />
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-fv transition-all"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      </svg>
      <div className="-mt-[78px] font-data text-[30px] font-medium text-on-ink"><Localized>{done}</Localized><Localized>{"/"}</Localized><Localized>{actions.length}</Localized></div>
      <div className="mt-8 text-[12px] text-on-ink/55"><Localized>{"Tagesziele"}</Localized></div>
    </div>,
    // Next action
    <div key="next" className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="font-data text-[11px] uppercase tracking-normal text-fv"><Localized>{"Als Nächstes"}</Localized></div>
      <div className="mt-2 text-[18px] font-semibold leading-tight text-on-ink"><Localized>{next ? next.title : "Alles erledigt"}</Localized></div>
      {next && (
        <button onClick={(e) => { e.stopPropagation(); set({ actionsDone: { ...s.actionsDone, [next.key]: true } }); }}
          className="mt-4 rounded-full bg-fv px-6 py-2 text-[14px] font-medium text-ink"><Localized>{" Erledigt "}</Localized></button>
      )}
    </div>,
    // Vitamin D
    <div key="vitd" className="flex h-full flex-col items-center justify-center text-center">
      <div className="font-data text-[11px] uppercase tracking-normal text-on-ink/50"><Localized>{"Vitamin D"}</Localized></div>
      <div className="mt-1 font-data text-[40px] font-medium leading-none text-on-ink"><Localized>{last}</Localized></div>
      <div className="font-data text-[12px] text-on-ink/45"><Localized>{vitd?.unit ?? "ng/ml"}</Localized></div>
      <div className="mt-3 rounded-full bg-fv/20 px-3 py-1 font-data text-[11px] uppercase tracking-normal text-fv"><Localized>{vitd ? status(vitd).label : "Noch keine Laborwerte"}</Localized></div>
    </div>,
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-mist p-6">
      <div className="flex gap-1 rounded-full bg-card p-1 ring-1 ring-border">
        {(["apple", "wear"] as const).map((k) => (
          <button key={k} onClick={() => setShape(k)}
            className={`rounded-full px-4 py-1.5 text-sm ${shape === k ? "bg-ink text-on-ink" : "text-ink/60"}`}>
            <Localized>{k === "apple" ? "Apple Watch" : "Wear OS"}</Localized>
          </button>
        ))}
      </div>

      <div className="rounded-[64px] bg-ink/90 p-3 shadow-2xl" style={shape === "wear" ? { borderRadius: "9999px" } : undefined}>
        <button
          onClick={() => setScreen((screen + 1) % screens.length)}
          aria-label={translateText("Nächster Bildschirm")}
          className={`relative block size-[200px] overflow-hidden bg-ink ${shape === "wear" ? "rounded-full" : "rounded-[48px]"}`}
        >
          <div className="pointer-events-none absolute inset-0 hero-glow opacity-40" />
          <div className="relative h-full"><Localized>{screens[screen]}</Localized></div>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {screens.map((_, i) => (
              <span key={i} className={`size-1.5 rounded-full ${i === screen ? "bg-fv" : "bg-on-ink/20"}`} />
            ))}
          </div>
        </button>
      </div>

      <p className="max-w-[32ch] text-center text-sm text-ink/55"><Localized>{"Tippe auf das Display, um zum nächsten Bildschirm zu wechseln."}</Localized></p>
      <Link to="/heute" className="text-sm font-medium text-fv-deep"><Localized>{"← Zur Handy-App"}</Localized></Link>
    </div>
  );
}
