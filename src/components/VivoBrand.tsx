import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import mark from "@/assets/vivo-mark.png";

export function VivoBrand() {
  useLanguage();
  return <span className="inline-flex items-center gap-1.5"><img src={mark} width={38} height={38} alt="" className="size-[38px] object-contain" /><span className="text-[27px] font-extrabold leading-none text-foreground"><Localized>{"Vivo"}</Localized></span></span>;
}