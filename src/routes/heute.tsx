import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Icon } from "@/components/AppShell";
import { RangeBar } from "@/components/RangeBar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { fmtDate, status } from "@/lib/data";
import { productForMarker, reportMarkers } from "@/lib/plan-products";
import { dailyTip, msUntilNextTip } from "@/lib/daily-tip";
import todayHero from "@/assets/heute-collage.png.asset.json";
import { StepsIcon } from "@/components/StepsIcon";
import sleepGfx from "@/assets/schlaf.png.asset.json";
import goalsGfx from "@/assets/tagesziele.png.asset.json";
import { MovementDialog } from "@/components/MovementDialog";
import { VivoBrand } from "@/components/VivoBrand";
import { Activity, ChevronRight, Clock, FlaskConical, Heart, Leaf, Plus, Salad, Sun, UserRound, Watch } from "lucide-react";
import { dailyGoals, todayKey } from "@/lib/daily-goals";
import type { RoutineTip } from "@/lib/deficiency-routines";
import { nutritionTargets } from "@/lib/nutrition-targets";
import { nutritionGaps } from "@/lib/nutrition-products";
import { suggestedProducts } from "@/lib/plan-products";
import { goalProducts } from "@/lib/goal-plan";

const tipIcon = {
  food: Salad,
  sun: Sun,
  walk: StepsIcon,
  clock: Clock,
  heart: Heart,
} satisfies Record<RoutineTip["icon"], React.ComponentType<{ className?: string }>>;

