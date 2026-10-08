import { useSyncExternalStore, type ReactNode } from "react";
import { currentLanguage, subscribeLanguage, translateText } from "@/lib/language";

export function useLanguage() { return useSyncExternalStore(subscribeLanguage, currentLanguage, () => "de" as const); }
export function Localized({ children }: { children: ReactNode }) {
  useLanguage();
  return typeof children === "string" ? translateText(children) : children;
}