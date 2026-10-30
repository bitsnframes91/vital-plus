import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "@/components/Localized";
import { PublicLegalPage, legalChrome, validateLegalSearch } from "@/components/PublicLegalPage";
import { imprintSections } from "@/lib/imprint";

// Public legal notice. The text stays verbatim German in every language (see src/lib/imprint.ts).
export const Route = createFileRoute("/impressum")({
  staticData: { sitemap: true },
  validateSearch: validateLegalSearch,
  head: () => ({
    meta: [
      { title: "Impressum — Vital Plus" },
      { name: "description", content: "Anbieterkennzeichnung der App Vital Plus." },
      { property: "og:title", content: "Impressum — Vital Plus" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Imprint,
});

function Imprint() {
  const appLanguage = useLanguage();
  const lang = Route.useSearch().lang ?? appLanguage;
  return (
    <PublicLegalPage lang={lang} title={legalChrome(lang).imprint}>
      <div lang="de" className="space-y-5">
        {imprintSections.map((block, index) => (
          <section key={index}>
            {"title" in block && <h2 className="mb-2 font-semibold">{block.title}</h2>}
            <p className="whitespace-pre-line text-muted-foreground">
              {block.text}
              {"links" in block &&
                block.links?.map((link) => (
                  <span key={link.href}>
                    {"prefix" in link ? link.prefix : ""}
                    <a
                      className="text-primary underline underline-offset-4"
                      href={link.href}
                      target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  </span>
                ))}
            </p>
          </section>
        ))}
      </div>
    </PublicLegalPage>
  );
}
