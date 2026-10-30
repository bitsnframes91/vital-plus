import { createFileRoute } from "@tanstack/react-router";
import { MicronutrientDetail } from "@/components/MicronutrientDetail";

export const Route = createFileRoute("/ernaehrung/vitamine")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Vitamine — fairvitalgo" },
      { name: "description", content: "Geschätzte Vitaminmengen aus den heute erfassten Mahlzeiten im Vergleich zu EU-Referenzmengen." },
      { property: "og:title", content: "Vitamine — fairvitalgo" },
      { property: "og:description", content: "Vitamine aus dem Ernährungstagebuch im Tagesüberblick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <MicronutrientDetail group="vitamins" />,
});
