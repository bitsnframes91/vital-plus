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
        <section id="philosophie" className="hero-surface relative mx-auto flex min-h-[calc(100svh_-_150px)] max-w-[1600px] flex-col items-center justify-center overflow-hidden rounded-[30px] border border-fv/25 px-5 pb-14 pt-16 text-center sm:min-h-[calc(100svh_-_112px)] sm:rounded-[38px] sm:px-8">
          <div className="relative z-10 flex w-full max-w-[1100px] flex-col items-center lg:pr-[380px] xl:pr-[440px]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fv-deep sm:text-sm"><Localized>{"MESSEN → VERSTEHEN → HANDELN → ÜBERPRÜFEN"}</Localized></p>
            <h1 className="mt-6 max-w-[1100px] text-balance text-[46px] font-bold leading-[1.05] text-fv-deep sm:mt-8 sm:text-[72px] lg:text-[88px]"><Localized>{"Vitalplus"}</Localized><span className="sr-only"> – <Localized>{"Gesünder leben mit Ernährung und Laborwerten"}</Localized></span></h1>
            <p className="mt-5 text-[22px] font-semibold text-ink sm:mt-7 sm:text-[30px]"><Localized>{"Gesünder leben. Glücklicher sein."}</Localized></p>
            <p className="mt-5 max-w-[700px] text-pretty text-base font-medium text-ink/85 sm:text-lg"><Localized>{"Dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern."}</Localized></p>
          </div>
          <img src={startseiteVitali.url} alt="" aria-hidden="true" width={1233} height={1275} fetchPriority="high" className="pointer-events-none mt-12 w-[280px] select-none sm:w-[360px] lg:absolute lg:bottom-8 lg:right-8 lg:mt-0 lg:w-[420px] xl:bottom-10 xl:right-20 xl:w-[480px]" />
        </section>
      </main>
    </div>
  );
}