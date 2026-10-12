import { describe, it, expect } from "vitest";
import { stepsTone } from "@/components/TodayWellnessGoals";
describe("steps tone", () => {
  it("red under a quarter", () => expect(stepsTone(20)).toBe("low"));
  it("yellow from a quarter until done", () => { expect(stepsTone(25)).toBe("partial"); expect(stepsTone(99)).toBe("partial"); });
  it("green when 10.000 reached", () => expect(stepsTone(100)).toBe("good"));
});
