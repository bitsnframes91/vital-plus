import type { AccountHealthState } from "./device-state";
/** Read-only; never persists measurements or replaces manual entries. */
export function healthReadings(account: AccountHealthState | null | undefined, day: string, manual: { steps: number | null; sleepHours: number | null }) {
  const summary = account?.connected ? account.summary : null;
  const today = summary?.days[day];
  const measuredSleep = today?.sleepMinutes == null ? null : today.sleepMinutes / 60;
  return {
    today,
    steps: today?.steps ?? manual.steps,
    // Sleep entered today is the user's own value: it corrects the Apple Health measurement (which
    // stays available as sleepMeasuredHours) until the entry is cleared. Syncs never change it.
    sleepHours: manual.sleepHours ?? measuredSleep,
    sleepMeasuredHours: measuredSleep,
    stepsSource: today?.steps != null ? "Apple Health" : manual.steps != null ? "Manuell erfasst" : null,
    sleepSource: manual.sleepHours != null ? (measuredSleep != null ? "Manuell korrigiert" : "Manuell erfasst") : measuredSleep != null ? "Apple Health" : null,
    weight: summary?.latestBodyMass,
    // Measured only (no manual equivalent); null = no samples today or no read access, never 0.
    distanceKm: today?.distanceKm ?? null,
    walkingSpeedKmh: today?.walkingSpeedKmh ?? null,
    runningSpeedKmh: today?.runningSpeedKmh ?? null,
    history: Object.entries(summary?.days ?? {}).filter(([date]) => date <= day).sort(([a], [b]) => a.localeCompare(b)),
  };
}
