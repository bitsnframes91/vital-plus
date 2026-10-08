import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import steps from "@/assets/steps-new.png.asset.json";

export function StepsIcon({ className = "size-7" }: { className?: string }) {
  useLanguage();
  return <img src={steps.url} alt="" className={`vivo-bounce object-contain ${className}`} />;
}