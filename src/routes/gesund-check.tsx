import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HealthMascot } from "@/components/HealthMascot";
import { Localized } from "@/components/Localized";

export const Route = createFileRoute("/gesund-check")({
  staticData: { sitemap: false },
  component: () => (
    <AppShell>
      <header className="health-mascot-header relative overflow-hidden bg-card px-6 pb-8 pt-9">
        <div className="health-mascot-copy relative">
          <span className="font-data text-[12px] uppercase text-fv-deep"><Localized>Gesundheit</Localized></span>
          <h1 className="mt-4 text-[29px] font-bold leading-[1.15] text-foreground"><Localized>Deine Messwerte</Localized></h1>
          <p className="mt-3 text-sm text-muted-foreground"><Localized>Messwerte und Verläufe verständlich an einem Ort.</Localized></p>
        </div>
        <HealthMascot message="Gib deine Körperdaten ein." />
      </header>
      <div className="grid grid-cols-1 gap-3 px-4 pt-4">
        <div className="card-surface p-5"><Localized>Platzhalter</Localized></div>
      </div>
    </AppShell>
  ),
});
