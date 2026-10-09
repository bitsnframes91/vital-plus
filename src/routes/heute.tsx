import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
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
import { TodayMascot } from "@/components/TodayMascot";
import { StepsIcon } from "@/components/StepsIcon";
import sleepGfx from "@/assets/schlaf.png.asset.json";
import goalsGfx from "@/assets/tagesziele.png.asset.json";
import { MovementDialog } from "@/components/MovementDialog";
import { VivoBrand } from "@/components/VivoBrand";
import { Activity, ChevronRight, Clock, FlaskConical, Heart, Leaf, Plus, Salad, Sun, UserRound, Watch } from "lucide-react";
import { todayKey } from "@/lib/daily-goals";
import type { RoutineTip } from "@/lib/deficiency-routines";
import { nutritionTargets } from "@/lib/nutrition-targets";
import { micronutrientGaps, nutritionGaps } from "@/lib/nutrition-products";
import { suggestedProducts } from "@/lib/plan-products";
import { goalProducts } from "@/lib/goal-plan";
import { TodayNutritionGoals } from "@/components/TodayNutritionGoals";
import { nutritionAlerts } from "@/lib/nutrition-alerts";

const tipIcon = {
  food: Salad,
  sun: Sun,
  walk: StepsIcon,
  clock: Clock,
  heart: Heart,
} satisfies Record<RoutineTip["icon"], React.ComponentType<{ className?: string }>>;

export const Route = createFileRoute("/heute")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Heute — Vitalplus" },
      { name: "description", content: "Dein persönliches Tages-Dashboard für Ernährung, Vitalstoffe und Laborwerte." },
      { property: "og:title", content: "Heute — Vitalplus" },
      { property: "og:description", content: "Messen, verstehen, handeln, überprüfen – dein Gesundheitsbegleiter von Fairvital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Today,
});

