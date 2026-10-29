import { supabase } from "@/integrations/supabase/client";
import type { AccountHealthState } from "./apple-health/device-state";
import type { AppSettings } from "./app-settings";

// "Meine Daten herunterladen": a readable JSON copy of everything Vital Plus keeps for the signed-in
// account, split into what the account stores on the server and what exists only on this device.

export const EXPORT_FORMAT = "vitalplus-meine-daten";
export const EXPORT_FORMAT_VERSION = 1;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Account = { email: string; userId: string };

export type ConsentRecord = {
  policyVersion: string;
  consentedAt: string;
  withdrawnAt: string | null;
  dataChoice: string | null;
};

export type ServerCopy = {
  /** The account's synced health state (user_data), or null when nothing was saved yet. */
  healthData: { updatedAt: string; state: Json } | null;
  consents: ConsentRecord[];
};

export type DeviceCopy = {
  /** This device's copy of the health state, without the account field. */
  state: Record<string, unknown>;
  settings: AppSettings;
  /** Per-account Apple Health state on this iPhone; null when not available or paused. */
  appleHealth: AccountHealthState | null;
};

// Credentials never belong in an export, even if one ever slipped into a stored object.
const SENSITIVE =
  /^(access_?token|refresh_?token|provider_?(refresh_)?token|id_?token|password|secret|api_?key|service_?role(_key)?)$/i;

export function withoutSensitive(value: unknown): Json {
  if (Array.isArray(value)) return value.map(withoutSensitive);
  if (value && typeof value === "object") {
    const out: Record<string, Json> = {};
    for (const [key, item] of Object.entries(value))
      if (!SENSITIVE.test(key) && item !== undefined) out[key] = withoutSensitive(item);
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value === undefined ? null : (value as Json);
}

/** Key-order independent JSON, so the server's jsonb copy and the device copy compare equal. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value ?? null);
}

const filled = (value: unknown) =>
  value != null &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0) &&
  !(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);

/** Whether a device state holds anything the user entered (a new account's defaults do not count). */
export function hasOwnContent(state: Record<string, unknown>): boolean {
  const body = (state["body"] ?? {}) as Record<string, unknown>;
  return (
    ["name", "meals", "labs", "aiPlan", "weightLog", "waterLog", "fullDays"].some((k) =>
      filled(state[k]),
    ) ||
    [
      "weightKg",
      "waistCm",
      "sleepHours",
      "steps",
      "heightCm",
      "age",
      "activity",
      "targetWeightKg",
      "stepGoal",
    ].some((k) => filled(body[k]))
  );
}

function stripAccount(state: Record<string, unknown>): Record<string, unknown> {
  const { account: _account, ...rest } = state;
  return rest;
}

export function buildDataExport({
  account,
  server,
  device,
  consentStatus,
  exportedAt = new Date(),
}: {
  account: Account;
  server: ServerCopy;
  device: DeviceCopy;
  /** Server-confirmed consent status; null when unknown. */
  consentStatus: string | null;
  exportedAt?: Date;
}) {
  const serverState = server.healthData
    ? stripAccount(server.healthData.state as Record<string, unknown>)
    : null;
  const deviceState = stripAccount(device.state);
  // The device copy is only listed when it holds changes the account does not have (e.g. consent withdrawn).
  const unsaved = serverState
    ? canonical(deviceState) !== canonical(serverState)
    : hasOwnContent(deviceState);
  const health = device.appleHealth;
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    app: "Vital Plus",
    exportedAt: exportedAt.toISOString(),
    note: "Kopie deiner Vital-Plus-Daten. „server“ ist in deinem Vital-Plus-Konto gespeichert, „device“ nur auf diesem Gerät. Werte sind deine eigenen Eingaben bzw. Schätzungen und keine medizinischen Befunde.",
    account: { email: account.email, userId: account.userId },
    server: {
      description:
        "In deinem Vital-Plus-Konto gespeichert und zwischen deinen Geräten synchronisiert.",
      consentStatus,
      consents: server.consents.map((c) => ({ ...c })),
      healthData:
        server.healthData && serverState
          ? { updatedAt: server.healthData.updatedAt, state: withoutSensitive(serverState) }
          : null,
    },
    device: {
      description: "Nur auf diesem Gerät gespeichert, nicht in deinem Konto.",
      unsavedChanges: unsaved
        ? {
            description:
              "Änderungen auf diesem Gerät, die noch nicht in deinem Konto gespeichert sind.",
            state: withoutSensitive(deviceState),
          }
        : null,
      appSettings: withoutSensitive(device.settings),
      appleHealth: health
        ? {
            description:
              "Aus Apple Health gelesene Tageswerte und deine Apple-Health-Einstellungen. Sie bleiben auf diesem Gerät und werden nicht an dein Konto gesendet.",
            connected: health.connected,
            connectedAt: health.connectedAt,
            lastSyncAt: health.lastSyncAt,
            writeToAppleHealth: { ...health.exports },
            writeSince: health.exportSince,
            importedDays: withoutSensitive(health.summary?.days ?? {}),
          }
        : null,
    },
    notIncluded: [
      "Passwort und Anmeldedaten (Sitzungen, Tokens)",
      "Hochgeladene Laborberichte, Essensfotos und Sprachaufnahmen – sie werden nur für die Auswertung verarbeitet und nicht gespeichert",
      "Über das Feedback-Formular gesendete Nachrichten",
    ],
  };
}

export type DataExport = ReturnType<typeof buildDataExport>;

/** Nothing stored for the account on the server or this device beyond the sign-in itself. */
export function isEmptyExport(data: DataExport): boolean {
  return (
    !data.server.healthData &&
    data.server.consents.length === 0 &&
    !data.device.unsavedChanges &&
    !(
      data.device.appleHealth &&
      (data.device.appleHealth.connected ||
        Object.keys(data.device.appleHealth.importedDays as object).length > 0)
    )
  );
}

export function exportFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `vitalplus-meine-daten-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export class ExportIdentityError extends Error {}

/**
 * Reads the account's server copy. Only the verified signed-in user's own rows are requested (RLS limits
 * them as well); reading needs no active health-data consent, so a withdrawn consent can still export.
 */
export async function loadServerCopy(expectedUserId: string): Promise<ServerCopy> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user || auth.user.id !== expectedUserId)
    throw new ExportIdentityError("signed-in user differs");
  const [row, consents] = await Promise.all([
    supabase
      .from("user_data")
      .select("state, updated_at")
      .eq("user_id", expectedUserId)
      .maybeSingle(),
    supabase
      .from("health_consents")
      .select("policy_version, consented_at, withdrawn_at, data_choice")
      .eq("user_id", expectedUserId)
      .order("consented_at", { ascending: true }),
  ]);
  if (row.error) throw row.error;
  if (consents.error) throw consents.error;
  return {
    healthData: row.data ? { updatedAt: row.data.updated_at, state: row.data.state as Json } : null,
    consents: (consents.data ?? []).map((c) => ({
      policyVersion: c.policy_version,
      consentedAt: c.consented_at,
      withdrawnAt: c.withdrawn_at,
      dataChoice: c.data_choice,
    })),
  };
}
