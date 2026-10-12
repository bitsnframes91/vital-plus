import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import startseiteMascot from "@/assets/startseite-mascot.png.asset.json";
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
    <div className="hero-surface min-h-screen font-sans text-foreground">
      <main className="mx-auto min-h-screen max-w-[1600px] px-5 sm:px-8">
        <section id="philosophie" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pb-16 pt-14 text-center lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-14 lg:py-14">
          <div className="relative z-10 flex w-full max-w-[1100px] flex-col items-center lg:self-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fv-deep sm:text-sm"><Localized>{"MESSEN → VERSTEHEN → HANDELN → ÜBERPRÜFEN"}</Localized></p>
            <h1 className="sr-only"><Localized>{"Vitalplus"}</Localized> – <Localized>{"Gesünder leben mit Ernährung und Laborwerten"}</Localized></h1>
            <Link to="/" aria-label={translateText("Vitalplus Startseite")} className="mt-6 block sm:mt-8">
              <VivoBrand className="h-auto w-[240px] object-contain sm:w-[330px] lg:w-[400px]" />
            </Link>
            <p className="mt-6 text-[22px] font-semibold text-ink sm:mt-8 sm:text-[30px]"><Localized>{"Gesünder leben. Glücklicher sein."}</Localized></p>
            <p className="mt-5 max-w-[700px] text-pretty text-base font-medium text-ink/85 sm:text-lg"><Localized>{"Dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern."}</Localized></p>
            <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:mt-11 sm:w-auto sm:flex-row sm:gap-5">
              <Link to="/login" search={{ mode: "login" }} className="w-full rounded-md border border-fv-deep/25 bg-white/55 px-8 py-3 text-base font-semibold text-fv-deep transition-colors hover:bg-white/85 sm:w-auto"><Localized>{"Einloggen"}</Localized></Link>
              <Link to="/login" search={{ mode: "register" }} className="w-full rounded-md bg-home-green px-8 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"><Localized>{"Kostenlos Registrieren"}</Localized></Link>
            </div>
          </div>
          <img src={startseiteMascot.url} alt="" aria-hidden="true" width={928} height={1088} fetchPriority="high" className="home-mascot pointer-events-none mt-12 w-[280px] select-none sm:w-[360px] lg:mt-0 lg:self-end lg:w-[400px] xl:w-[460px]" />
        </section>
      </main>
    </div>
  );
}
