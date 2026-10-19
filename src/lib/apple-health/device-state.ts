import { WRITE_TYPES, type HealthBridge, type WriteType } from "./bridge";
import type { ImportedSummary } from "./summary";

// Per-account Apple Health state on this iPhone only. It lives in a protected, non-backed-up file
// written by the native plugin and is never part of the account store synced to the cloud.

export const EXPORT_TYPES = ["bodyMass", "dietaryWater", "dietaryEnergyConsumed"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];
export type ExportSettings = Record<ExportType, boolean>;

export type LedgerEntry = {
  type: WriteType;
  value: number;
  version: number;
  startMs: number;
  endMs: number;
  day: string;
};

export type AccountHealthState = {
  v: 1;
  /** One-time introduction: shown while "pending", never again after a choice. */
  intro: "pending" | "connected" | "skipped";
  connected: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
  summary: ImportedSummary | null;
  exports: ExportSettings;
  /** Only entries from this day on are exported, so turning a type on never uploads history. */
  exportSince: string | null;
  /** What this app wrote to Apple Health, by record ID, to avoid rewriting unchanged values. */
  ledger: Record<string, LedgerEntry>;
};

export const noExports = (): ExportSettings => ({
  bodyMass: false,
  dietaryWater: false,
  dietaryEnergyConsumed: false,
});

export function emptyAccountState(): AccountHealthState {
  return {
    v: 1,
    intro: "pending",
    connected: false,
    connectedAt: null,
    lastSyncAt: null,
    summary: null,
    exports: noExports(),
    exportSince: null,
    ledger: {},
  };
}

const str = (value: unknown) => (typeof value === "string" && value ? value : null);

export function parseAccountState(json: string | null): AccountHealthState {
  const base = emptyAccountState();
  if (!json) return base;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return base;
  }
  if (!raw || typeof raw !== "object" || raw["v"] !== 1) return base;
  const intro =
    raw["intro"] === "connected" || raw["intro"] === "skipped" ? raw["intro"] : "pending";
  const exportsRaw = (raw["exports"] ?? {}) as Record<string, unknown>;
  const ledgerRaw = (raw["ledger"] ?? {}) as Record<string, Partial<LedgerEntry>>;
  const ledger: Record<string, LedgerEntry> = {};
  for (const [id, entry] of Object.entries(typeof ledgerRaw === "object" ? ledgerRaw : {})) {
    if (
      entry &&
      (WRITE_TYPES as readonly string[]).includes(entry.type as string) &&
      [entry.value, entry.version, entry.startMs, entry.endMs].every(
        (n) => typeof n === "number" && Number.isFinite(n),
      ) &&
      typeof entry.day === "string"
    )
      ledger[id] = entry as LedgerEntry;
  }
  const summary =
    raw["summary"] && typeof raw["summary"] === "object"
      ? (raw["summary"] as ImportedSummary)
      : null;
  return {
    v: 1,
    intro,
    connected: raw["connected"] === true,
    connectedAt: str(raw["connectedAt"]),
    lastSyncAt: str(raw["lastSyncAt"]),
    summary: summary && typeof summary.days === "object" ? summary : null,
    exports: Object.fromEntries(
      EXPORT_TYPES.map((t) => [t, exportsRaw[t] === true]),
    ) as ExportSettings,
    exportSince: str(raw["exportSince"]),
    ledger,
  };
}

/** Storage key and HealthKit sync tag derived from the account ID; the raw ID is never stored. */
export async function accountKeys(userId: string): Promise<{ key: string; tag: string }> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`vitalplus-apple-health:v1:${userId}`),
  );
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { key, tag: key.slice(0, 16) };
}

export async function loadAccountState(
  bridge: HealthBridge,
  key: string,
): Promise<AccountHealthState> {
  const { json } = await bridge.loadState({ accountKey: key });
  return parseAccountState(json);
}

export function saveAccountState(
  bridge: HealthBridge,
  key: string,
  state: AccountHealthState,
): Promise<void> {
  return bridge.saveState({ accountKey: key, json: JSON.stringify(state) });
}

/** Disconnect: drop imported data, export settings and the write ledger; keep the intro choice. */
export function disconnectedState(previous: AccountHealthState): AccountHealthState {
  return {
    ...emptyAccountState(),
    intro: previous.intro === "pending" ? "skipped" : previous.intro,
  };
}
