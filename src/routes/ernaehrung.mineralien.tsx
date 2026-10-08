import { createFileRoute } from "@tanstack/react-router";
import { MicronutrientDetail } from "@/components/MicronutrientDetail";

export const Route = createFileRoute("/ernaehrung/mineralien")({
  head: () => ({
    meta: [
      { title: "Mineralien — Vivo" },
      { name: "description", content: "Geschätzte Mineralstoffmengen aus den heute erfassten Mahlzeiten im Vergleich zu EU-Referenzmengen." },
      { property: "og:title", content: "Mineralien — Vivo" },
      { property: "og:description", content: "Mineralien aus dem Ernährungstagebuch im Tagesüberblick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <MicronutrientDetail group="minerals" />,
});
