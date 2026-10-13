import { beforeEach, describe, expect, it } from "vitest";
import { clearQuestionnaire, readQuestionnaire, saveQuestionnaire, questionnaireForAccount, type QuestionnaireDraft } from "../lib/questionnaire-draft";
const draft: QuestionnaireDraft = { name: "Mira", goals: ["Longevity"], diet: "Vegetarisch", body: { age: 35, sex: "female", activity: "moderate", weightKg: 72.5, heightCm: 175, stepGoal: 8000 } };
describe("Questionnaire before signup", () => {
  beforeEach(() => sessionStorage.clear());
  it("retains questionnaire answers until account creation", () => { saveQuestionnaire(draft); expect(readQuestionnaire()).toEqual(draft); });
  it("initializes a new account only from its own signup metadata", () => { saveQuestionnaire(draft); expect(questionnaireForAccount(null, undefined)).toBeNull(); expect(questionnaireForAccount(null, draft)?.body.weightKg).toBe(72.5); });
  it("never replaces existing account answers with signup metadata", () => { expect(questionnaireForAccount({ name: "Existing user" }, draft)).toBeNull(); });
  it("removes the device draft after registration", () => { saveQuestionnaire(draft); clearQuestionnaire(); expect(readQuestionnaire()).toBeNull(); });
});