import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { status } from "@/lib/data";
import { dailyGoals } from "@/lib/daily-goals";

export const Route = createFileRoute("/uhr")({
  head: () => ({
    meta: [
      { title: "Uhr — Fairvital Health" },
      { name: "description", content: "Fairvital Health auf der Smartwatch: Tagesziele und Vitamin D auf einen Blick." },
      { property: "og:title", content: "Uhr — Fairvital Health" },
      { property: "og:description", content: "Glanceable Watch-Screens für Apple Watch und Wear OS." },
    ],
  }),
  component: Watch,
});


function Watch() {
  const { s, set } = useStore();
  const [shape, setShape] = useState<"apple" | "wear">("apple");
  const [screen, setScreen] = useState(0);
  const actions = dailyGoals(s.aiPlan).goals;
  const done = actions.filter((a) => s.actionsDone[a.key]).length;
  const vitd = s.labs.find((l) => l.id === "vitd")!;
  const last = vitd.history[vitd.history.length - 1]!.value;
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
      <div className="-mt-[78px] font-data text-[26px] font-medium text-on-ink">{done}/{actions.length}</div>
      <div className="mt-8 text-[11px] text-on-ink/55">Tagesziele</div>
    </div>,
    // Next action
    <div key="next" className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="font-data text-[9px] uppercase tracking-[0.2em] text-fv">Als Nächstes</div>
      <div className="mt-2 text-[17px] font-semibold leading-tight text-on-ink">{next ? next.title : "Alles erledigt"}</div>
      {next && (
        <button onClick={(e) => { e.stopPropagation(); set({ actionsDone: { ...s.actionsDone, [next.key]: true } }); }}
          className="mt-4 rounded-full bg-fv px-6 py-2 text-[13px] font-medium text-ink">
          Erledigt
        </button>
      )}
    </div>,
    // Vitamin D
    <div key="vitd" className="flex h-full flex-col items-center justify-center text-center">
      <div className="font-data text-[9px] uppercase tracking-[0.2em] text-on-ink/50">Vitamin D</div>
      <div className="mt-1 font-data text-[38px] font-medium leading-none text-on-ink">{last}</div>
      <div className="font-data text-[10px] text-on-ink/45">{vitd.unit}</div>
      <div className="mt-3 rounded-full bg-fv/20 px-3 py-1 font-data text-[9px] uppercase tracking-[0.14em] text-fv">{status(vitd).label}</div>
    </div>,
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-mist p-6">
      <div className="flex gap-1 rounded-full bg-card p-1 ring-1 ring-border">
        {(["apple", "wear"] as const).map((k) => (
          <button key={k} onClick={() => setShape(k)}
            className={`rounded-full px-4 py-1.5 text-sm ${shape === k ? "bg-ink text-on-ink" : "text-ink/60"}`}>
            {k === "apple" ? "Apple Watch" : "Wear OS"}
          </button>
        ))}
      </div>

      <div className="rounded-[64px] bg-ink/90 p-3 shadow-2xl" style={shape === "wear" ? { borderRadius: "9999px" } : undefined}>
        <button
          onClick={() => setScreen((screen + 1) % screens.length)}
          aria-label="Nächster Bildschirm"
          className={`relative block size-[200px] overflow-hidden bg-ink ${shape === "wear" ? "rounded-full" : "rounded-[48px]"}`}
        >
          <div className="pointer-events-none absolute inset-0 hero-glow opacity-40" />
          <div className="relative h-full">{screens[screen]}</div>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {screens.map((_, i) => (
              <span key={i} className={`size-1.5 rounded-full ${i === screen ? "bg-fv" : "bg-on-ink/20"}`} />
            ))}
          </div>
        </button>
      </div>

      <p className="max-w-[32ch] text-center text-sm text-ink/55">Tippe auf das Display, um zum nächsten Bildschirm zu wechseln.</p>
      <Link to="/" className="text-sm font-medium text-fv-deep">← Zur Handy-App</Link>
    </div>
  );
}