function Today() {
  useLanguage();
  const { s } = useStore();
  const [moveOpen, setMoveOpen] = useState(false);
  const goTo = useNavigate();
  useEffect(() => { if (s.account && !s.onboarded) goTo({ to: "/onboarding" }); }, [s.account, s.onboarded]);
  const measured = reportMarkers(s.aiPlan, s.labs);
  const featured = measured[0];
  const featuredProduct = featured ? productForMarker(featured) : undefined;
  const last = featured?.history.at(-1);
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
  const microGaps = micronutrientGaps(todayMeals);
  const labIds = new Set(suggestedProducts(s.aiPlan, s.labs).map((e) => e.product.shopwareId));
  const goalSuggestions = goalProducts(s.onboarded ? s.goals : []).filter((e) => !labIds.has(e.product.shopwareId));
  const alerts = nutritionAlerts(todayMeals, nutritionTargets(s.body));
  const fmtNum = (n: number) => n.toLocaleString(languageLocale(), { maximumFractionDigits: 1 });

  return (
    <AppShell>
      <header className="vivo-today-header today-mascot-header relative overflow-hidden px-6 pt-8 pb-7">
        <TodayMascot />
        <div className="relative">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label={translateText("Vitalplus Startseite")}><VivoBrand /></Link>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground" title={translateText("Uhr")}><Link to="/uhr" aria-label={translateText("Uhr")}><Watch /></Link></Button>
              <Button asChild variant="ghost" size="icon" className="rounded-full bg-warm-soft text-muted-foreground" title={translateText("Profil")}><Link to="/profil" aria-label={translateText("Profil")}><UserRound /></Link></Button>
            </div>
          </div>
          <p className="today-mascot-greeting mt-8 text-[13px] font-medium text-foreground"><Localized>{"Guten Morgen, "}</Localized><Localized>{s.name}</Localized><Localized>{"."}</Localized></p>
          <h1 className="today-mascot-heading mt-1 text-[29px] font-bold leading-[1.15] text-foreground"><Localized>{"Gesünder leben."}</Localized><br /><Localized>{"Glücklicher sein."}</Localized></h1>
          <button
            type="button"
            onClick={() => setTipOpen(true)}
            aria-label={translateText("Tipp des Tages öffnen")}
            className="vivo-focus mt-6 flex h-auto min-h-[116px] w-full items-start gap-3 whitespace-normal rounded-2xl bg-card/95 px-4 py-4 text-left hover:bg-card"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-soft text-fresh"><TipIcon className="size-7" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium text-muted-foreground">
                <Localized>{tip.marker ? `Tipp des Tages · ${tip.marker.name}` : "Tipp des Tages"}</Localized>
              </span>
              <span className="mt-1 block text-[15px] font-bold leading-snug"><Localized>{tip.tip.title}</Localized></span>
              <span className="mt-1.5 block text-[11px] font-medium leading-relaxed text-muted-foreground line-clamp-2"><Localized>{tip.tip.text}</Localized></span>
            </span>
            <span className="my-auto grid size-7 shrink-0 place-items-center rounded-full bg-muted text-fv-deep"><ChevronRight /></span>
          </button>
          <Dialog open={tipOpen} onOpenChange={setTipOpen}>
            <DialogContent className="rounded-3xl sm:max-w-sm">
              <DialogHeader>
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-teal-soft text-fresh"><TipIcon className="size-8" /></span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  <Localized>{tip.marker ? `Tipp des Tages · ${tip.marker.name}` : "Tipp des Tages"}</Localized>
                </span>
                <DialogTitle className="text-center text-[19px] font-bold leading-snug"><Localized>{tip.tip.title}</Localized></DialogTitle>
                <DialogDescription className="text-center text-[14px] font-medium leading-relaxed text-foreground/80">
                  <Localized>{tip.tip.text}</Localized>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="px-6 pt-1">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[14px] font-bold"><Localized>{"Dein Fortschritt"}</Localized></h2><Link to="/gesundheit" className="text-[11px] text-fv-deep"><Localized>{"Alle ansehen"}</Localized></Link></div>
        <div className="grid grid-cols-3 gap-3">
          <Link to="/gesundheit" className="vivo-progress bg-teal-soft text-fv-deep">
            <StepsIcon className="mx-auto size-7" /><div className="mt-2 text-[20px] font-bold text-foreground"><Localized>{"—"}</Localized></div><div className="text-[10px] text-muted-foreground"><Localized>{"Schritte"}</Localized></div><MiniBars tone="teal" />
          </Link>
          <Link to="/ernaehrung" className="vivo-progress bg-fresh-soft text-fresh">
            <img src={goalsGfx.url} alt="" className="mx-auto size-7 object-contain" /><div className="mt-2 text-[20px] font-bold text-foreground"><Localized>{alerts.length}</Localized></div><div className="text-[10px] text-muted-foreground"><Localized>{"Tagesziele"}</Localized></div><MiniBars tone="fresh" />
          </Link>
          <Link to="/gesundheit" className="vivo-progress bg-sky-soft text-sky">
            <img src={sleepGfx.url} alt="" className="vivo-sway mx-auto size-7" /><div className="mt-2 text-[20px] font-bold text-foreground"><Localized>{"—"}</Localized></div><div className="text-[10px] text-muted-foreground"><Localized>{"Schlaf"}</Localized></div><MiniBars tone="sky" />
          </Link>
        </div>
      </section>
      <section className="px-6 pt-6 pb-3">
        <h2 className="mb-3 text-[14px] font-bold"><Localized>{"Schnellzugriff"}</Localized></h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <button type="button" onClick={() => setMoveOpen(true)} className="vivo-quick"><span className="bg-teal-soft text-fv-deep"><Activity /></span><span><Localized>{"Bewegung"}</Localized></span></button>
          <Link to="/plan" className="vivo-quick"><span className="bg-fresh-soft text-fresh"><Leaf /></span><span><Localized>{"Mein Plan"}</Localized></span></Link>
          <Link to="/ernaehrung" className="vivo-quick"><span className="bg-fresh-soft text-fresh"><Salad /></span><span><Localized>{"Ernährung"}</Localized></span></Link>
          <Link to="/labor" className="vivo-quick"><span className="bg-sky-soft text-sky"><FlaskConical /></span><span><Localized>{"Labor"}</Localized></span></Link>
        </div>
      </section>

      <TodayNutritionGoals />

      {goalSuggestions.length > 0 && <section className="mt-4 space-y-3 px-4" aria-label={translateText("Fairvital Empfehlungen zu deinen Zielen")}>
        <h2 className="px-1 text-[15px] font-semibold"><Localized>{"Passend zu deinen Zielen"}</Localized></h2>
        {goalSuggestions.map(({ product, goals }) => <a key={product.shopwareId} href={product.url} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
          <img src={product.image} alt={translateText(product.name)} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
          <div className="min-w-0 flex-1">
            <div className="eyebrow"><Localized>{goals.join(" · ")}</Localized></div>
            <div className="mt-1 text-[15px] font-semibold"><Localized>{product.name}</Localized></div>
            <div className="text-xs text-muted-foreground"><Localized>{product.short}</Localized></div>
            <div className="mt-1 text-xs font-semibold text-fv-deep"><Localized>{"Bei Fairvital ansehen →"}</Localized></div>
          </div>
        </a>)}
        <p className="px-1 text-[11px] text-muted-foreground"><Localized>{"Einnahme bitte ärztlich abklären, besonders bei Vorerkrankungen oder Medikamenten."}</Localized></p>
      </section>}

      {(gaps.length > 0 || microGaps.length > 0) && <section className="mt-4 space-y-3 px-4" data-nutrition-gaps>
        <h2 className="px-1 text-[15px] font-semibold"><Localized>{"Das fehlt dir noch für heute:"}</Localized></h2>
        {gaps.map((g) => <a key={g.key} href={g.href} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
          <img src={g.product.image} alt={translateText(g.product.name)} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
          <div className="min-w-0 flex-1">
            <div className="eyebrow"><Localized>{g.key === "protein" ? "Protein" : "Ballaststoffe"}</Localized><Localized>{" · noch ca. "}</Localized><Localized>{fmtNum(Math.max(g.missing, 0))}</Localized><Localized>{" g"}</Localized></div>
            <div className="mt-1 text-[15px] font-semibold"><Localized>{g.product.name}</Localized></div>
            <div className="text-xs text-muted-foreground"><Localized>{g.reason}</Localized></div>
            <div className="mt-1 text-xs font-semibold text-fv-deep"><Localized>{"Bei Fairvital ansehen →"}</Localized></div>
          </div>
        </a>)}
          {microGaps.map((g) => <a key={g.key} href={g.href} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
            <img src={g.product.image} alt={translateText(g.product.name)} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
            <div className="min-w-0 flex-1">
              <div className="eyebrow"><Localized>{g.name}</Localized><Localized>{" · noch ca. "}</Localized><Localized>{fmtNum(Math.max(g.missing, 0))}</Localized>{" "}{g.unit}</div>
              <div className="mt-1 text-[15px] font-semibold"><Localized>{g.product.name}</Localized></div>
              <div className="text-xs text-muted-foreground"><Localized>{g.reason}</Localized></div>
              <div className="mt-1 text-xs font-semibold text-fv-deep"><Localized>{"Bei Fairvital ansehen →"}</Localized></div>
            </div>
          </a>)}
        <p className="px-1 text-[11px] text-muted-foreground"><Localized>{"Ergänzung zu einer ausgewogenen Ernährung, kein Ersatz für Mahlzeiten."}</Localized></p>
      </section>}

      <MovementDialog open={moveOpen} onOpenChange={setMoveOpen} />
      {featured && last && <section className="mt-4 px-4">
        <div className="card-surface p-5">
          <Link to="/labor" className="block">
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow"><Localized>{featured.name}</Localized></div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-data text-[30px] font-medium"><Localized>{last.value}</Localized></span>
                  <span className="font-data text-[13px] text-ink/45"><Localized>{featured.unit}</Localized></span>
                </div>
                <div className="mt-0.5 max-w-[26ch] text-[12px] text-ink/45"><Localized>{"Vom "}</Localized><Localized>{fmtDate(last.date)}</Localized><Localized>{" · Zielbereich "}</Localized><Localized>{featured.target[0]}</Localized><Localized>{"–"}</Localized><Localized>{featured.target[1]}</Localized></div>
              </div>
              <span className="rounded-full bg-fv/10 px-2.5 py-1 font-data text-[12px] uppercase tracking-normal text-fv-deep"><Localized>{status(featured).label}</Localized></span>
            </div>
            <div className="mt-4"><RangeBar marker={featured} /></div>
          </Link>
          {featuredProduct && (
            <a href={featuredProduct.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded-2xl border bg-background p-3">
              <img src={featuredProduct.image} alt={translateText(featuredProduct.name)} className="size-14 shrink-0 rounded-xl object-contain" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="eyebrow"><Localized>{"Fairvital Ergänzung"}</Localized></div>
                <div className="truncate text-[14px] font-semibold text-ink"><Localized>{featuredProduct.name}</Localized></div>
                <div className="text-[12px] text-ink/50"><Localized>{featuredProduct.short}</Localized></div>
              </div>
              <span className="text-[12px] font-semibold text-fv-deep"><Localized>{"Im Shop →"}</Localized></span>
            </a>
          )}
          <div className="mt-3 flex items-center gap-2 border-t pt-3 text-[13px] text-ink/55">
            <Icon d="M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7" className="size-4 text-ink/40" /><Localized>{" Nachkontrolle empfohlen in "}</Localized><Localized>{featured.retestWeeks}</Localized><Localized>{" Wochen. "}</Localized></div>
        </div>
      </section>}

      <section className="mt-4 px-4">
        <WeekRecap />
      </section>
    </AppShell>
  );
}

function MiniBars({ tone }: { tone: "teal" | "fresh" | "sky" }) {
  useLanguage();
  return <div aria-hidden="true" className={`vivo-mini-bars vivo-mini-bars-${tone}`}>
    {[12, 22, 16, 30, 21, 26, 35, 43, 52].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}
  </div>;
}



function WeekRecap() {
  useLanguage();
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
      <div className="eyebrow"><Localized>{"Die letzten 7 Tage"}</Localized></div>
      <h2 className="mt-1 text-[18px] font-semibold tracking-tight"><Localized>{"Woche im Rückblick"}</Localized></h2>

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
                <Localized>{new Date(d + "T00:00:00").toLocaleDateString(languageLocale(), { weekday: "short" })}</Localized>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 border-t pt-4">
        <div className="border-r pr-3">
          <div className="font-data text-[20px] font-medium"><Localized>{goalCount}</Localized></div>
          <div className="mt-0.5 text-[11px] leading-snug text-ink/45"><Localized>{"Tagesziele erledigt"}</Localized></div>
        </div>
        <div className="border-r px-3">
          <div className="font-data text-[20px] font-medium"><Localized>{meals.length}</Localized></div>
          <div className="mt-0.5 text-[11px] leading-snug text-ink/45"><Localized>{"Mahlzeiten erfasst"}</Localized></div>
        </div>
        <div className="pl-3">
          {latestW ? (
            <>
              <div className="font-data text-[20px] font-medium"><Localized>{latestW[1]}</Localized><span className="text-[13px] text-ink/45"><Localized>{" kg"}</Localized></span></div>
              <div className="mt-0.5 text-[11px] leading-snug text-ink/45">
                <Localized>{diff === null ? "Gewicht erfasst" : diff === 0 ? "konstant" : diff > 0 ? `▲ ${diff} kg` : `▼ ${Math.abs(diff)} kg`}</Localized>
              </div>
            </>
          ) : (
            <>
              <div className="font-data text-[20px] font-medium text-ink/25"><Localized>{"—"}</Localized></div>
              <div className="mt-0.5 text-[11px] leading-snug text-ink/45"><Localized>{"Gewicht erfassen"}</Localized></div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

