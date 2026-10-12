import { createFileRoute } from "@tanstack/react-router";
import { NutritionMascot } from "@/components/NutritionMascot";

// Temporary check page: renders the Ernährung header with the empty-day bubble
// always visible so the tail can be measured. Deleted after verification.
export const Route = createFileRoute("/tail-check")({
  component: () => (
    <header className="nutrition-mascot-header relative overflow-hidden bg-card px-6 pb-8 pt-9">
      <div className="nutrition-mascot-copy relative">
        <h1 className="text-3xl font-bold text-ink">Ernährung</h1>
        <p className="text-ink-soft">Temporäre Prüfansicht</p>
      </div>
      <NutritionMascot message="Bitte gib ein, was du gegessen hast." />
    </header>
  ),
});
