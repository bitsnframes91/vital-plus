import { describe, expect, it } from "vitest";
import { completion, overallCompletion, progressTone, wellnessProgress } from "../lib/wellness-progress";
const body = { age: 35, sex: "female" as const, activity: "moderate", weightKg: 70, heightCm: 165 };
describe("daily lifestyle completion", () => {
  it("caps each category at 100 percent", () => expect(completion(150, 100)).toBe(100));
  it("weights all five categories equally", () => expect(overallCompletion([100, 50, 25, 75, 0]).percent).toBe(50));
  it("uses red below 25 percent", () => expect(progressTone(24.99)).toBe("low"));
  it("uses yellow from 25 to below 50 percent", () => { expect(progressTone(25)).toBe("partial"); expect(progressTone(49.99)).toBe("partial"); });
  it("uses green from 50 to 100 percent", () => { expect(progressTone(50)).toBe("good"); expect(progressTone(100)).toBe("good"); });
  it("preserves actual arc percentages", () => { expect(completion(15, 100)).toBe(15); expect(completion(35, 100)).toBe(35); expect(completion(65, 100)).toBe(65); });
  it("marks missing data as unassessed instead of zero", () => { expect(completion(undefined, 2)).toBeNull(); expect(overallCompletion([null, null, null, null, null])).toEqual({ percent: null, available: 0 }); });
  it("keeps partial totals on the five-category denominator", () => expect(overallCompletion([100, null, null, null, null])).toEqual({ percent: 20, available: 1 }));
  it("updates recorded hydration and keeps absent measurements empty", () => { const result = wellnessProgress([], body, 1.5); expect(result.values).toEqual([null, null, null, null, 75]); expect(wellnessProgress([], body, 2).values[4]).toBe(100); });
  it("updates recorded meals and micronutrients with individual caps", () => {
    const result = wellnessProgress([{ id: "test", label: "Mittagessen", time: "12:00", name: "Meal", date: "2026-10-12", kcal: 600, protein: 70, fiber: 15, carbs: 30, fat: 10, micronutrients: { vitamins: { c: 160 }, minerals: { magnesium: 187.5 } } }], body, 2);
    expect(result.values[0]).toBe(75); expect(result.values[3]).toBe(75); expect(result.microKnown).toBe(2);
  });
  it("uses measured steps and sleep only with valid targets", () => { expect(wellnessProgress([], body, undefined, { steps: 6500, stepGoal: 10000, sleepHours: 6, sleepGoal: 8 }).values.slice(1, 3)).toEqual([65, 75]); expect(completion(6, undefined)).toBeNull(); });
});
import { dailyValue, todayDateKey } from "@/lib/store";

describe("daily counters reset at midnight", () => {
  it("keeps values entered today and drops values from previous days", () => {
    expect(dailyValue(6500, todayDateKey())).toBe(6500);
    expect(dailyValue(6500, "2000-01-01")).toBeNull();
    expect(dailyValue(6500, null)).toBeNull();
    expect(dailyValue(null, todayDateKey())).toBeNull();
  });
});
