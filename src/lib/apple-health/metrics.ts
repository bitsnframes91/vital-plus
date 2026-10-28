import type { ReadType } from "./bridge";
import type { DaySummary, ImportedSummary } from "./summary";

// Per-metric availability for the Apple Health section. HealthKit never reveals whether READ access
// was denied, so "noData" means only that Apple Health returned nothing for the import window:
// no recording device, no samples, or reading not allowed. Nothing here claims a denial.

export type MetricStatus = "notSynced" | "available" | "noData" | "unsupported" | "failed";

export type HealthMetric = {
  type: ReadType;
  /** German source label, translated through the catalogue. */
  label: string;
  has: (day: DaySummary) => boolean;
};

export const HEALTH_METRICS: readonly HealthMetric[] = [
  { type: "stepCount", label: "Schritte", has: (d) => d.steps != null },
  { type: "sleepAnalysis", label: "Schlaf", has: (d) => d.sleepMinutes != null },
  // Heart rate is read and shown in Trends but intentionally not listed here.
  {
    type: "distanceWalkingRunning",
    label: "Strecke (Gehen und Laufen)",
    has: (d) => d.distanceKm != null,
  },
  { type: "walkingSpeed", label: "Gehgeschwindigkeit", has: (d) => d.walkingSpeedKmh != null },
  { type: "runningSpeed", label: "Laufgeschwindigkeit", has: (d) => d.runningSpeedKmh != null },
  { type: "activeEnergyBurned", label: "Aktive Energie", has: (d) => d.activeEnergyKcal != null },
  { type: "basalEnergyBurned", label: "Ruheenergie", has: (d) => d.basalEnergyKcal != null },
];

export type MetricState = {
  type: ReadType;
  label: string;
  status: MetricStatus;
  lastDay: string | null;
};

/** Status of every supported metric for the last import; `lastDay` is the newest day with a value. */
export function metricStates(summary: ImportedSummary | null | undefined): MetricState[] {
  return HEALTH_METRICS.map(({ type, label, has }) => {
    if (!summary) return { type, label, status: "notSynced", lastDay: null };
    if (summary.unsupportedTypes?.includes(type))
      return { type, label, status: "unsupported", lastDay: null };
    let lastDay: string | null = null;
    for (const [day, values] of Object.entries(summary.days ?? {}))
      if (has(values) && (!lastDay || day > lastDay)) lastDay = day;
    if (lastDay) return { type, label, status: "available", lastDay };
    return {
      type,
      label,
      status: summary.failedTypes?.includes(type) ? "failed" : "noData",
      lastDay: null,
    };
  });
}

/** German source text for each status (translated through the catalogue). */
export const METRIC_STATUS_TEXT: Record<MetricStatus, string> = {
  notSynced: "Noch nicht synchronisiert",
  available: "Daten vorhanden",
  noData: "Keine Messwerte in den letzten 7 Tagen",
  unsupported: "Erfordert iOS 16 oder neuer",
  failed: "Konnte nicht gelesen werden",
};
