import { createFileRoute } from "@tanstack/react-router";
import { MicronutrientDetail } from "@/components/MicronutrientDetail";

export const Route = createFileRoute("/ernaehrung/mineralien")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Mineralien — fairvitalgo" },
      { name: "description", content: "Geschätzte Mineralstoffmengen aus den heute erfassten Mahlzeiten im Vergleich zu EU-Referenzmengen." },
      { property: "og:title", content: "Mineralien — fairvitalgo" },
      { property: "og:description", content: "Mineralien aus dem Ernährungstagebuch im Tagesüberblick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <MicronutrientDetail group="minerals" />,
});
