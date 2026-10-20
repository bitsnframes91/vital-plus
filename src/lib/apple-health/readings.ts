import type { AccountHealthState } from "./device-state";
/** Read-only; never persists measurements or replaces manual entries. */
export function healthReadings(account: AccountHealthState | null | undefined, day: string, manual: { steps: number | null; sleepHours: number | null }) {
  const summary = account?.connected ? account.summary : null;
  const today = summary?.days[day];
  return {
    today,
    steps: today?.steps ?? manual.steps,
    sleepHours: today?.sleepMinutes == null ? manual.sleepHours : today.sleepMinutes / 60,
    stepsSource: today?.steps != null ? "Apple Health" : manual.steps != null ? "Manuell erfasst" : null,
    sleepSource: today?.sleepMinutes != null ? "Apple Health" : manual.sleepHours != null ? "Manuell erfasst" : null,
    weight: summary?.latestBodyMass,
    history: Object.entries(summary?.days ?? {}).filter(([date]) => date <= day).sort(([a], [b]) => a.localeCompare(b)),
  };
}
