import { Link } from "@tanstack/react-router";
import { Localized, useLanguage } from "@/components/Localized";
import { AppShell } from "@/components/AppShell";
import { languageLocale, translateText } from "@/lib/language";
import { useStore } from "@/lib/store";
import { omegaSummary } from "@/lib/omega3";

export function OmegaDetail() {
  useLanguage();
  const { s } = useStore();
  const today = todayKey();
  const summary = omegaSummary(s.meals.filter(meal => meal.date === today));
  const fmt = (value: number) => value.toLocaleString(languageLocale(), { maximumFractionDigits: 1 });
  return (
    <AppShell>
      <div className="px-4 pt-4">
        <Link to="/ernaehrung" aria-label={translateText("Zurück zur Ernährung")} className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="mt-3 text-center text-[20px] font-semibold"><Localized>{"Omega fette"}</Localized></h1>
        <div className="card-surface mt-4 p-4">
          <div className="eyebrow"><Localized>{"Omega fette"}</Localized></div>
          <div className="font-data mt-1 text-[26px] font-semibold text-fv-deep">{summary.available ? fmt(summary.total) : "—"} <span className="text-[14px]">mg</span></div>
          <div className="mt-1 text-[12px] text-muted-foreground"><Localized>{summary.available ? "Heute · geschätzt" : "Noch keine Nährstoffdaten"}</Localized></div>
          {summary.available && summary.partial && <div className="mt-1 text-[11px] text-muted-foreground"><Localized>{"Teilweise erfasst · heute"}</Localized></div>}
        </div>
        <div className="mt-4 space-y-3 pb-6">
          {summary.entries.map(entry => {
            const share = summary.total > 0 ? entry.total / summary.total * 100 : 0;
            return <div key={entry.key} data-omega={entry.key} className="card-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[15px] font-medium">{entry.name}</div>
                <div className="font-data shrink-0 text-[12px] text-muted-foreground">{entry.available ? fmt(entry.total) : "—"} mg</div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-fv" style={{ width: `${share}%` }} /></div>
                <div className="font-data w-14 shrink-0 text-right text-[14px] font-semibold text-fv-deep">{entry.available ? `${Math.round(share)} %` : "—"}</div>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground"><Localized>{!entry.available ? "Noch keine Nährstoffdaten" : entry.partial ? "Teilweise erfasst · heute" : "Anteil der erfassten Omega-Fette"}</Localized></div>
            </div>;
          })}
        </div>
        <p className="pb-6 text-[11px] leading-relaxed text-muted-foreground"><Localized>{"Omega-Fette: geschätzte Mengen aus heutigen Mahlzeiten. Die Balken zeigen den Anteil an der erfassten Gesamtmenge, keinen Tagesbedarf."}</Localized></p>
      </div>
    </AppShell>
  );
}