import i18next from "i18next";
import baseCatalogue from "./translations.json";
import labCatalogue from "./lab-information-translations.json";
const catalogue = { ...baseCatalogue, ...labCatalogue };

export type Language = "de" | "en" | "es";
export const languages = [{ value: "en", label: "English" }, { value: "de", label: "Deutsch" }, { value: "es", label: "Spanish" }] as const;
const resources = Object.fromEntries(["en", "es"].map((language, index) => [language, { translation: Object.fromEntries(Object.entries(catalogue).map(([key, values]) => [key, values[index]])) }]));
void i18next.init({ lng: "de", fallbackLng: "de", resources, keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false }, initAsync: false });
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
  const parts = text.split(/( · |, | → |: )/);
  if (parts.length > 1) return parts.map(part => translateExact(part)).join("");
  return translateExact(text);
}
function translateExact(text: string): string {
  const source = text.trim();
  if (!source) return text;
  const direct = i18next.t(source);
  if (direct !== source) return text.replace(source, direct);
  for (const [pattern, values] of Object.entries(catalogue)) {
    if (!/\{[^}]+\}/.test(pattern)) continue;
    const names = [...pattern.matchAll(/\{([^}]+)\}/g)].map(match => match[1]!);
    const escaped = pattern.split(/\{[^}]+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)");
    const match = source.match(new RegExp(`^${escaped}$`));
    if (!match) continue;
    const translated = (values[currentLanguage() === "en" ? 0 : 1] ?? source).replace(/\{([^}]+)\}/g, (_, name: string) => match[names.indexOf(name) + 1] ?? "");
    return text.replace(source, translated);
  }
  return text;
}