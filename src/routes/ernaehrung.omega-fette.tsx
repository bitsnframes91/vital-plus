import { createFileRoute } from "@tanstack/react-router";
import { OmegaDetail } from "@/components/OmegaDetail";

export const Route = createFileRoute("/ernaehrung/omega-fette")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Omega fette — Vitalplus" },
      { name: "description", content: "Geschätzte Aufnahme von Omega-3, Omega-6 und Omega-9 aus dem Ernährungstagebuch." },
      { property: "og:title", content: "Omega fette — Vitalplus" },
      { property: "og:description", content: "Omega-3, Omega-6 und Omega-9 aus heutigen Mahlzeiten im Überblick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OmegaDetail,
});