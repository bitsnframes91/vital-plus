import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText } from "@/lib/language";
import { privacyCopy } from "@/lib/privacy-policy";
import { termsCopy } from "@/lib/terms";
import { TermsDocument } from "@/components/TermsDocument";

type Doc = "terms" | "privacy";

/** Tap-friendly links that open the App-AGB and Datenschutzerklärung without leaving signup. */
export function LegalLinks({ className = "", prefix = "Mit der Registrierung akzeptierst du die" }: { className?: string; prefix?: string | null }) {
  const language = useLanguage();
  const [doc, setDoc] = useState<Doc | null>(null);
  const privacyDoc = doc === "privacy" ? privacyCopy[language] : null;
  const link = "inline-flex min-h-11 items-center px-1 font-semibold text-foreground underline underline-offset-4";
  return <>
    <p className={`text-center text-xs leading-5 text-muted-foreground ${className}`}>
      {prefix && <><Localized>{prefix}</Localized>{" "}</>}
      <button type="button" className={link} onClick={() => setDoc("terms")}><Localized>{"AGB"}</Localized></button>
      <Localized>{"und"}</Localized>
      <button type="button" className={link} onClick={() => setDoc("privacy")}><Localized>{"Datenschutzerklärung"}</Localized></button>
    </p>
    <Dialog open={doc !== null} onOpenChange={o => { if (!o) setDoc(null); }}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>{translateText(doc === "privacy" ? "Datenschutzerklärung" : "Allgemeine Geschäftsbedingungen (AGB)")}</DialogTitle></DialogHeader>
        {<TermsDocument copy={privacyDoc ?? termsCopy[language]} />}
      </DialogContent>
    </Dialog>
  </>;
}
