import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "@/components/Localized";
import { LegalSections, PublicLegalPage, validateLegalSearch } from "@/components/PublicLegalPage";
import { termsCopy } from "@/lib/terms";

// Public terms of use: the same text the app shows at signup and in Profile.
export const Route = createFileRoute("/nutzungsbedingungen")({
  staticData: { sitemap: true },
  validateSearch: validateLegalSearch,
  head: () => ({
    meta: [
      { title: "Nutzungsbedingungen — Vital Plus" },
      { name: "description", content: "Nutzungsbedingungen der App Vital Plus." },
      { property: "og:title", content: "Nutzungsbedingungen — Vital Plus" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Terms,
});

const titles = { de: "Nutzungsbedingungen", en: "Terms of Use", es: "Condiciones de uso" } as const;

function Terms() {
  const appLanguage = useLanguage();
  const lang = Route.useSearch().lang ?? appLanguage;
  const copy = termsCopy[lang];
  return (
    <PublicLegalPage lang={lang} title={titles[lang]} date={copy.date}>
      <LegalSections sections={copy.sections} />
    </PublicLegalPage>
  );
}
