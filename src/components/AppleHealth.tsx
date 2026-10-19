import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { HeartPulse, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import {
  healthBridge,
  READ_TYPES,
  type WriteStatus,
  type WriteType,
} from "@/lib/apple-health/bridge";
import {
  accountKeys,
  disconnectedState,
  EXPORT_TYPES,
  loadAccountState,
  saveAccountState,
  type AccountHealthState,
  type ExportType,
} from "@/lib/apple-health/device-state";
import { applyResults, dayKey, planExports, type AppRecords } from "@/lib/apple-health/export-plan";
import { importSummary, SyncCancelled } from "@/lib/apple-health/sync";

// Apple Health on the iPhone. Imported values stay in this context and in the native per-account
// file; they are never written to the synced store, sent to the server, or used for AI requests.

type Phase = "unsupported" | "checking" | "unavailable" | "ready";

export type AppleHealthContextValue = {
  phase: Phase;
  /** State of the signed-in account on this device; null while loading or signed out. */
  account: AccountHealthState | null;
  introDue: boolean;
  syncing: boolean;
  error: string | null;
  writeStatuses: Partial<Record<WriteType, WriteStatus>>;
  connect: () => Promise<void>;
  sync: () => Promise<void>;
  cancelSync: () => void;
  disconnect: () => Promise<void>;
  skipIntro: () => Promise<void>;
  setExport: (type: ExportType, on: boolean) => Promise<void>;
};

const AppleHealthContext = createContext<AppleHealthContextValue | null>(null);
export const useAppleHealth = () => useContext(AppleHealthContext);

export function AppleHealthProvider({ children }: { children: ReactNode }) {
  const { s } = useStore();
  const records = useMemo<AppRecords>(
    () => ({ meals: s.meals, waterLog: s.waterLog, weightLog: s.weightLog }),
    [s.meals, s.waterLog, s.weightLog],
  );
  return (
    <AppleHealthController
      userId={s.account?.userId ?? null}
      onboarded={s.onboarded}
      records={records}
    >
      {children}
    </AppleHealthController>
  );
}

export function AppleHealthController({
  userId,
  onboarded,
  records,
  children,
}: {
  userId: string | null;
  onboarded: boolean;
  records: AppRecords;
  children: ReactNode;
}) {
  const [bridge] = useState(() => healthBridge());
  const [phase, setPhase] = useState<Phase>(bridge ? "checking" : "unsupported");
  const [account, setAccount] = useState<AccountHealthState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writeStatuses, setWriteStatuses] = useState<Partial<Record<WriteType, WriteStatus>>>({});
  const keys = useRef<{ key: string; tag: string; userId: string } | null>(null);
  const current = useRef<AccountHealthState | null>(null);
  // Records are tagged with their account so an export never pairs one account's entries with another's tag.
  const recordsRef = useRef({ userId, records });
  recordsRef.current = { userId, records };
  const generation = useRef(0);
  const syncAbort = useRef<AbortController | null>(null);
  const exporting = useRef<Promise<void> | null>(null);
  const exportAgain = useRef(false);

  useEffect(() => {
    if (!bridge) return;
    let alive = true;
    bridge.isAvailable().then(
      ({ available }) => {
        if (alive) setPhase(available ? "ready" : "unavailable");
      },
      () => {
        if (alive) setPhase("unavailable");
      },
    );
    return () => {
      alive = false;
    };
  }, [bridge]);

  // Account switch or sign-out: drop everything in memory first, then load only this account's file.
  useEffect(() => {
    const gen = ++generation.current;
    syncAbort.current?.abort();
    syncAbort.current = null;
    keys.current = null;
    current.current = null;
    setAccount(null);
    setSyncing(false);
    setError(null);
    setWriteStatuses({});
    if (!bridge || phase !== "ready" || !userId) return;
    void (async () => {
      try {
        const derived = await accountKeys(userId);
        const state = await loadAccountState(bridge, derived.key);
        if (generation.current !== gen) return;
        keys.current = { ...derived, userId };
        current.current = state;
        setAccount(state);
        if (state.connected) {
          const { statuses } = await bridge.getWriteStatus({ types: EXPORT_TYPES });
          if (generation.current === gen) setWriteStatuses(statuses);
        }
      } catch {
        if (generation.current === gen)
          setError("Lokale Apple-Health-Daten konnten nicht geladen werden.");
      }
    })();
  }, [bridge, phase, userId]);

  const persist = useCallback(
    async (update: (prev: AccountHealthState) => AccountHealthState) => {
      const k = keys.current;
      const prev = current.current;
      if (!bridge || !k || !prev) return;
      const next = update(prev);
      current.current = next;
      setAccount(next);
      try {
        await saveAccountState(bridge, k.key, next);
      } catch {
        setError("Apple-Health-Daten konnten auf diesem iPhone nicht gespeichert werden.");
      }
    },
    [bridge],
  );

  const refreshStatuses = useCallback(async () => {
    if (!bridge) return {};
    try {
      const { statuses } = await bridge.getWriteStatus({ types: EXPORT_TYPES });
      setWriteStatuses(statuses);
      return statuses;
    } catch {
      return {};
    }
  }, [bridge]);

  const runExport = useCallback(async (): Promise<void> => {
    if (exporting.current) {
      exportAgain.current = true;
      return exporting.current;
    }
    const task = (async () => {
      do {
        exportAgain.current = false;
        const gen = generation.current;
        const k = keys.current;
        const state = current.current;
        if (!bridge || !k || !state?.connected || !EXPORT_TYPES.some((t) => state.exports[t]))
          return;
        const statuses = await refreshStatuses();
        const snapshot = recordsRef.current;
        if (generation.current !== gen || snapshot.userId !== k.userId) return;
        const plan = planExports({
          records: snapshot.records,
          settings: state.exports,
          since: state.exportSince,
          ledger: state.ledger,
          statuses,
          now: new Date(),
        });
        if (!plan.writes.length && !plan.deletes.length) continue;
        try {
          const written = plan.writes.length
            ? (await bridge.writeSamples({ accountTag: k.tag, samples: plan.writes })).results
            : [];
          const removed = plan.deletes.length
            ? (await bridge.deleteSamples({ accountTag: k.tag, items: plan.deletes })).results
            : [];
          if (generation.current !== gen) return;
          await persist((prev) => ({
            ...prev,
            ledger: applyResults(
              prev.ledger,
              plan.writes,
              written,
              plan.deletes,
              removed,
              new Date(),
            ),
          }));
          if (
            written.some((r) => r.status === "failed") ||
            removed.some((r) => r.status === "failed")
          )
            setError("Einige Einträge konnten nicht in Apple Health gespeichert werden.");
        } catch {
          if (generation.current === gen)
            setError("Einige Einträge konnten nicht in Apple Health gespeichert werden.");
          return;
        }
      } while (exportAgain.current);
    })();
    exporting.current = task;
    try {
      await task;
    } finally {
      exporting.current = null;
    }
  }, [bridge, persist, refreshStatuses]);

  const sync = useCallback(async () => {
    const gen = generation.current;
    if (!bridge || !current.current?.connected) return;
    syncAbort.current?.abort();
    const controller = new AbortController();
    syncAbort.current = controller;
    setSyncing(true);
    setError(null);
    try {
      const summary = await importSummary(bridge, { signal: controller.signal });
      if (generation.current !== gen || controller.signal.aborted) return;
      await persist((prev) => ({ ...prev, summary, lastSyncAt: new Date().toISOString() }));
      void runExport();
    } catch (failure) {
      if (failure instanceof SyncCancelled || generation.current !== gen) return;
      setError("Apple Health konnte nicht synchronisiert werden. Bitte versuche es erneut.");
    } finally {
      if (syncAbort.current === controller) {
        syncAbort.current = null;
        if (generation.current === gen) setSyncing(false);
      }
    }
  }, [bridge, persist, runExport]);

  const cancelSync = useCallback(() => {
    syncAbort.current?.abort();
    syncAbort.current = null;
    setSyncing(false);
  }, []);

  // Permissions are requested only here, after the user tapped "connect".
  const connect = useCallback(async () => {
    const gen = generation.current;
    if (!bridge || !current.current) return;
    setError(null);
    try {
      await bridge.requestAuthorization({ read: READ_TYPES, write: EXPORT_TYPES });
    } catch {
      if (generation.current === gen) setError("Apple Health konnte nicht verbunden werden.");
      return;
    }
    if (generation.current !== gen) return;
    await persist((prev) => ({
      ...prev,
      intro: "connected",
      connected: true,
      connectedAt: prev.connectedAt ?? new Date().toISOString(),
    }));
    await refreshStatuses();
    await sync();
  }, [bridge, persist, refreshStatuses, sync]);

  const skipIntro = useCallback(
    () =>
      persist((prev) => ({ ...prev, intro: prev.intro === "pending" ? "skipped" : prev.intro })),
    [persist],
  );

  const disconnect = useCallback(async () => {
    cancelSync();
    generation.current++; // discards any export still in flight
    await persist(disconnectedState);
    setWriteStatuses({});
    setError(null);
  }, [cancelSync, persist]);

  const setExport = useCallback(
    async (type: ExportType, on: boolean) => {
      const gen = generation.current;
      if (!bridge || !current.current?.connected) return;
      if (on) {
        const statuses = await refreshStatuses();
        if (statuses[type] === "notDetermined") {
          try {
            await bridge.requestAuthorization({ read: [], write: [type] });
          } catch {
            /* reported through the status below */
          }
          await refreshStatuses();
        }
        if (generation.current !== gen) return;
      }
      await persist((prev) => ({
        ...prev,
        exports: { ...prev.exports, [type]: on },
        exportSince: on ? (prev.exportSince ?? dayKey(new Date())) : prev.exportSince,
      }));
      if (on) void runExport();
    },
    [bridge, persist, refreshStatuses, runExport],
  );

  // App entries changed (meal, water, weight): export after a short pause.
  const connected = account?.connected === true;
  const exportSettings = account?.exports;
  useEffect(() => {
    if (!connected || !exportSettings || !EXPORT_TYPES.some((t) => exportSettings[t])) return;
    const timer = setTimeout(() => void runExport(), 1500);
    return () => clearTimeout(timer);
  }, [records, connected, exportSettings, runExport]);

  useEffect(
    () => () => {
      syncAbort.current?.abort();
    },
    [],
  );

  const value = useMemo<AppleHealthContextValue>(
    () => ({
      phase,
      account,
      syncing,
      error,
      writeStatuses,
      introDue: phase === "ready" && onboarded && account?.intro === "pending",
      connect,
      sync,
      cancelSync,
      disconnect,
      skipIntro,
      setExport,
    }),
    [
      phase,
      account,
      syncing,
      error,
      writeStatuses,
      onboarded,
      connect,
      sync,
      cancelSync,
      disconnect,
      skipIntro,
      setExport,
    ],
  );
  return <AppleHealthContext.Provider value={value}>{children}</AppleHealthContext.Provider>;
}

