import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "@/components/Localized";
import { PublicLegalPage, validateLegalSearch } from "@/components/PublicLegalPage";
import { TermsDocument } from "@/components/TermsDocument";
import { termsCopy } from "@/lib/terms";

// Public terms of use: the same text the app shows at signup and in Profile.
export const Route = createFileRoute("/nutzungsbedingungen")({
  staticData: { sitemap: true },
  validateSearch: validateLegalSearch,
  head: () => ({
    meta: [
      { title: "Nutzungsbedingungen — fairvitalgo" },
      { name: "description", content: "Nutzungsbedingungen der App fairvitalgo." },
      { property: "og:title", content: "Nutzungsbedingungen — fairvitalgo" },
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
    <PublicLegalPage lang={lang} title={titles[lang]}>
      <TermsDocument copy={copy} />
    </PublicLegalPage>
  );
}
