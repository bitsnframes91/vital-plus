import i18next from "i18next";
import catalogue from "./translations.json";

export type Language = "de" | "en" | "es";
export const languages = [{ value: "en", label: "English" }, { value: "de", label: "Deutsch" }, { value: "es", label: "Spanish" }] as const;
const resources = Object.fromEntries(["en", "es"].map((language, index) => [language, { translation: Object.fromEntries(Object.entries(catalogue).map(([key, values]) => [key, values[index]])) }]));
void i18next.init({ lng: "de", fallbackLng: "de", resources, keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false }, initImmediate: false });
export function validLanguage(value: unknown): Language { return value === "en" || value === "es" ? value : "de"; }
export function setLanguage(language: Language) { void i18next.changeLanguage(language); }
export function currentLanguage(): Language { return validLanguage(i18next.language); }
export function languageLocale() { return { de: "de-DE", en: "en-GB", es: "es-ES" }[currentLanguage()]; }
export function subscribeLanguage(listener: () => void) { i18next.on("languageChanged", listener); return () => { i18next.off("languageChanged", listener); }; }

/** Translate interface copy only; persisted goal identifiers and user input stay unchanged. */
export function translateText(text: string): string {
  if (currentLanguage() === "de" || !text.trim()) return text;
  const source = text.trim().replace(/\s+/g, " ");
  const direct = i18next.t(source);
  if (direct !== source) return text.replace(text.trim(), direct);
  // Mixed labels retain their numbers, names, units and punctuation.
  const parts = source.split(/( · |, | → |: )/);
  if (parts.length > 1) return parts.map(part => translateExact(part)).join("");
  return translateExact(source);
}
function translateExact(source: string): string {
  const direct = i18next.t(source);
  if (direct !== source) return direct;
  // Templates cover runtime counts without sending personal text to a translation service.
  for (const [pattern, values] of Object.entries(catalogue)) {
    if (!pattern.includes("{value}")) continue;
    const escaped = pattern.split("{value}").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)");
    const match = source.match(new RegExp(`^${escaped}$`));
    if (!match) continue;
    let index = 1;
    return values[currentLanguage() === "en" ? 0 : 1].replaceAll("{value}", () => match[index++] ?? "");
  }
  return source;
}