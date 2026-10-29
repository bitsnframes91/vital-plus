import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Icon } from "@/components/AppShell";
import { RangeBar } from "@/components/RangeBar";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { fmtDate, status } from "@/lib/data";
import { productForMarker, reportMarkers } from "@/lib/plan-products";
import { TodayMascot } from "@/components/TodayMascot";
import { VivoBrand } from "@/components/VivoBrand";
import { UserRound } from "lucide-react";
import { TodayWellnessGoals } from "@/components/TodayWellnessGoals";
import { todayKey } from "@/lib/daily-goals";
import { nutritionTargets } from "@/lib/nutrition-targets";
import { micronutrientGaps, nutritionGaps } from "@/lib/nutrition-products";
import { suggestedProducts } from "@/lib/plan-products";
import { goalProducts } from "@/lib/goal-plan";
import { TodayNutritionGoals } from "@/components/TodayNutritionGoals";
import { greetingFor } from "@/lib/greeting";

export const Route = createFileRoute("/heute")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Heute — Vital Plus" },
      { name: "description", content: "Dein persönliches Tages-Dashboard für Ernährung, Vitalstoffe und Laborwerte." },
      { property: "og:title", content: "Heute — Vital Plus" },
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
  const goTo = useNavigate();
  useEffect(() => { if (s.account && !s.onboarded) goTo({ to: "/onboarding" }); }, [s.account, s.onboarded]);
  const [greeting, setGreeting] = useState(greetingFor());
  useEffect(() => {
    const refresh = () => setGreeting(greetingFor());
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, []);
  const measured = reportMarkers(s.aiPlan, s.labs);
  const featured = measured[0];
  const featuredProduct = featured ? productForMarker(featured) : undefined;
  const last = featured?.history.at(-1);
  const today = todayKey();

  const todayMeals = s.meals.filter((m) => m.date === today);
  const mealTotals = { kcal: 0, protein: 0, fiber: 0, carbs: 0, fat: 0 };
  for (const m of todayMeals) { mealTotals.kcal += m.kcal || 0; mealTotals.protein += m.protein || 0; mealTotals.fiber += m.fiber || 0; mealTotals.carbs += m.carbs || 0; mealTotals.fat += m.fat || 0; }
  const gaps = nutritionGaps(mealTotals, nutritionTargets(s.body), todayMeals.length);
  const microGaps = micronutrientGaps(todayMeals);
  const labIds = new Set(suggestedProducts(s.aiPlan, s.labs).map((e) => e.product.shopwareId));
  const goalSuggestions = goalProducts(s.onboarded ? s.goals : []).filter((e) => !labIds.has(e.product.shopwareId));
  const fmtNum = (n: number) => n.toLocaleString(languageLocale(), { maximumFractionDigits: 1 });

  return (
    <AppShell>
      <header className="today-goals-header today-mascot-header relative overflow-hidden px-6 pt-8 pb-7">
        <TodayMascot />
        <div className="relative">
          <div className="flex justify-center">
            <Link to="/" aria-label={translateText("Vital Plus Startseite")}><VivoBrand className="h-[52px] w-auto object-contain" /></Link>
          </div>
          <div className="today-mascot-greeting mt-7 flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 rounded-full bg-warm-soft text-muted-foreground" title={translateText("Profil")}><Link to="/profil" aria-label={translateText("Profil")}><UserRound /></Link></Button>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground"><Localized>{greeting}</Localized></p>
              {s.name && <p className="mt-0.5 truncate text-[16px] font-bold leading-snug text-foreground"><Localized>{s.name}</Localized></p>}
            </div>
          </div>
          <h1 className="today-mascot-heading mt-4 text-[29px] font-bold leading-[1.15] text-foreground"><Localized>{"Gesünder leben."}</Localized><br /><Localized>{"Glücklicher sein."}</Localized></h1>
        </div>
      </header>

      <TodayWellnessGoals />

      <section className="mt-4 px-4"><WeekRecap /></section>

      <TodayNutritionGoals />

      {goalSuggestions.length > 0 && <section className="mt-4 space-y-3 px-4 md:grid md:grid-cols-2 md:gap-3 md:space-y-0" aria-label={translateText("Fairvital Empfehlungen zu deinen Zielen")}>
        <h2 className="px-1 text-[15px] font-semibold md:col-span-2"><Localized>{"Passend zu deinen Zielen"}</Localized></h2>
        {goalSuggestions.map(({ product, goals }) => <a key={product.shopwareId} href={product.url} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
          <img src={product.image} alt={translateText(product.name)} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-fv-deep"><Localized>{"Shop-Empfehlung"}</Localized></div>
            <div className="eyebrow"><Localized>{goals.join(" · ")}</Localized></div>
            <div className="mt-1 text-[15px] font-semibold"><Localized>{product.name}</Localized></div>
            <div className="text-xs text-muted-foreground"><Localized>{product.short}</Localized></div>
            <div className="mt-1 text-xs font-semibold text-fv-deep"><Localized>{"Bei Fairvital ansehen →"}</Localized></div>
          </div>
        </a>)}
        <p className="px-1 text-[11px] text-muted-foreground md:col-span-2"><Localized>{"Einnahme bitte ärztlich abklären, besonders bei Vorerkrankungen oder Medikamenten."}</Localized></p>
      </section>}

      {(gaps.length > 0 || microGaps.length > 0) && <section className="mt-4 space-y-3 px-4 md:grid md:grid-cols-2 md:gap-3 md:space-y-0" data-nutrition-gaps>
        <h2 className="px-1 text-[15px] font-semibold md:col-span-2"><Localized>{"Noch nicht erfasst für heute:"}</Localized></h2>
        {gaps.map((g) => <a key={g.key} href={g.href} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
          <img src={g.product.image} alt={translateText(g.product.name)} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-fv-deep"><Localized>{"Shop-Empfehlung"}</Localized></div>
            <div className="eyebrow"><Localized>{g.key === "protein" ? "Protein" : "Ballaststoffe"}</Localized><Localized>{" · noch ca. "}</Localized><Localized>{fmtNum(Math.max(g.missing, 0))}</Localized><Localized>{" g"}</Localized></div>
            <div className="mt-1 text-[15px] font-semibold"><Localized>{g.product.name}</Localized></div>
            <div className="text-xs text-muted-foreground"><Localized>{g.reason}</Localized></div>
            <div className="mt-1 text-xs font-semibold text-fv-deep"><Localized>{"Bei Fairvital ansehen →"}</Localized></div>
          </div>
        </a>)}
          {microGaps.map((g) => <a key={g.key} href={g.href} target="_blank" rel="noopener noreferrer" className="card-surface flex items-center gap-3 p-3">
            <img src={g.product.image} alt={translateText(g.product.name)} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-md bg-card object-contain" />
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-fv-deep"><Localized>{"Shop-Empfehlung"}</Localized></div>
              <div className="eyebrow"><Localized>{g.name}</Localized><Localized>{" · noch ca. "}</Localized><Localized>{fmtNum(Math.max(g.missing, 0))}</Localized>{" "}{g.unit}</div>
              <div className="mt-1 text-[15px] font-semibold"><Localized>{g.product.name}</Localized></div>
              <div className="text-xs text-muted-foreground"><Localized>{g.reason}</Localized></div>
              <div className="mt-1 text-xs font-semibold text-fv-deep"><Localized>{"Bei Fairvital ansehen →"}</Localized></div>
            </div>
          </a>)}
        <p className="px-1 text-[11px] text-muted-foreground md:col-span-2"><Localized>{"Ergänzung zu einer ausgewogenen Ernährung, kein Ersatz für Mahlzeiten."}</Localized></p>
      </section>}

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
                <div className="eyebrow"><Localized>{"Shop-Empfehlung"}</Localized></div>
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

    </AppShell>
  );
}

