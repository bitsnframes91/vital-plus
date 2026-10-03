import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useServerFn } from "@tanstack/react-start";
import { shopLogout } from "@/lib/shop-account.functions";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil & Datenschutz — Fairvital Health" },
      { name: "description", content: "Profil, Freigaben für Behandler und Datenschutz-Einstellungen verwalten." },
      { property: "og:title", content: "Profil & Datenschutz — Fairvital Health" },
      { property: "og:description", content: "Du entscheidest, wer deine Gesundheitsdaten sieht." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Toggle({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      <div className="flex-1">
        <div className="text-[15px] font-medium">{label}</div>
        <div className="text-[12px] text-ink/45">{sub}</div>
      </div>
      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${on ? "bg-fv" : "bg-ink/15"}`}>
        <span className={`size-5 rounded-full bg-card transition ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function Profile() {
  const { s, set } = useStore();
  const logout = useServerFn(shopLogout);
  return (
    <AppShell>
      <PageHeader eyebrow="Einstellungen" title={s.name} sub="Deine Daten gehören dir." />
      <div className="space-y-4 px-4 pt-4">
        <div className="card-surface p-5">
          <div className="eyebrow">Name</div>
          <input value={s.name} onChange={(e) => set({ name: e.target.value })} className="mt-2 w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none" />
          <Link to="/onboarding" className="mt-3 inline-block text-[13px] font-medium text-fv-deep">Gesundheitsprofil bearbeiten →</Link>
        </div>
        <div className="card-surface divide-y px-5">
          <Toggle on={s.consent.practitioner} onClick={() => set({ consent: { ...s.consent, practitioner: !s.consent.practitioner } })} label="Behandler-Freigabe" sub="Ausgewählte Werte mit Ärztin/Therapeut teilen" />
          <Toggle on={s.consent.analytics} onClick={() => set({ consent: { ...s.consent, analytics: !s.consent.analytics } })} label="Anonyme Nutzungsstatistik" sub="Hilft uns, die App zu verbessern" />
        </div>
        <div className="card-surface p-5 text-[13px] text-ink/55">
          <div className="eyebrow mb-1">Fairvital Kundenkonto</div>
          {s.account ? (
            <>
              Angemeldet als <span className="font-medium text-ink">{s.account.email}</span>
              <button
                onClick={() => { const t = s.account!.contextToken; set({ account: null }); void logout({ data: { contextToken: t } }); }}
                className="mt-3 block text-[13px] font-medium text-fv-deep"
              >
                Abmelden
              </button>
            </>
          ) : (
            <>
              Melde dich mit deinem Konto von fairvital.com an.
              <Link to="/login" search={{ mode: "login" }} className="mt-3 block text-[13px] font-medium text-fv-deep">Anmelden oder Konto anlegen →</Link>
            </>
          )}
        </div>
        <button onClick={() => { localStorage.removeItem("fv-health-v1"); location.reload(); }} className="w-full rounded-full py-2.5 text-sm text-destructive ring-1 ring-border">
          Alle Daten löschen
        </button>
      </div>
    </AppShell>
  );
}
