import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText } from "@/lib/language";
import { privacyCopy } from "@/lib/privacy-policy";
import { termsCopy } from "@/lib/terms";

type Doc = "terms" | "privacy";

/** Tap-friendly links that open the App-AGB and Datenschutzerklärung without leaving signup. */
export function LegalLinks({ className = "", prefix = "Mit der Registrierung akzeptierst du die" }: { className?: string; prefix?: string | null }) {
  const language = useLanguage();
  const [doc, setDoc] = useState<Doc | null>(null);
  const copy = doc === "privacy" ? privacyCopy[language] : termsCopy[language];
  const link = "inline-flex min-h-11 items-center px-0.5 font-semibold text-foreground underline decoration-2 underline-offset-4";
  return <>
    <p className={`mx-auto max-w-[34ch] text-center text-sm leading-6 text-foreground/80 ${className}`}>
      {prefix && <><Localized>{prefix}</Localized>{" "}</>}
      <button type="button" className={link} onClick={() => setDoc("terms")}><Localized>{"AGB"}</Localized></button>
      {" "}<Localized>{"und"}</Localized>{" "}
      <button type="button" className={link} onClick={() => setDoc("privacy")}><Localized>{"Datenschutzerklärung"}</Localized></button>
    </p>
    <Dialog open={doc !== null} onOpenChange={o => { if (!o) setDoc(null); }}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>{translateText(doc === "privacy" ? "Datenschutzerklärung" : "Allgemeine Geschäftsbedingungen (AGB)")}</DialogTitle></DialogHeader>
        <article className="space-y-5 break-words text-sm leading-6">
          <p className="text-xs text-muted-foreground">{copy.date}</p>
          {copy.sections.map(([title, text]) => <section key={title}><h2 className="mb-2 font-semibold text-foreground">{title}</h2><p className="text-muted-foreground">{text}</p></section>)}
        </article>
      </DialogContent>
    </Dialog>
  </>;
}
