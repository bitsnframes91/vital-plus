import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import startseiteVitali from "@/assets/startseite-vitali.png.asset.json";
import { VivoBrand } from "@/components/VivoBrand";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Vitalplus — Gesünder leben. Glücklicher sein." },
      { name: "description", content: "Vitalplus: dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern." },
      { property: "og:title", content: "Vitalplus — Gesünder leben. Glücklicher sein." },
      { property: "og:description", content: "Dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  useLanguage();
  return (
    <div className="min-h-screen bg-card font-sans text-foreground">
      <header className="mx-auto grid min-h-[128px] max-w-[1600px] grid-cols-1 items-center gap-2 px-5 py-2 sm:min-h-[92px] sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-8">
        <span aria-hidden="true" className="hidden sm:block" />
        <Link to="/" aria-label={translateText("Vitalplus Startseite")} className="justify-self-center"><VivoBrand /></Link>
        <div className="flex shrink-0 items-center justify-self-center gap-2 sm:justify-self-end sm:gap-5">
          <Link to="/login" search={{ mode: "login" }} className="rounded-md border border-border px-3 py-2.5 text-sm font-semibold text-home-green transition-colors hover:bg-muted sm:px-6 sm:text-base"><Localized>{"Einloggen"}</Localized></Link>
          <Link to="/login" search={{ mode: "register" }} className="rounded-md bg-home-green px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-7 sm:text-base"><Localized>{"Kostenlos Registrieren"}</Localized></Link>
        </div>
      </header>

      <main className="px-3 pb-10 sm:px-5">
        <section id="philosophie" className="relative mx-auto flex min-h-[540px] max-w-[1600px] flex-col items-center justify-center overflow-hidden rounded-[26px] px-5 py-16 text-center sm:min-h-[540px] sm:rounded-[30px]">
          <div className="relative z-10 flex w-full max-w-[1000px] flex-col items-center">
            <p className="text-xs font-semibold uppercase text-fv-deep sm:text-sm"><Localized>{"MESSEN → VERSTEHEN → HANDELN → ÜBERPRÜFEN"}</Localized></p>
            <h1 className="mt-7 max-w-[1000px] text-balance text-[36px] font-bold leading-[1.1] text-foreground sm:mt-8 sm:text-[56px]"><Localized>{"Vitalplus"}</Localized><span className="sr-only"> – <Localized>{"Gesünder leben mit Ernährung und Laborwerten"}</Localized></span></h1>
            <p className="mt-4 text-[24px] font-semibold text-foreground"><Localized>{"Gesünder leben. Glücklicher sein."}</Localized></p>
            <p className="mt-5 max-w-[700px] text-pretty text-base font-medium text-foreground sm:text-lg"><Localized>{"Dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern."}</Localized></p>
          </div>
          <img src={startseiteVitali.url} alt="" aria-hidden="true" width={1233} height={1275} fetchPriority="high" className="pointer-events-none mt-10 w-[210px] select-none sm:absolute sm:bottom-6 sm:right-5 sm:mt-0 sm:w-[min(30%,280px)] lg:w-[360px]" />
        </section>
      </main>
    </div>
  );
}