function WeekRecap() {
  useLanguage();
  const { s } = useStore();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  const meals = s.meals.filter((m) => days.includes(m.date));
  const mealsPerDay = (d: string) => meals.filter((m) => m.date === d).length;
  const dayCount = (d: string) => (s.weekLog[d] ?? 0) + mealsPerDay(d);
  const goalCount = days.reduce((sum, d) => sum + (s.weekLog[d] ?? 0), 0);
  const weights = Object.entries(s.weightLog).sort(([a], [b]) => a.localeCompare(b));
  const latestW = weights.at(-1);
  const prevW = weights.length > 1 ? weights[weights.length - 2] : null;
  const diff = latestW && prevW ? +(latestW[1] - prevW[1]).toFixed(1) : null;
  const maxDay = Math.max(...days.map(dayCount), 1);

  return (
    <Link to="/gesundheit" className="card-surface block p-5">
      <div className="eyebrow"><Localized>{"Die letzten 7 Tage"}</Localized></div>
      <h2 className="mt-1 text-[18px] font-semibold tracking-tight"><Localized>{"Woche im Rückblick"}</Localized></h2>

      <div aria-hidden="true" className="mt-4 flex h-16 items-end justify-between gap-2">
        {days.map((d, i) => {
          const count = dayCount(d);
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end justify-center">
                <span
                  className={`w-full max-w-[26px] rounded-t-[6px] transition-all ${count > 0 ? "bg-fv" : "bg-ink/10"}`}
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

