import type { LabMarker } from "./data";
import { status } from "./data";
import { reportMarkers } from "./plan-products";
import { generalTips, routineTips, type RoutineTip } from "./deficiency-routines";

export type DailyTip = { marker?: LabMarker; tip: RoutineTip };

// One tip per day, deterministic: matched to one of the report's low markers,
// otherwise a general routine tip. Rotates day by day, not on every render.
// The tip day switches at 01:00 local time (not midnight).
export function tipDayIndex(now: Date = new Date()): number {
  const shifted = new Date(now.getTime() - 3600000);
  return Math.floor(Date.UTC(shifted.getFullYear(), shifted.getMonth(), shifted.getDate()) / 86400000);
}

// Milliseconds until the next 01:00 local time.
export function msUntilNextTip(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(1, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

// Stable per-user offset so different users see different tips on the same day.
export function userSeed(id: string | null | undefined): number {
  let h = 0;
  for (const c of id ?? "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 9973;
}

export function dailyTip(
  plan: { date: string; items: unknown[] } | null,
  labs: LabMarker[],
  userId?: string | null,
  now: Date = new Date(),
): DailyTip {
  const dayIndex = tipDayIndex(now) + userSeed(userId);

  if (plan) {
    const low = reportMarkers(plan, labs).filter((m) => status(m).label === "Niedrig");
    if (low.length) {
      // Flatten all (marker, tip) pairs so each day shows a genuinely different
      // tip, cycling through every low marker and every tip of that marker.
      const pool: DailyTip[] = low.flatMap((marker) =>
        routineTips(marker).map((tip) => ({ marker, tip })),
      );
      return pool[dayIndex % pool.length]!;
    }
    return { tip: generalTips[dayIndex % generalTips.length]! };
  }

  return { tip: generalTips[dayIndex % generalTips.length]! };
}
