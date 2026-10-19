import type {
  DeleteItem,
  DeleteResult,
  WriteResult,
  WriteSample,
  WriteStatus,
  WriteType,
} from "./bridge";
import type { ExportSettings, LedgerEntry } from "./device-state";

// Decides what Vital Plus writes to Apple Health. Inputs are only entries the user made in the app
// (meals, water, weight); imported Apple Health data never reaches this module.

/** Vital Plus has no first-party activity record yet, so active energy is never written. */
export const ACTIVE_ENERGY_EXPORT_ENABLED = false;
/** Exports cover at most the last 7 days, so enabling a type never uploads long histories. */
export const EXPORT_WINDOW_DAYS = 7;
const LEDGER_KEEP_DAYS = 14;

export type AppRecords = {
  meals: { id: string; kcal: number; date: string; time: string }[];
  waterLog: Record<string, number>;
  weightLog: Record<string, number>;
};

type Candidate = {
  recordId: string;
  type: WriteType;
  value: number;
  unit: string;
  day: string;
  startMs: number;
  endMs: number;
};

const RECORD_ID = /^[a-z]+\.[A-Za-z0-9_.:-]{1,80}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localMs(day: string, hours: number, minutes = 0, seconds = 0, ms = 0): number {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, hours, minutes, seconds, ms).getTime();
}

function windowStart(now: Date, since: string): string {
  const first = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (EXPORT_WINDOW_DAYS - 1),
  );
  const earliest = dayKey(first);
  return since > earliest ? since : earliest;
}

function candidates(
  records: AppRecords,
  settings: ExportSettings,
  from: string,
  now: Date,
  ledger: Record<string, LedgerEntry>,
): Candidate[] {
  const today = dayKey(now);
  const inWindow = (day: string) => DAY.test(day) && day >= from && day <= today;
  const out: Candidate[] = [];
  if (settings.dietaryEnergyConsumed) {
    for (const meal of records.meals) {
      const recordId = `meal.${meal.id}`;
      const kcal = Math.round(meal.kcal * 10) / 10;
      if (!RECORD_ID.test(recordId) || !inWindow(meal.date) || !(kcal >= 1)) continue;
      const [h, min] = /^\d{1,2}:\d{2}$/.test(meal.time)
        ? (meal.time.split(":").map(Number) as [number, number])
        : [12, 0];
      const at = Math.min(localMs(meal.date, h, min), now.getTime());
      out.push({
        recordId,
        type: "dietaryEnergyConsumed",
        value: kcal,
        unit: "kcal",
        day: meal.date,
        startMs: at,
        endMs: at,
      });
    }
  }
  if (settings.dietaryWater) {
    for (const [day, liters] of Object.entries(records.waterLog)) {
      const ml = Math.round(liters * 1000);
      if (!inWindow(day) || !(ml >= 1)) continue;
      // One daily total per day, from midnight to now (today) or to the end of that day.
      const endMs = day === today ? now.getTime() : localMs(day, 23, 59, 59, 999);
      out.push({
        recordId: `water.${day}`,
        type: "dietaryWater",
        value: ml,
        unit: "mL",
        day,
        startMs: localMs(day, 0),
        endMs,
      });
    }
  }
  if (settings.bodyMass) {
    for (const [day, kg] of Object.entries(records.weightLog)) {
      const value = Math.round(kg * 10) / 10;
      if (!inWindow(day) || !(value >= 20 && value <= 400)) continue;
      const recordId = `weight.${day}`;
      const at = ledger[recordId]?.startMs ?? (day === today ? now.getTime() : localMs(day, 12));
      out.push({ recordId, type: "bodyMass", value, unit: "kg", day, startMs: at, endMs: at });
    }
  }
  return out;
}

export type ExportPlan = { writes: WriteSample[]; deletes: DeleteItem[]; blocked: WriteType[] };

export function planExports(input: {
  records: AppRecords;
  settings: ExportSettings;
  since: string | null;
  ledger: Record<string, LedgerEntry>;
  statuses: Partial<Record<WriteType, WriteStatus>>;
  now: Date;
}): ExportPlan {
  const { records, settings, since, ledger, statuses, now } = input;
  const enabled = (Object.keys(settings) as (keyof ExportSettings)[]).filter((t) => settings[t]);
  if (!since || enabled.length === 0) return { writes: [], deletes: [], blocked: [] };
  const allowed = (type: WriteType) =>
    statuses[type] === "authorized" &&
    (type !== "activeEnergyBurned" || ACTIVE_ENERGY_EXPORT_ENABLED);
  const blocked = enabled.filter((t) => !allowed(t));
  const from = windowStart(now, since);
  const found = candidates(records, settings, from, now, ledger);
  const present = new Set(found.map((c) => c.recordId));
  const writes: WriteSample[] = [];
  for (const c of found) {
    if (!allowed(c.type)) continue;
    const previous = ledger[c.recordId];
    if (previous && previous.type === c.type && previous.value === c.value) continue;
    const version = Math.max(now.getTime(), (previous?.version ?? 0) + 1);
    writes.push({
      recordId: c.recordId,
      type: c.type,
      value: c.value,
      unit: c.unit,
      startMs: c.startMs,
      endMs: c.endMs,
      version,
    });
  }
  // A meal removed in the app or water reset to zero removes this app's own sample. Weight entries
  // are only replaced, and nothing is deleted for a type the user has turned off.
  const deletes: DeleteItem[] = [];
  for (const [recordId, entry] of Object.entries(ledger)) {
    if (present.has(recordId) || entry.day < from || entry.type === "bodyMass") continue;
    const type = entry.type as keyof ExportSettings;
    if (settings[type] && allowed(entry.type)) deletes.push({ recordId, type: entry.type });
  }
  return { writes, deletes, blocked };
}

export function applyResults(
  ledger: Record<string, LedgerEntry>,
  writes: WriteSample[],
  writeResults: WriteResult[],
  deletes: DeleteItem[],
  deleteResults: DeleteResult[],
  now: Date,
): Record<string, LedgerEntry> {
  const next = { ...ledger };
  const byWrite = new Map(writes.map((w) => [w.recordId, w]));
  for (const result of writeResults) {
    const sample = byWrite.get(result.recordId);
    if (!sample || (result.status !== "saved" && result.status !== "duplicate")) continue;
    const day = sample.recordId.startsWith("meal.")
      ? dayKey(new Date(sample.startMs))
      : sample.recordId.slice(sample.recordId.indexOf(".") + 1);
    next[sample.recordId] = {
      type: sample.type,
      value: sample.value,
      version: sample.version,
      startMs: sample.startMs,
      endMs: sample.endMs,
      day,
    };
  }
  const deleted = new Set(deletes.map((d) => d.recordId));
  for (const result of deleteResults)
    if (
      deleted.has(result.recordId) &&
      (result.status === "deleted" || result.status === "notFound")
    )
      delete next[result.recordId];
  const keepFrom = dayKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - LEDGER_KEEP_DAYS),
  );
  for (const [id, entry] of Object.entries(next)) if (entry.day < keepFrom) delete next[id];
  return next;
}
