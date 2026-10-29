import { describe, expect, it } from "vitest";
import { validQuestionnaire } from "@/lib/questionnaire-draft";

const base = { name: "Anna", goals: ["Mehr Energie"], diet: "", body: { weightKg: 70, heightCm: 170, age: 30, sex: "female", activity: "moderate", stepGoal: 8000 } };

describe("health data consent timestamp", () => {
  it("accepts a questionnaire carrying a valid consent timestamp", () => {
    expect(validQuestionnaire({ ...base, healthConsentAt: "2026-10-28T15:40:00.000Z" })).toBe(true);
  });
  it("rejects a questionnaire with an invalid consent timestamp", () => {
    expect(validQuestionnaire({ ...base, healthConsentAt: "not-a-date" })).toBe(false);
  });
});
