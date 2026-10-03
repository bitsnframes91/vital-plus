import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Icon, Sparkbars } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { products, status } from "@/lib/data";
import productImg from "@/assets/product-d3k2.jpg";
import { dailyGoals } from "@/lib/daily-goals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Heute — Fairvital Health" },
      { name: "description", content: "Dein persönliches Tages-Dashboard für Ernährung, Vitalstoffe und Laborwerte." },
      { property: "og:title", content: "Heute — Fairvital Health" },
      { property: "og:description", content: "Messen, verstehen, handeln, überprüfen – dein Gesundheitsbegleiter von Fairvital." },
    ],
  }),
  component: Today,
});

function Today() {
  const { s, set } = useStore();
  const vitd = s.labs.find((l) => l.id === "vitd")!;
  const vals = vitd.history.map((h) => h.value);
  const last = vals[vals.length - 1]!;
  const diff = last - vals[0]!;
  const { fromPlan, goals: actions } = dailyGoals(s.aiPlan);
  const done = actions.filter((a) => s.actionsDone[a.key]).length;
  const product = products.find((p) => p.relatedMarker === "vitd")!;
  const today = new Date().toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" });

  return (
    <AppShell>
      <div className="relative overflow-hidden bg-ink px-6 pb-24 pt-9">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="pointer-events-none absolute -right-16 -top-10 size-56 rounded-full bg-fv/25 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="font-data text-[10px] uppercase tracking-[0.22em] text-on-ink/40">{today}</span>
            <div className="flex gap-1.5">
              <Link to="/uhr" className="rounded-full px-2.5 py-1 text-[11px] text-on-ink/70 ring-1 ring-on-ink/15">Uhr</Link>
              <Link to="/profil" className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-on-ink/70 ring-1 ring-on-ink/15">
                <span className="size-1.5 rounded-full bg-fv" />Profil
              </Link>
            </div>
          </div>
          <h1 className="mt-5 text-balance text-[34px] font-semibold leading-[1.05] text-on-ink">
            Guten Morgen,<br />{s.name}.
          </h1>
          <p className="mt-2 max-w-[34ch] text-pretty text-sm text-on-ink/55">
            Deine Werte bewegen sich in die richtige Richtung. Heute warten {actions.length - done} Aktionen auf dich.
          </p>
          {!s.onboarded && (
            <Link to="/onboarding" className="mt-4 inline-flex rounded-full bg-fv px-4 py-2 text-sm font-medium text-ink">
              Gesundheitsprofil anlegen →
            </Link>
          )}
        </div>
      </div>

      <div className="relative -mt-14 px-4">
        <div className="glass rounded-[20px] px-5 py-4">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {["Messen", "Verstehen", "Handeln", "Prüfen"].map((w, i) => (
              <div key={w}>
                <div className={`font-data text-[9px] tracking-[0.12em] ${i === 2 ? "text-fv" : "text-on-ink/45"}`}>0{i + 1}</div>
                <div className="mt-0.5 text-[11px] font-medium text-on-ink/85">{w}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-4 px-4">
        <div className="flex items-baseline justify-between px-1 pb-2">
          <span className="eyebrow">Tagesziele{fromPlan ? " · aus deinem Plan" : ""}</span>
          <span className="font-data text-[11px] text-fv-deep">{done}/{actions.length}</span>
        </div>
        {!fromPlan && (
          <Link to="/labor" className="mb-2 block rounded-[16px] border border-dashed px-4 py-3 text-[12px] text-ink/55">
            Beispielziele. Lade deinen Laborbefund hoch – dann entstehen deine Tagesziele aus deinem persönlichen Plan →
          </Link>
        )}
        {fromPlan && actions.length === 0 && (
          <Link to="/plan" className="mb-2 block rounded-[16px] border border-dashed px-4 py-3 text-[12px] text-ink/55">
            Keine Schritte für heute ausgewählt. Wähle sie in deinem Plan aus →
          </Link>
        )}
        <div className="space-y-2">
          {actions.map((a) => {
            const ok = s.actionsDone[a.key];
            return (
              <button
                key={a.key}
                onClick={() => set({ actionsDone: { ...s.actionsDone, [a.key]: !ok } })}
                className="card-surface flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left"
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${ok ? "bg-fv/10 text-fv-deep" : "bg-ink/5 text-ink/40"}`}>
                  <Icon d={ok ? "M4 12l5 5L20 6" : "M12 6v6l4 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18"} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium">{a.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-ink/45">{a.sub} · {ok ? "erreicht" : "ausstehend"}</div>
                </div>
                {!ok && <span className="rounded-full bg-ink px-3 py-1.5 text-sm text-on-ink">Erledigt</span>}
              </button>
            );
          })}
        </div>
      </section>


      <section className="mt-4 px-4">
        <Link to="/labor" className="card-surface block p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="eyebrow">Vitamin D</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-data text-[26px] font-medium">{last}</span>
                <span className="font-data text-[12px] text-ink/45">{vitd.unit}</span>
                <span className="ml-1 font-data text-[11px] text-fv-deep">↑ {diff}</span>
              </div>
              <div className="mt-0.5 max-w-[26ch] text-[11px] text-ink/45">Von {vals[0]} → {last} · Zielbereich {vitd.target[0]}–{vitd.target[1]}</div>
            </div>
            <span className="rounded-full bg-fv/10 px-2.5 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-fv-deep">{status(vitd).label}</span>
          </div>
          <div className="mt-4"><Sparkbars values={vals} max={vitd.target[1]} /></div>
          <div className="mt-3 flex items-center gap-2 border-t pt-3 text-[12px] text-ink/55">
            <Icon d="M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7" className="size-4 text-ink/40" />
            Nachkontrolle empfohlen in {vitd.retestWeeks} Wochen.
          </div>
        </Link>
      </section>

      <section className="mt-4 px-4">
        <div className="card-surface overflow-hidden">
          <div className="flex gap-3 p-3">
            <img src={productImg} alt={product.name} width={62} height={62} loading="lazy" className="size-[62px] shrink-0 rounded-[12px] object-cover" />
            <div className="min-w-0 flex-1">
              <div className="font-data text-[9px] uppercase tracking-[0.16em] text-fv-deep">Passend zu deinem Wert</div>
              <div className="mt-0.5 text-[14px] font-medium">{product.name}</div>
              <div className="mt-0.5 text-[11px] text-ink/45">{product.short}</div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2.5">
            <span className="text-[11px] text-ink/40">Optional · kein Muss</span>
            <a href={product.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-fv-deep">Im Fairvital Shop ansehen →</a>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
