import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Info, Minus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/trends")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Aktivitätstrends — Vital Plus" },
      { name: "description", content: "Deine Aktivitätstrends für Bewegung, Distanz, Geh- und Lauftempo verständlich erklärt." },
      { property: "og:title", content: "Aktivitätstrends — Vital Plus" },
      { property: "og:description", content: "Bewegung, Distanz und Tempo: deine Aktivität im zeitlichen Verlauf." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrendsPage,
});

const metrics = [
  { name: "Bewegung", unit: "kcal/Tag", color: "text-trend-move", soft: "bg-trend-move-soft", description: "Deine aktive Energie zeigt, wie viel Energie du durch Bewegung im Alltag und beim Sport verbrauchst." },
  { name: "Distanz", unit: "km/Tag", color: "text-trend-distance", soft: "bg-trend-distance-soft", description: "Deine täglich zurückgelegte Strecke beim Gehen und Laufen. Regelmäßige Spaziergänge bringen Bewegung in deinen Alltag." },
  { name: "Gehtempo", unit: "min/km", color: "text-trend-walk", soft: "bg-trend-walk-soft", description: "Zeigt, wie viele Minuten du bei aufgezeichneten Gehtrainings für einen Kilometer brauchst." },
  { name: "Lauftempo", unit: "min/km", color: "text-trend-run", soft: "bg-trend-run-soft", description: "Zeigt, wie viele Minuten du bei aufgezeichneten Lauftrainings für einen Kilometer brauchst." },
];

function TrendsPage() {
  useLanguage();
  return (
    <AppShell>
      <div className="min-h-full bg-card px-5 pb-8 pt-6 text-foreground sm:px-6">
        <header>
          <Button asChild variant="ghost" size="icon" className="rounded-full bg-secondary" title={translateText("Zurück zu Gesundheit")}>
            <Link to="/gesundheit" aria-label={translateText("Zurück zu Gesundheit")}><ArrowLeft className="size-5" /></Link>
          </Button>
          <p className="eyebrow mt-6 text-fv-deep"><Localized>{"Gesundheit"}</Localized></p>
          <h1 className="mt-2 text-[32px] font-bold leading-tight"><Localized>{"Trends"}</Localized></h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground"><Localized>{"Deine Aktivität im Überblick. Für persönliche Trends fehlen noch aufgezeichnete Gesundheitsdaten."}</Localized></p>
        </header>

        <section aria-labelledby="trends-missing-title" className="mt-7">
          <h2 id="trends-missing-title" className="text-[19px] font-semibold"><Localized>{"Noch keine Messdaten"}</Localized></h2>
          <div className="mt-4 space-y-3">
            {metrics.map((metric) => (
              <article key={metric.name} className="card-surface p-5">
                <div className="flex items-start gap-3.5">
                  <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-full ${metric.soft} ${metric.color}`}><Minus className="size-6" strokeWidth={3.5} /></span>
                  <div className="min-w-0">
                    <h3 className="text-[19px] font-semibold"><Localized>{metric.name}</Localized></h3>
                    <p aria-label={translateText(`${metric.name}: noch keine Daten`)} className={`mt-1 flex flex-wrap items-baseline gap-1.5 ${metric.color}`}>
                      <span className="text-[28px] font-bold leading-tight"><Localized>{"–/–"}</Localized></span><span className="text-[15px] font-semibold"><Localized>{metric.unit}</Localized></span>
                    </p>
                    <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground"><Localized>{metric.description}</Localized></p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="trends-source-title" className="mt-7 border-t border-border pt-5">
          <div className="flex items-center gap-2 text-fv-deep"><Info className="size-4" /><h2 id="trends-source-title" className="text-[15px] font-semibold"><Localized>{"Deine Datenbasis"}</Localized></h2></div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground"><Localized>{"Apple Health und Google Health Connect sind noch nicht verbunden. Manuell eingegebene Schritte ersetzen keine gemessene Energie, Distanz oder Geschwindigkeit. Ohne Messdaten lässt sich noch kein Aufwärts- oder Abwärtstrend bestimmen."}</Localized></p>
        </section>
      </div>
    </AppShell>
  );
}