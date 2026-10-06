import { describe, it, expect } from "vitest";
import { combinedPlan, goalProducts } from "@/lib/goal-plan";
import { dailyGoals } from "@/lib/daily-goals";

describe("goal plan", () => {
  it("builds a plan from onboarding goals without a lab report", () => {
    const steps = combinedPlan(null, ["Besser schlafen"]);
    expect(steps.length).toBe(2);
    expect(steps.every((s) => s.source === "goal")).toBe(true);
  });
  it("combines lab steps first, then goal steps", () => {
    const steps = combinedPlan({ date: "2025-01-25", items: [{ title: "Eisen", detail: "x" }] }, ["Mehr Energie"]);
    expect(steps[0].source).toBe("labor");
    expect(steps.slice(1).every((s) => s.source === "goal")).toBe(true);
  });
  it("lists a shared step once across goals", () => {
    const steps = combinedPlan(null, ["Longevity", "Immunsystem"]);
    expect(steps.filter((s) => s.key === "goal-move-30")).toHaveLength(1);
  });
  it("recommends Fairvital products for goals, each once", () => {
    const ids = goalProducts(["Longevity", "Herz & Kreislauf"]).map((e) => e.product.shopwareId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("73412");
  });
  it("hidden goal steps leave the daily goals", () => {
    const { goals } = dailyGoals(null, ["Besser schlafen"], { "goal-sleep-screen": true });
    expect(goals.map((g) => g.id)).toEqual(["goal-sleep-rhythm"]);
  });
});
