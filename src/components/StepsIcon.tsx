import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import steps from "@/assets/steps-bold.png.asset.json";

export function StepsIcon({ className = "size-7", animate = true }: { className?: string; animate?: boolean }) {
  useLanguage();
  return <img src={steps.url} alt="" className={`${animate ? "vivo-bounce " : ""}object-contain ${className}`} />;
}
