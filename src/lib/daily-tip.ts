import type { LabMarker } from "./data";
import { status } from "./data";
import { reportMarkers } from "./plan-products";
import { generalTips, routineTips, type RoutineTip } from "./deficiency-routines";

export type DailyTip = { marker?: LabMarker; tip: RoutineTip };

// One tip per day, deterministic: matched to one of the report's low markers,
// otherwise a general routine tip. Rotates day by day, not on every render.
export function dailyTip(plan: { date: string; items: unknown[] } | null, labs: LabMarker[]): DailyTip {
  const now = new Date();
  const dayIndex = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );

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
