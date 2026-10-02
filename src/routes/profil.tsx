import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil & Datenschutz — Fairvital Health" },
      { name: "description", content: "Profil, Freigaben für Behandler und Datenschutz-Einstellungen verwalten." },
      { property: "og:title", content: "Profil & Datenschutz — Fairvital Health" },
      { property: "og:description", content: "Du entscheidest, wer deine Gesundheitsdaten sieht." },
    ],
  }),
  component: Profile,
});

function Toggle({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      <div className="flex-1">
        <div className="text-[14px] font-medium">{label}</div>
        <div className="text-[11px] text-ink/45">{sub}</div>
      </div>
      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${on ? "bg-fv" : "bg-ink/15"}`}>
        <span className={`size-5 rounded-full bg-card transition ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function Profile() {
  const { s, set } = useStore();
  return (
    <AppShell>
      <PageHeader eyebrow="Profil" title={s.name} sub="Deine Daten gehören dir." />
      <div className="space-y-4 px-4 pt-4">
        <div className="card-surface p-5">
          <div className="eyebrow">Name</div>
          <input value={s.name} onChange={(e) => set({ name: e.target.value })} className="mt-2 w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none" />
          <Link to="/onboarding" className="mt-3 inline-block text-[12px] font-medium text-fv-deep">Gesundheitsprofil bearbeiten →</Link>
        </div>
        <div className="card-surface divide-y px-5">
          <Toggle on={s.consent.practitioner} onClick={() => set({ consent: { ...s.consent, practitioner: !s.consent.practitioner } })} label="Behandler-Freigabe" sub="Ausgewählte Werte mit Ärztin/Therapeut teilen" />
          <Toggle on={s.consent.analytics} onClick={() => set({ consent: { ...s.consent, analytics: !s.consent.analytics } })} label="Anonyme Nutzungsstatistik" sub="Hilft uns, die App zu verbessern" />
        </div>
        <div className="card-surface p-5 text-[12px] text-ink/55">
          <div className="eyebrow mb-1">Fairvital Kundenkonto</div>
          Verknüpfung mit deinem Konto auf fairvital.com folgt.
        </div>
        <button onClick={() => { localStorage.removeItem("fv-health-v1"); location.reload(); }} className="w-full rounded-full py-2.5 text-sm text-destructive ring-1 ring-border">
          Alle Daten löschen
        </button>
      </div>
    </AppShell>
  );
}
