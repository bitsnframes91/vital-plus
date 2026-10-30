import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "@/components/Localized";
import { LegalSections, PublicLegalPage, validateLegalSearch } from "@/components/PublicLegalPage";
import { privacyCopy } from "@/lib/privacy-policy";

// Public privacy policy (App Store Connect "Privacy Policy URL"): the same text the app shows.
export const Route = createFileRoute("/datenschutz")({
  staticData: { sitemap: true },
  validateSearch: validateLegalSearch,
  head: () => ({
    meta: [
      { title: "Datenschutzerklärung — Vital Plus" },
      {
        name: "description",
        content: "Wie Vital Plus personenbezogene Daten und Gesundheitsdaten verarbeitet.",
      },
      { property: "og:title", content: "Datenschutzerklärung — Vital Plus" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Privacy,
});

const titles = {
  de: "Datenschutzerklärung",
  en: "Privacy Policy",
  es: "Política de privacidad",
} as const;

function Privacy() {
  const appLanguage = useLanguage();
  const lang = Route.useSearch().lang ?? appLanguage;
  const copy = privacyCopy[lang];
  return (
    <PublicLegalPage lang={lang} title={titles[lang]} date={copy.date}>
      <LegalSections sections={copy.sections} />
    </PublicLegalPage>
  );
}
