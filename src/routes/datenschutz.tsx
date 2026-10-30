import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "@/components/Localized";
import { PublicLegalPage, validateLegalSearch } from "@/components/PublicLegalPage";
import { TermsDocument } from "@/components/TermsDocument";
import { privacyCopy } from "@/lib/privacy-policy";

// Public privacy policy (App Store Connect "Privacy Policy URL"): the same text the app shows.
export const Route = createFileRoute("/datenschutz")({
  staticData: { sitemap: true },
  validateSearch: validateLegalSearch,
  head: () => ({
    meta: [
      { title: "Datenschutzerklärung — fairvitalgo" },
      {
        name: "description",
        content: "Wie fairvitalgo personenbezogene Daten und Gesundheitsdaten verarbeitet.",
      },
      { property: "og:title", content: "Datenschutzerklärung — fairvitalgo" },
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
    <PublicLegalPage lang={lang} title={titles[lang]}>
      <TermsDocument copy={copy} />
    </PublicLegalPage>
  );
}
