import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Localized } from "@/components/Localized";
import { NutritionMascot } from "@/components/NutritionMascot";

export const Route = createFileRoute("/tmp-bubble-check")({
  staticData: { sitemap: false },
  component: () => (
    <AppShell>
      <header className="nutrition-mascot-header relative overflow-hidden bg-card px-6 pb-8 pt-9">
        <div className="nutrition-mascot-copy relative">
          <span className="font-data text-[12px] uppercase text-fv-deep"><Localized>Ernährung</Localized></span>
          <h1 className="mt-4 text-[29px] font-bold leading-[1.15] text-foreground"><Localized>Was hast du heute gegessen?</Localized></h1>
          <p className="mt-3 text-sm text-muted-foreground"><Localized>Dein Ernährungstagebuch mit Kalorien, Protein, Ballaststoffen, Kohlenhydraten und Fett – sowie Vitaminen und Mineralien.</Localized></p>
        </div>
        <NutritionMascot message="Bitte gib ein, was du gegessen hast." />
      </header>
    </AppShell>
  ),
});
