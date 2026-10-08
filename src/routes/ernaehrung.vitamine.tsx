import { createFileRoute } from "@tanstack/react-router";
import { MicronutrientDetail } from "@/components/MicronutrientDetail";

export const Route = createFileRoute("/ernaehrung/vitamine")({
  head: () => ({
    meta: [
      { title: "Vitamine — Vivo" },
      { name: "description", content: "Geschätzte Vitaminmengen aus den heute erfassten Mahlzeiten im Vergleich zu EU-Referenzmengen." },
      { property: "og:title", content: "Vitamine — Vivo" },
      { property: "og:description", content: "Vitamine aus dem Ernährungstagebuch im Tagesüberblick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <MicronutrientDetail group="vitamins" />,
});
