export function questionnaireReturn(value: unknown): "profile" | "health" {
  return value === "profile" ? "profile" : "health";
}