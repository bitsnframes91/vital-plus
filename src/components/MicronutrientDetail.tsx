import { Link } from "@tanstack/react-router";
import { Localized, useLanguage } from "@/components/Localized";
import { languageLocale, translateText } from "@/lib/language";
import { AppShell } from "@/components/AppShell";
import { StatusFace, type StatusMood } from "@/components/StatusFace";
import { useStore } from "@/lib/store";
import {
  micronutrients,
  micronutrientNames,
  micronutrientTotals,
  micronutrientStatus,
} from "@/lib/micronutrients";

const todayISO = () => new Date().toISOString().slice(0, 10);

const statusMeta: Record<"good" | "near" | "bad", { bar: string; text: string; mood: StatusMood; label: string }> = {
  good: { bar: "bg-bmi-good", text: "text-bmi-good", mood: "good", label: "Im grünen Bereich" },
  near: { bar: "bg-nutrition-near", text: "text-nutrition-near", mood: "neutral", label: "Richtwert fast erreicht" },
  bad: { bar: "bg-bmi-bad", text: "text-bmi-bad", mood: "bad", label: "Deutlich vom Richtwert entfernt" },
};

export function MicronutrientDetail({ group }: { group: "vitamins" | "minerals" }) {
  useLanguage();
  const { s } = useStore();
  const today = todayISO();
  const todayMeals = s.meals.filter((m) => m.date === today);
  const totals = micronutrientTotals(todayMeals, group);
  const entries = micronutrients[group];
  const title = group === "vitamins" ? "Vitamine" : "Mineralien";
  const reached = entries.filter(({ key, target }) => (totals[key] ?? 0) >= target).length;
  const fmt = (n: number) => n.toLocaleString(languageLocale(), { maximumFractionDigits: 1 });

  return (
    <AppShell>
      <div className="px-4 pt-4">
        <Link to="/ernaehrung" aria-label={translateText("Zurück zur Ernährung")} className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="mt-3 text-center text-[20px] font-semibold"><Localized>{title}</Localized></h1>

        <div className="card-surface mt-4 p-4">
          <div className="eyebrow"><Localized>{title}</Localized></div>
          <div className="font-data mt-1 text-[26px] font-semibold text-fv-deep">{reached} / {entries.length}</div>
          <div className="mt-1 text-[12px] text-muted-foreground"><Localized>{"Tagesziel erreicht · ca."}</Localized></div>
        </div>

        <div className="mt-4 space-y-3 pb-6">
          {entries.map(({ key, target, unit }) => {
            const value = totals[key];
            if (value === undefined) return null;
            const pct = Math.round((value / target) * 100);
            const meta = statusMeta[micronutrientStatus(value, target)];
            return (
              <div key={key} className="card-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-[15px] font-medium"><Localized>{micronutrientNames[key] ?? key}</Localized></div>
                  <div className="font-data shrink-0 text-[12px] text-muted-foreground">{fmt(value)} {unit} / {fmt(target)} {unit}</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className={`font-data w-12 shrink-0 text-right text-[14px] font-semibold ${meta.text}`}>{pct} %</div>
                  <StatusFace mood={meta.mood} alt={translateText(meta.label)} className="size-6 shrink-0" />
                </div>
              </div>
            );
          })}
          {Object.keys(totals).length === 0 && (
            <p className="text-[14px] text-muted-foreground"><Localized>{"Noch keine Nährstoffdaten für heute. Erfasse eine Mahlzeit, um Werte zu sehen."}</Localized></p>
          )}
        </div>
        <p className="pb-6 text-[11px] leading-relaxed text-muted-foreground"><Localized>{"Geschätzte Mengen aus den heute erfassten Mahlzeiten, verglichen mit EU-Referenzmengen für Erwachsene. Keine Laborwerte oder persönlichen Bedarfswerte."}</Localized></p>
      </div>
    </AppShell>
  );
}
