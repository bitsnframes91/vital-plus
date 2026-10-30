import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { VivoBrand } from "@/components/VivoBrand";
import type { Language } from "@/lib/language";

// Public pages for the App Store (Privacy Policy URL, Support URL) and the web: readable without an account,
// in the language from ?lang=, without changing the app's saved language.
export type PublicLegalSearch = { lang?: Language };

export const validateLegalSearch = (search: Record<string, unknown>): PublicLegalSearch =>
  search["lang"] === "en" || search["lang"] === "es" || search["lang"] === "de"
    ? { lang: search["lang"] }
    : {};

const chrome: Record<
  Language,
  { privacy: string; terms: string; imprint: string; support: string; open: string }
> = {
  de: {
    privacy: "Datenschutz",
    terms: "Nutzungsbedingungen",
    imprint: "Impressum",
    support: "Support",
    open: "Zur App",
  },
  en: {
    privacy: "Privacy",
    terms: "Terms of Use",
    imprint: "Legal notice",
    support: "Support",
    open: "Open the app",
  },
  es: {
    privacy: "Privacidad",
    terms: "Condiciones de uso",
    imprint: "Aviso legal",
    support: "Soporte",
    open: "Abrir la app",
  },
};

export const legalChrome = (lang: Language) => chrome[lang];

const pages = [
  { to: "/datenschutz", key: "privacy" },
  { to: "/nutzungsbedingungen", key: "terms" },
  { to: "/impressum", key: "imprint" },
  { to: "/support", key: "support" },
] as const;

export function PublicLegalPage({
  lang,
  title,
  date,
  children,
}: {
  lang: Language;
  title: string;
  date?: string;
  children: ReactNode;
}) {
  const c = chrome[lang];
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main
        lang={lang}
        className="mx-auto max-w-2xl space-y-6 px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]"
      >
        <header className="flex items-center justify-between gap-4">
          <VivoBrand className="h-10 w-auto object-contain" />
          <nav aria-label="Language" className="flex gap-1 text-sm">
            {(["de", "en", "es"] as const).map((l) => (
              <Link
                key={l}
                to="."
                search={{ lang: l }}
                aria-current={l === lang ? "true" : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 font-semibold uppercase ${l === lang ? "bg-fresh text-ink" : "text-muted-foreground"}`}
              >
                {l}
              </Link>
            ))}
          </nav>
        </header>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {date && <p className="mt-1 text-xs text-muted-foreground">{date}</p>}
        </div>
        <div className="space-y-5 break-words text-sm leading-6">{children}</div>
        <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-4 text-sm">
          {pages.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              search={{ lang }}
              className="inline-flex min-h-11 items-center font-semibold text-foreground underline underline-offset-4"
            >
              {c[p.key]}
            </Link>
          ))}
          <Link
            to="/"
            className="inline-flex min-h-11 items-center font-semibold text-foreground underline underline-offset-4"
          >
            {c.open}
          </Link>
        </footer>
      </main>
    </div>
  );
}