/** One-time introduction for new and existing users; skipping is remembered per account and device. */
export function AppleHealthIntro() {
  useLanguage();
  const health = useAppleHealth();
  const [busy, setBusy] = useState(false);
  if (!health?.introDue) return null;
  const connect = async () => {
    setBusy(true);
    try {
      await health.connect();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) void health.skipIntro();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] rounded-lg border-border bg-card p-5">
        <DialogHeader className="text-left">
          <span
            className="mb-2 grid size-12 place-items-center rounded-full bg-fresh text-ink"
            aria-hidden="true"
          >
            <HeartPulse className="size-6" strokeWidth={1.6} />
          </span>
          <DialogTitle className="text-[20px] text-foreground">
            <Localized>{"Apple Health verbinden?"}</Localized>
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-5">
            <Localized>
              {
                "Vital Plus kann Schritte, Herzfrequenz, Gewicht, Schlaf, Energie und Wasser aus Apple Health anzeigen. Diese Daten bleiben auf deinem iPhone."
              }
            </Localized>
          </DialogDescription>
        </DialogHeader>
        <p className="text-[13px] leading-5 text-muted-foreground">
          <Localized>
            {
              "Du entscheidest in Apple Health, welche Daten Vital Plus lesen darf. Du kannst die Verbindung jederzeit unter Profil › Gesundheitsprofil bearbeiten ändern."
            }
          </Localized>
        </p>
        <div className="mt-2 grid gap-2">
          <Button onClick={() => void connect()} disabled={busy}>
            {busy && (
              <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            )}
            <Localized>{"Apple Health verbinden"}</Localized>
          </Button>
          <Button variant="ghost" onClick={() => void health.skipIntro()} disabled={busy}>
            <Localized>{"Jetzt nicht"}</Localized>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const exportLabels: Record<ExportType, string> = {
  bodyMass: "Gewicht",
  dietaryWater: "Wasser",
  dietaryEnergyConsumed: "Nahrungsenergie aus Mahlzeiten",
};

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString(languageLocale(), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

/** Missing values read "Keine Daten", never 0. */
function SummaryRow({
  label,
  value,
  unit,
  digits = 0,
}: {
  label: string;
  value: number | undefined;
  unit?: string;
  digits?: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-[13px] text-foreground">
        <Localized>{label}</Localized>
      </dt>
      <dd className="text-right text-[13px] font-semibold text-foreground">
        {value === undefined ? (
          <span className="font-normal text-muted-foreground">
            <Localized>{"Keine Daten"}</Localized>
          </span>
        ) : (
          <>
            {formatNumber(value, digits)}
            {unit && (
              <>
                {" "}
                <Localized>{unit}</Localized>
              </>
            )}
          </>
        )}
      </dd>
    </div>
  );
}

/** Apple Health controls inside "Gesundheitsprofil bearbeiten" (/profil/personal). */
export function AppleHealthSection() {
  useLanguage();
  const health = useAppleHealth();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  const heading = (
    <h2 className="eyebrow mt-2">
      <Localized>{"Apple Health"}</Localized>
    </h2>
  );

  if (!health || health.phase === "unsupported")
    return (
      <section aria-labelledby="apple-health">
        {heading}
        <p
          id="apple-health"
          className="rounded-lg bg-card p-4 text-[13px] leading-5 text-muted-foreground"
        >
          <Localized>
            {"Apple Health ist in der Vital Plus App auf dem iPhone verfügbar."}
          </Localized>
        </p>
      </section>
    );
  if (health.phase === "checking") return null;
  if (health.phase === "unavailable")
    return (
      <section>
        {heading}
        <p className="rounded-lg bg-card p-4 text-[13px] leading-5 text-muted-foreground">
          <Localized>{"Apple Health ist auf diesem Gerät nicht verfügbar."}</Localized>
        </p>
      </section>
    );

  const account = health.account;
  if (!account)
    return (
      <section>
        {heading}
        <p className="rounded-lg bg-card p-4 text-[13px] text-muted-foreground" role="status">
          {health.error ? (
            <Localized>{health.error}</Localized>
          ) : (
            <Localized>{"Wird geladen …"}</Localized>
          )}
        </p>
      </section>
    );

  const today = account.summary?.days[account.summary.endDay];
  const lastSync = account.lastSyncAt
    ? new Date(account.lastSyncAt).toLocaleString(languageLocale(), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;
  const status = (type: ExportType) => health.writeStatuses[type];
  const sleep = today?.sleepMinutes;

  return (
    <section className="space-y-3" aria-label={translateText("Apple Health")}>
      {heading}
      <div className="rounded-lg bg-card p-4">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-fresh text-ink"
            aria-hidden="true"
          >
            <HeartPulse className="size-5" strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-foreground">
              <Localized>{account.connected ? "Verbunden" : "Nicht verbunden"}</Localized>
            </p>
            <p className="text-[12px] text-muted-foreground" role="status" aria-live="polite">
              {health.syncing ? (
                <Localized>{"Synchronisiert …"}</Localized>
              ) : account.connected ? (
                lastSync ? (
                  <>
                    <Localized>{"Zuletzt synchronisiert"}</Localized>
                    {": "}
                    {lastSync}
                  </>
                ) : (
                  <Localized>{"Noch nicht synchronisiert"}</Localized>
                )
              ) : (
                <Localized>{"Vital Plus liest keine Daten aus Apple Health."}</Localized>
              )}
            </p>
          </div>
        </div>
        {health.error && (
          <p
            className="mt-3 rounded-md bg-muted p-3 text-[12px] leading-4 text-destructive"
            role="alert"
          >
            <Localized>{health.error}</Localized>
          </p>
        )}
        <div className="mt-4 grid gap-2">
          {!account.connected && (
            <Button onClick={() => void run(health.connect)} disabled={busy}>
              <Localized>{"Apple Health verbinden"}</Localized>
            </Button>
          )}
          {account.connected &&
            (health.syncing ? (
              <Button variant="outline" onClick={health.cancelSync}>
                <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                <Localized>{"Synchronisierung abbrechen"}</Localized>
              </Button>
            ) : (
              <Button onClick={() => void health.sync()} disabled={busy}>
                <Localized>{health.error ? "Erneut versuchen" : "Jetzt synchronisieren"}</Localized>
              </Button>
            ))}
          {account.connected && (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirmDisconnect(true)}
              disabled={busy}
            >
              <Localized>{"Trennen"}</Localized>
            </Button>
          )}
        </div>
      </div>

      {account.connected && (
        <div className="rounded-lg bg-card p-4">
          <h3 className="text-[14px] font-semibold text-foreground">
            <Localized>{"Heute aus Apple Health"}</Localized>
          </h3>
          <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
            <Localized>
              {
                "„Keine Daten“ heißt: Apple Health hat keine Werte geliefert. Das kann auch bedeuten, dass der Lesezugriff nicht erlaubt ist."
              }
            </Localized>
          </p>
          <dl className="mt-2 divide-y divide-border">
            <SummaryRow label="Schritte" value={today?.steps} />
            <SummaryRow
              label="Herzfrequenz (Durchschnitt)"
              value={today?.heartRate?.avg}
              unit="Schläge/Min."
            />
            <SummaryRow
              label="Schlaf (letzte Nacht)"
              value={sleep === undefined ? undefined : sleep / 60}
              unit="Std."
              digits={1}
            />
            <SummaryRow label="Aktive Energie" value={today?.activeEnergyKcal} unit="kcal" />
            <SummaryRow label="Ruheenergie" value={today?.basalEnergyKcal} unit="kcal" />
            <SummaryRow label="Nahrungsenergie" value={today?.dietaryEnergyKcal} unit="kcal" />
            <SummaryRow label="Wasser" value={today?.waterMl} unit="ml" />
            <SummaryRow
              label="Gewicht (letzter Wert)"
              value={account.summary?.latestBodyMass?.kg}
              unit="kg"
              digits={1}
            />
          </dl>
          <p className="mt-2 text-[12px] leading-4 text-muted-foreground">
            <Localized>
              {
                "Aktive Energie ist Energie aus Bewegung, Ruheenergie der Grundumsatz, Nahrungsenergie die gegessene Energie. Werte aus Apple Health ändern dein Vital Plus Profil nicht."
              }
            </Localized>
          </p>
        </div>
      )}

      {account.connected && (
        <div className="rounded-lg bg-card p-4">
          <h3 className="text-[14px] font-semibold text-foreground">
            <Localized>{"In Apple Health speichern"}</Localized>
          </h3>
          <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
            <Localized>
              {
                "Nur Einträge, die du in Vital Plus machst, ab dem Tag des Einschaltens. Werte aus Apple Health werden nie zurückgeschrieben."
              }
            </Localized>
          </p>
          <div className="mt-2 divide-y divide-border">
            {EXPORT_TYPES.map((type) => (
              <div key={type} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={`ah-export-${type}`} className="text-[13px] text-foreground">
                    <Localized>{exportLabels[type]}</Localized>
                  </label>
                  <Switch
                    id={`ah-export-${type}`}
                    checked={account.exports[type]}
                    disabled={busy}
                    onCheckedChange={(on) => void run(() => health.setExport(type, on))}
                  />
                </div>
                {account.exports[type] && status(type) !== "authorized" && (
                  <p className="mt-1 text-[12px] leading-4 text-destructive">
                    <Localized>
                      {
                        "Schreiben ist in Apple Health nicht erlaubt. Erlaube es unter Einstellungen › Datenschutz & Sicherheit › Health › Vital Plus."
                      }
                    </Localized>
                  </p>
                )}
              </div>
            ))}
            <div className="py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted-foreground">
                  <Localized>{"Aktive Energie"}</Localized>
                </span>
                <Switch checked={false} disabled aria-label={translateText("Aktive Energie")} />
              </div>
              <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
                <Localized>
                  {
                    "Nicht verfügbar: Vital Plus zeichnet noch keine Trainings auf. Aktive Energie wird nie aus Mahlzeiten geschätzt."
                  }
                </Localized>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-card p-4 text-[12px] leading-4 text-muted-foreground">
        <p>
          <Localized>
            {
              "Daten aus Apple Health bleiben auf diesem iPhone. Sie werden nicht in deinem Vital Plus Konto gespeichert und nicht an KI-Dienste oder Dritte gesendet."
            }
          </Localized>
        </p>
        <p className="mt-2">
          <Localized>
            {
              "Die Freigabe für Apple Health gilt für dieses iPhone. Lese- und Schreibrechte änderst oder widerrufst du unter Einstellungen › Datenschutz & Sicherheit › Health › Vital Plus."
            }
          </Localized>
        </p>
      </div>

      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] rounded-lg border-border bg-card p-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[18px] text-foreground">
              <Localized>{"Apple Health trennen?"}</Localized>
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-5">
              <Localized>
                {
                  "Vital Plus löscht die auf diesem iPhone gespeicherten Apple-Health-Daten und speichert nichts mehr in Apple Health. Bereits gespeicherte Einträge bleiben in Apple Health. Die Berechtigungen widerrufst du in den iPhone-Einstellungen."
                }
              </Localized>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              variant="destructive"
              onClick={() =>
                void run(async () => {
                  await health.disconnect();
                  setConfirmDisconnect(false);
                })
              }
              disabled={busy}
            >
              <Localized>{"Trennen und lokale Daten löschen"}</Localized>
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDisconnect(false)}>
              <Localized>{"Abbrechen"}</Localized>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
