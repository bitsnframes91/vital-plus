import { describe, expect, it } from "vitest";
import { dailyTip, msUntilNextTip, tipDayIndex } from "@/lib/daily-tip";

describe("tip schedule", () => {
  it("keeps the same tip day until 01:00 and switches at 01:00", () => {
    const evening = new Date(2026, 9, 5, 23, 30);
    const before = new Date(2026, 9, 6, 0, 59);
    const after = new Date(2026, 9, 6, 1, 0);
    expect(tipDayIndex(before)).toBe(tipDayIndex(evening));
    expect(tipDayIndex(after)).toBe(tipDayIndex(evening) + 1);
  });
  it("schedules the next change at 01:00", () => {
    expect(msUntilNextTip(new Date(2026, 9, 6, 0, 0))).toBe(3600000);
    expect(msUntilNextTip(new Date(2026, 9, 6, 1, 0))).toBe(24 * 3600000);
  });
  it("gives different users different tips on the same day", () => {
    const now = new Date(2026, 9, 6, 12, 0);
    const titles = new Set(["a1", "b2", "c3", "d4", "e5"].map((u) => dailyTip(null, [], u, now).tip.title));
    expect(titles.size).toBeGreaterThan(1);
  });
});
