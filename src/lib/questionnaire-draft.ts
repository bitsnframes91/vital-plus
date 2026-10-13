export type QuestionnaireDraft = {
  name: string;
  goals: string[];
  diet: string;
  body: { weightKg: number; heightCm: number; age: number; sex: "female" | "male" | "diverse" | "unspecified"; activity: string; stepGoal: number };
};
const KEY = "vitalplus-questionnaire-draft";
export function validQuestionnaire(value: unknown): value is QuestionnaireDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as QuestionnaireDraft;
  return typeof d.name === "string" && d.name.trim().length > 0 && Array.isArray(d.goals) && d.goals.length > 0 && d.goals.every(g => typeof g === "string") && typeof d.diet === "string"
    && Boolean(d.body) && d.body.weightKg >= 20 && d.body.weightKg <= 400 && d.body.heightCm >= 100 && d.body.heightCm <= 250
    && d.body.age >= 18 && d.body.age <= 120 && ["female", "male", "diverse", "unspecified"].includes(d.body.sex)
    && typeof d.body.activity === "string" && Number.isFinite(d.body.stepGoal);
}
export function saveQuestionnaire(draft: QuestionnaireDraft) { sessionStorage.setItem(KEY, JSON.stringify(draft)); }
export function readQuestionnaire(): QuestionnaireDraft | null {
  try { const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); return validQuestionnaire(value) ? value : null; } catch { return null; }
}
export function clearQuestionnaire() { sessionStorage.removeItem(KEY); }
export function questionnaireForAccount(savedState: unknown, metadata: unknown): QuestionnaireDraft | null {
  return savedState == null && validQuestionnaire(metadata) ? metadata : null;
}