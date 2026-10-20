import { READ_TYPES, type RawSummary, type ReadType } from "./bridge";

// Imported Apple Health values in canonical units. A missing field means "no data" (or no read
// access, which HealthKit does not reveal) — never zero.
export type DaySummary = {
  steps?: number;
  heartRate?: { avg?: number; min?: number; max?: number };
  sleepMinutes?: number;
  dietaryEnergyKcal?: number;
  activeEnergyKcal?: number;
  basalEnergyKcal?: number;
  waterMl?: number;
};
export type ImportedSummary = {
  days: Record<string, DaySummary>;
  latestBodyMass?: { kg: number; day: string };
  startDay: string;
  endDay: string;
  failedTypes: ReadType[];
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Factors to the canonical unit of each dimension. Unknown units are dropped, not guessed.
const ENERGY: Record<string, number> = { kcal: 1, Cal: 1, kJ: 1 / 4.184 };
const VOLUME: Record<string, number> = { mL: 1, L: 1000, fl_oz_us: 29.5735295625 };
const MASS: Record<string, number> = { kg: 1, g: 0.001, lb: 0.45359237 };
const RATE: Record<string, number> = { "count/min": 1, "count/s": 60 };
const DURATION: Record<string, number> = { min: 1, h: 60, s: 1 / 60 };
const COUNT: Record<string, number> = { count: 1 };

const SPEC: Record<ReadType, { units: Record<string, number>; max: number; min?: number }> = {
  stepCount: { units: COUNT, max: 200_000 },
  heartRate: { units: RATE, min: 20, max: 250 },
  bodyMass: { units: MASS, min: 20, max: 400 },
  sleepAnalysis: { units: DURATION, max: 24 * 60 },
  dietaryEnergyConsumed: { units: ENERGY, max: 20_000 },
  activeEnergyBurned: { units: ENERGY, max: 20_000 },
  basalEnergyBurned: { units: ENERGY, max: 20_000 },
  dietaryWater: { units: VOLUME, max: 20_000 },
};

/** Converts a native value to the canonical unit, or null if the unit or value is not plausible. */
export function toCanonical(type: ReadType, value: unknown, unit: unknown): number | null {
  const spec = SPEC[type];
  const factor = typeof unit === "string" ? spec.units[unit] : undefined;
  if (factor === undefined || typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return null;
  const converted = value * factor;
  if (converted > spec.max || converted < (spec.min ?? 0)) return null;
  return converted;
}

const isReadType = (type: string): type is ReadType =>
  (READ_TYPES as readonly string[]).includes(type);

export function normalizeSummary(raw: RawSummary): ImportedSummary {
  const days: Record<string, DaySummary> = {};
  let latestBodyMass: ImportedSummary["latestBodyMass"];
  for (const row of Array.isArray(raw?.results) ? raw.results : []) {
    if (!row || !isReadType(row.type) || typeof row.day !== "string" || !DAY.test(row.day))
      continue;
    const value = toCanonical(row.type, row.value, row.unit);
    if (value === null) continue;
    if (row.type === "bodyMass") {
      if (row.aggregation === "latest" && (!latestBodyMass || row.day > latestBodyMass.day))
        latestBodyMass = { kg: value, day: row.day };
      continue;
    }
    const day = (days[row.day] ??= {});
    if (row.type === "heartRate") {
      if (row.aggregation === "avg" || row.aggregation === "min" || row.aggregation === "max")
        (day.heartRate ??= {})[row.aggregation] = value;
      continue;
    }
    if (row.aggregation !== "sum") continue;
    const field = (
      {
        stepCount: "steps",
        sleepAnalysis: "sleepMinutes",
        dietaryEnergyConsumed: "dietaryEnergyKcal",
        activeEnergyBurned: "activeEnergyKcal",
        basalEnergyBurned: "basalEnergyKcal",
        dietaryWater: "waterMl",
      } as const
    )[row.type];
    day[field] = value;
  }
  const failedTypes = (Array.isArray(raw?.failedTypes) ? raw.failedTypes : []).filter(isReadType);
  return {
    days,
    ...(latestBodyMass ? { latestBodyMass } : {}),
    startDay: typeof raw?.startDay === "string" && DAY.test(raw.startDay) ? raw.startDay : "",
    endDay: typeof raw?.endDay === "string" && DAY.test(raw.endDay) ? raw.endDay : "",
    failedTypes,
  };
}
