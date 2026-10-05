import { createFileRoute, Link } from "@tanstack/react-router";
import forestHero from "@/assets/vivo-lake.jpg";
import { VivoBrand } from "@/components/VivoBrand";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vivo — Gesünder leben. Glücklicher sein." },
      { name: "description", content: "Vivo: dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern." },
      { property: "og:title", content: "Vivo — Gesünder leben. Glücklicher sein." },
      { property: "og:description", content: "Dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { s } = useStore();
  return (
    <div className="min-h-screen bg-card font-sans text-foreground">
      <header className="mx-auto grid h-[76px] max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:h-[92px] sm:px-8">
        <span aria-hidden="true" />
        <Link to="/" aria-label="Vivo Startseite" className="justify-self-center"><VivoBrand /></Link>
        <div className="flex shrink-0 items-center justify-self-end gap-2 sm:gap-5">
          {s.account ? (
            <Link to="/heute" className="rounded-md bg-home-green px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-6 sm:text-base">Zu Heute</Link>
          ) : (
            <>
              <Link to="/login" search={{ mode: "login" }} className="rounded-md border border-border px-3 py-2.5 text-sm font-semibold text-home-green transition-colors hover:bg-muted sm:px-6 sm:text-base">Log in</Link>
              <Link to="/login" search={{ mode: "register" }} className="rounded-md bg-home-green px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-7 sm:text-base">Sign up</Link>
            </>
          )}
        </div>
      </header>

      <main className="px-3 pb-10 sm:px-5">
        <section id="philosophie" className="relative mx-auto flex min-h-[540px] max-w-[1600px] flex-col items-center justify-center overflow-hidden rounded-[26px] px-5 py-16 text-center sm:min-h-[540px] sm:rounded-[30px]">
          <img src={forestHero} alt="Nebeliger Weg zwischen Bäumen" width={1920} height={960} fetchPriority="high" className="absolute inset-0 size-full object-cover object-center" />
          <div className="today-image-overlay absolute inset-0" aria-hidden="true" />
          <div className="relative z-10 flex w-full max-w-[1000px] flex-col items-center">
            <p className="text-xs font-semibold uppercase text-fv-deep sm:text-sm">MESSEN → VERSTEHEN → HANDELN → ÜBERPRÜFEN</p>
            <h1 className="mt-7 max-w-[1000px] text-balance text-[36px] font-bold leading-[1.1] text-foreground sm:mt-8 sm:text-[56px]">Vivo</h1>
            <p className="mt-4 text-[24px] font-semibold text-foreground">Gesünder leben. Glücklicher sein.</p>
            <p className="mt-5 max-w-[700px] text-pretty text-base font-medium text-foreground sm:text-lg">Dein persönlicher Begleiter für Ernährung, Vitalstoffe und gesundes Altern.</p>
          </div>
        </section>
        <div className="mx-auto mt-5 max-w-[1600px] text-center">
          <Link to="/heute" className="text-sm font-semibold text-home-green underline underline-offset-4">Heute ansehen →</Link>
        </div>
      </main>
    </div>
  );
}