export const Route = createFileRoute("/heute")({
  head: () => ({
    meta: [
      { title: "Heute — Vivo" },
      { name: "description", content: "Dein persönliches Tages-Dashboard für Ernährung, Vitalstoffe und Laborwerte." },
      { property: "og:title", content: "Heute — Vivo" },
      { property: "og:description", content: "Messen, verstehen, handeln, überprüfen – dein Gesundheitsbegleiter von Fairvital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Today,
});

function Today() {
  const { s, set } = useStore();
  const [moveOpen, setMoveOpen] = useState(false);
  const goTo = useNavigate();
  useEffect(() => { if (s.account && !s.onboarded) goTo({ to: "/onboarding" }); }, [s.account, s.onboarded]);
  const [selectedGoalKey, setSelectedGoalKey] = useState<string | null>(null);
  const measured = reportMarkers(s.aiPlan, s.labs);
  const featured = measured[0];
  const featuredProduct = featured ? productForMarker(featured) : undefined;
  const last = featured?.history.at(-1);
  const { fromPlan, goals: actions } = dailyGoals(s.aiPlan, s.onboarded ? s.goals : [], s.goalOff);
  const selectedGoal = actions.find((a) => a.key === selectedGoalKey);
  const done = actions.filter((a) => s.actionsDone[a.key]).length;
  const allDone = actions.length > 0 && done === actions.length;
  const [tipNow, setTipNow] = useState(() => new Date());
  const [tipOpen, setTipOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setTipNow(new Date()); setTipOpen(false); }, msUntilNextTip(tipNow) + 1000);
    return () => clearTimeout(t);
  }, [tipNow]);
  const tip = dailyTip(s.aiPlan, s.labs, s.account?.userId, tipNow);
  const TipIcon = tipIcon[tip.tip.icon];
  const today = todayKey();

  const todayMeals = s.meals.filter((m) => m.date === today);
  const mealTotals = { kcal: 0, protein: 0, fiber: 0, carbs: 0, fat: 0 };
  for (const m of todayMeals) { mealTotals.kcal += m.kcal || 0; mealTotals.protein += m.protein || 0; mealTotals.fiber += m.fiber || 0; mealTotals.carbs += m.carbs || 0; mealTotals.fat += m.fat || 0; }
  const gaps = nutritionGaps(mealTotals, nutritionTargets(s.body), todayMeals.length);
  const labIds = new Set(suggestedProducts(s.aiPlan, s.labs).map((e) => e.product.shopwareId));
  const goalSuggestions = goalProducts(s.onboarded ? s.goals : []).filter((e) => !labIds.has(e.product.shopwareId));
  const fmtNum = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

  useEffect(() => {
    if (!!(s.fullDays ?? {})[today] === allDone) return;
    set({ fullDays: { ...(s.fullDays ?? {}), [today]: allDone } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const streakN = (() => {
    let n = 0;
    const d = new Date();
    if (!allDone) d.setDate(d.getDate() - 1);
    for (;;) {
      if (!(s.fullDays ?? {})[d.toISOString().slice(0, 10)]) break;
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  })();

  return (
    <AppShell>
      <header className="vivo-today-header relative overflow-hidden px-6 pt-8 pb-7">
        <img src={todayHero.url} alt="Ganzheitliches Leben in Bewegung — Forschung, Sport und Vitalität" width={1374} height={1145} fetchPriority="high" className="absolute inset-0 size-full object-cover object-center" />
        <div className="today-image-overlay absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="Vivo Startseite"><VivoBrand /></Link>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground" title="Uhr"><Link to="/uhr"><Watch /></Link></Button>
              <Button asChild variant="ghost" size="icon" className="rounded-full bg-warm-soft text-muted-foreground" title="Profil"><Link to="/profil"><UserRound /></Link></Button>
            </div>
          </div>
          <p className="mt-8 text-[13px] font-medium text-foreground">Guten Morgen, {s.name}.</p>
          <h1 className="mt-1 max-w-[280px] text-[29px] font-bold leading-[1.15] text-foreground">Gesünder leben.<br />Glücklicher sein.</h1>
          <button
            type="button"
            onClick={() => setTipOpen(true)}
            aria-label="Tipp des Tages öffnen"
            className="vivo-focus mt-6 flex h-auto min-h-[116px] w-full items-start gap-3 whitespace-normal rounded-2xl bg-card/95 px-4 py-4 text-left hover:bg-card"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-soft text-fresh"><TipIcon className="size-7" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium text-muted-foreground">
                {tip.marker ? `Tipp des Tages · ${tip.marker.name}` : "Tipp des Tages"}
              </span>
              <span className="mt-1 block text-[15px] font-bold leading-snug">{tip.tip.title}</span>
              <span className="mt-1.5 block text-[11px] font-medium leading-relaxed text-muted-foreground line-clamp-2">{tip.tip.text}</span>
            </span>
            <span className="my-auto grid size-7 shrink-0 place-items-center rounded-full bg-muted text-fv-deep"><ChevronRight /></span>
          </button>
          <Dialog open={tipOpen} onOpenChange={setTipOpen}>
            <DialogContent className="rounded-3xl sm:max-w-sm">
              <DialogHeader>
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-teal-soft text-fresh"><TipIcon className="size-8" /></span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {tip.marker ? `Tipp des Tages · ${tip.marker.name}` : "Tipp des Tages"}
                </span>
                <DialogTitle className="text-center text-[19px] font-bold leading-snug">{tip.tip.title}</DialogTitle>
                <DialogDescription className="text-center text-[14px] font-medium leading-relaxed text-foreground/80">
                  {tip.tip.text}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="px-6 pt-1">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[14px] font-bold">Dein Fortschritt</h2><Link to="/gesundheit" className="text-[11px] text-fv-deep">Alle ansehen</Link></div>
        <div className="grid grid-cols-3 gap-3">
          <Link to="/gesundheit" className="vivo-progress bg-teal-soft text-fv-deep">
            <StepsIcon className="mx-auto size-7" /><div className="mt-2 text-[20px] font-bold text-foreground">—</div><div className="text-[10px] text-muted-foreground">Schritte</div><MiniBars tone="teal" />
          </Link>
          <Link to="/plan" className="vivo-progress bg-fresh-soft text-fresh">
            <img src={goalsGfx.url} alt="" className="mx-auto size-7 object-contain" /><div className="mt-2 text-[20px] font-bold text-foreground">{done}/{actions.length}</div><div className="text-[10px] text-muted-foreground">Tagesziele</div><MiniBars tone="fresh" />
          </Link>
          <Link to="/gesundheit" className="vivo-progress bg-sky-soft text-sky">
            <img src={sleepGfx.url} alt="" className="vivo-sway mx-auto size-7" /><div className="mt-2 text-[20px] font-bold text-foreground">—</div><div className="text-[10px] text-muted-foreground">Schlaf</div><MiniBars tone="sky" />
          </Link>
        </div>
      </section>
      <section className="px-6 pt-6 pb-3">
        <h2 className="mb-3 text-[14px] font-bold">Schnellzugriff</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <button type="button" onClick={() => setMoveOpen(true)} className="vivo-quick"><span className="bg-teal-soft text-fv-deep"><Activity /></span><span>Bewegung</span></button>
          <Link to="/plan" className="vivo-quick"><span className="bg-fresh-soft text-fresh"><Leaf /></span><span>Mein Plan</span></Link>
          <Link to="/ernaehrung" className="vivo-quick"><span className="bg-fresh-soft text-fresh"><Salad /></span><span>Ernährung</span></Link>
          <Link to="/labor" className="vivo-quick"><span className="bg-sky-soft text-sky"><FlaskConical /></span><span>Labor</span></Link>
        </div>
      </section>

      <section className="mt-4 px-4">
        <div className="flex items-baseline justify-between px-1 pb-2">
          <span className="eyebrow">Tagesziele{fromPlan ? " · aus deinem Plan" : ""}</span>
          <span className="font-data text-[12px] text-fv-deep">{done}/{actions.length}</span>
        </div>
        {!fromPlan && !allDone && (
          <Link to="/labor" className="mb-2 block rounded-[16px] border border-dashed px-4 py-3 text-[13px] text-ink/55">
            Beispielziele. Wähle deine Ziele im Fragebogen oder lade deinen Laborbefund hoch – dann entstehen deine Tagesziele aus deinem Plan →
          </Link>
        )}
        {fromPlan && actions.length === 0 && (
          <Link to="/plan" className="mb-2 block rounded-[16px] border border-dashed px-4 py-3 text-[13px] text-ink/55">
            Keine Schritte für heute ausgewählt. Wähle sie in deinem Plan aus →
          </Link>
        )}
        {allDone ? (
          <Link
            to="/plan"
            aria-label="Alle Tagesziele erreicht – Tag abgeschlossen"
            className="card-surface flex w-full items-center gap-3 rounded-[16px] bg-fresh-soft/60 p-4 text-left"
          >
            <span className="grid size-12 shrink-0 place-items-center">
              <img src={goalsGfx.url} alt="" className="size-12 object-contain" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold leading-snug">Alle Tagesziele erreicht</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink/45">
                Tag abgeschlossen · {streakN === 1 ? "Tag 1 in Folge" : `${streakN} Tage in Folge`} · morgen starten neue Ziele
              </span>
            </span>
            <Icon d="m9 18 6-6-6-6" className="size-4 shrink-0 text-ink/40" />
          </Link>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => {
              const ok = s.actionsDone[a.key];
            return (
              <Button
                key={a.key}
                type="button"
                variant="ghost"
                onClick={() => setSelectedGoalKey(a.key)}
                aria-label={`${a.title} – Details öffnen`}
                className="card-surface h-auto min-h-[72px] w-full justify-start gap-3 whitespace-normal rounded-[16px] px-4 py-3 text-left hover:bg-card"
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${ok ? "bg-fv/10 text-fv-deep" : "bg-ink/5 text-ink/40"}`}>
                  <Icon d={ok ? "M4 12l5 5L20 6" : "M12 6v6l4 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18"} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{a.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[12px] text-ink/45">{a.sub} · {ok ? "erreicht" : "ausstehend"}</div>
                </div>
                <Icon d="m9 18 6-6-6-6" className="size-4 shrink-0 text-ink/40" />
              </Button>
            );
          })}
          </div>
        )}
      </section>

      {goalSuggestions.length > 0 && <section className="mt-4 space-y-3 px-4" aria-label="Fairvital Empfehlungen zu deinen Zielen">
        <h2 className="px-1 text-[15px] font-semibold">Passend zu deinen Zielen</h2>
        {goalSuggestions.map(({ product, goals }) => <a key={product.shopwareId} href={product.url} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
          <img src={product.image} alt={product.name} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
          <div className="min-w-0 flex-1">
            <div className="eyebrow">{goals.join(" · ")}</div>
            <div className="mt-1 text-[15px] font-semibold">{product.name}</div>
            <div className="text-xs text-muted-foreground">{product.short}</div>
            <div className="mt-1 text-xs font-semibold text-fv-deep">Bei Fairvital ansehen →</div>
          </div>
        </a>)}
        <p className="px-1 text-[11px] text-muted-foreground">Einnahme bitte ärztlich abklären, besonders bei Vorerkrankungen oder Medikamenten.</p>
      </section>}

      {gaps.length > 0 && <section className="mt-4 space-y-3 px-4" data-nutrition-gaps>
        <h2 className="px-1 text-[15px] font-semibold">Das fehlt dir noch für heute:</h2>
        {gaps.map((g) => <a key={g.key} href={g.href} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
          <img src={g.product.image} alt={g.product.name} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
          <div className="min-w-0 flex-1">
            <div className="eyebrow">{g.key === "protein" ? "Protein" : "Ballaststoffe"} · noch ca. {fmtNum(Math.max(g.missing, 0))} g</div>
            <div className="mt-1 text-[15px] font-semibold">{g.product.name}</div>
            <div className="text-xs text-muted-foreground">{g.reason}</div>
            <div className="mt-1 text-xs font-semibold text-fv-deep">Bei Fairvital ansehen →</div>
          </div>
        </a>)}
        <p className="px-1 text-[11px] text-muted-foreground">Ergänzung zu einer ausgewogenen Ernährung, kein Ersatz für Mahlzeiten.</p>
      </section>}

      <MovementDialog open={moveOpen} onOpenChange={setMoveOpen} />
      <Dialog open={selectedGoalKey !== null && !!selectedGoal} onOpenChange={(open) => { if (!open) setSelectedGoalKey(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] max-w-[420px] overflow-y-auto rounded-lg border-border bg-card p-6">
          {selectedGoal && (
            <>
              <DialogHeader className="pr-5 text-left">
                <span className="eyebrow">Tagesziel{fromPlan ? " · aus deinem Plan" : ""}</span>
                <DialogTitle className="mt-2 text-[22px] leading-snug tracking-normal text-foreground">{selectedGoal.title}</DialogTitle>
                <DialogDescription className="pt-3 text-[16px] leading-relaxed text-muted-foreground">{selectedGoal.sub}</DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                className="mt-4 w-full whitespace-normal py-3"
                variant={s.actionsDone[selectedGoal.key] ? "outline" : "default"}
                onClick={() => {
                  set({ actionsDone: { ...s.actionsDone, [selectedGoal.key]: !s.actionsDone[selectedGoal.key] } });
                  setSelectedGoalKey(null);
                }}
              >
                {s.actionsDone[selectedGoal.key] ? "Erledigung zurücknehmen" : "Als erledigt markieren"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>


      {featured && last && <section className="mt-4 px-4">
        <div className="card-surface p-5">
          <Link to="/labor" className="block">
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">{featured.name}</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-data text-[30px] font-medium">{last.value}</span>
                  <span className="font-data text-[13px] text-ink/45">{featured.unit}</span>
                </div>
                <div className="mt-0.5 max-w-[26ch] text-[12px] text-ink/45">Vom {fmtDate(last.date)} · Zielbereich {featured.target[0]}–{featured.target[1]}</div>
              </div>
              <span className="rounded-full bg-fv/10 px-2.5 py-1 font-data text-[12px] uppercase tracking-normal text-fv-deep">{status(featured).label}</span>
            </div>
            <div className="mt-4"><RangeBar marker={featured} /></div>
          </Link>
          {featuredProduct && (
            <a href={featuredProduct.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded-2xl border bg-background p-3">
              <img src={featuredProduct.image} alt={featuredProduct.name} className="size-14 shrink-0 rounded-xl object-contain" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="eyebrow">Fairvital Ergänzung</div>
                <div className="truncate text-[14px] font-semibold text-ink">{featuredProduct.name}</div>
                <div className="text-[12px] text-ink/50">{featuredProduct.short}</div>
              </div>
              <span className="text-[12px] font-semibold text-fv-deep">Im Shop →</span>
            </a>
          )}
          <div className="mt-3 flex items-center gap-2 border-t pt-3 text-[13px] text-ink/55">
            <Icon d="M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7" className="size-4 text-ink/40" />
            Nachkontrolle empfohlen in {featured.retestWeeks} Wochen.
          </div>
        </div>
      </section>}

      <section className="mt-4 px-4">
        <WeekRecap />
      </section>
    </AppShell>
  );
}

function MiniBars({ tone }: { tone: "teal" | "fresh" | "sky" }) {
  return <div aria-hidden="true" className={`vivo-mini-bars vivo-mini-bars-${tone}`}>
    {[12, 22, 16, 30, 21, 26, 35, 43, 52].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}
  </div>;
}

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function WeekRecap() {
  const { s } = useStore();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const goalCount = days.reduce((sum, d) => sum + (s.weekLog[d] ?? 0), 0);
  const meals = s.meals.filter((m) => days.includes(m.date));
  const weights = Object.entries(s.weightLog).sort(([a], [b]) => a.localeCompare(b));
  const latestW = weights.at(-1);
  const prevW = weights.length > 1 ? weights[weights.length - 2] : null;
  const diff = latestW && prevW ? +(latestW[1] - prevW[1]).toFixed(1) : null;
  const maxDay = Math.max(...days.map((d) => s.weekLog[d] ?? 0), 1);

  return (
    <Link to="/gesundheit" className="card-surface block p-5">
      <div className="eyebrow">Die letzten 7 Tage</div>
      <h2 className="mt-1 text-[18px] font-semibold tracking-tight">Woche im Rückblick</h2>

      <div aria-hidden="true" className="mt-4 flex h-16 items-end justify-between gap-2">
        {days.map((d, i) => {
          const count = s.weekLog[d] ?? 0;
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end justify-center">
                <span
                  className={`w-full max-w-[26px] rounded-t-[6px] transition-all ${count > 0 ? (i === days.length - 1 ? "bg-fv-deep" : "bg-fv/30") : "bg-ink/10"}`}
                  style={{ height: `${Math.max(count, 0.2) / maxDay * 100}%` }}
                />
              </div>
              <span className={`font-data text-[10px] ${i === days.length - 1 ? "text-fv-deep" : "text-ink/35"}`}>
                {WEEKDAY_SHORT[new Date(d + "T00:00:00").getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 border-t pt-4">
        <div className="border-r pr-3">
          <div className="font-data text-[20px] font-medium">{goalCount}</div>
          <div className="mt-0.5 text-[11px] leading-snug text-ink/45">Tagesziele erledigt</div>
        </div>
        <div className="border-r px-3">
          <div className="font-data text-[20px] font-medium">{meals.length}</div>
          <div className="mt-0.5 text-[11px] leading-snug text-ink/45">Mahlzeiten erfasst</div>
        </div>
        <div className="pl-3">
          {latestW ? (
            <>
              <div className="font-data text-[20px] font-medium">{latestW[1]}<span className="text-[13px] text-ink/45"> kg</span></div>
              <div className="mt-0.5 text-[11px] leading-snug text-ink/45">
                {diff === null ? "Gewicht erfasst" : diff === 0 ? "konstant" : diff > 0 ? `▲ ${diff} kg` : `▼ ${Math.abs(diff)} kg`}
              </div>
            </>
          ) : (
            <>
              <div className="font-data text-[20px] font-medium text-ink/25">—</div>
              <div className="mt-0.5 text-[11px] leading-snug text-ink/45">Gewicht erfassen</div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

