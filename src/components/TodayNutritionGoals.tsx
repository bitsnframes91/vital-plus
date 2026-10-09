import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Localized, useLanguage } from "./Localized";
import { StatusFace } from "./StatusFace";
import { useStore } from "@/lib/store";
import { nutritionAlerts } from "@/lib/nutrition-alerts";
import { nutritionTargets } from "@/lib/nutrition-targets";
import { languageLocale, translateText } from "@/lib/language";

export function TodayNutritionGoals() {
  useLanguage();
  const { s } = useStore();
  const meals = s.meals.filter(meal => meal.date === new Date().toISOString().slice(0, 10));
  const alerts = nutritionAlerts(meals, nutritionTargets(s.body));
  const fmt = (value: number) => value.toLocaleString(languageLocale(), { maximumFractionDigits: 1 });
  return <section className="mt-4 px-4" data-today-nutrition>
    <div className="flex items-baseline justify-between px-1 pb-2">
      <h2 className="eyebrow"><Localized>{"Tagesziele"}</Localized></h2>
      <Link to="/ernaehrung" className="text-[12px] text-fv-deep"><Localized>{"Ernährung"}</Localized></Link>
    </div>
    <div className="space-y-2">
      {alerts.map(alert => <Link key={alert.key} to={alert.to} data-nutrition-alert={alert.key} className="card-surface flex min-h-[72px] items-center gap-3 px-4 py-3">
        <StatusFace mood={alert.mood} alt={translateText(alert.label)} className="size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium"><Localized>{alert.title}</Localized></div>
          <div className={`font-data mt-1 text-[13px] ${alert.mood === "bad" ? "text-bmi-bad" : "text-nutrition-near"}`}>{fmt(alert.value)} {alert.unit}{alert.target !== undefined && <> / {fmt(alert.target)} {alert.unit}</>}</div>
          <div className="mt-1 text-[11px] text-muted-foreground"><Localized>{alert.label}</Localized></div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>)}
      {alerts.length === 0 && <Link to="/ernaehrung" className="card-surface block p-4 text-[13px] text-muted-foreground"><Localized>{meals.length ? "Keine gelben oder roten Ernährungswerte mit Richtwert für heute." : "Noch keine Einträge. Sprich oder tippe deine erste Mahlzeit."}</Localized></Link>}
    </div>
  </section>;
}