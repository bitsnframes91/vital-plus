import { useEffect, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText } from "@/lib/language";

/**
 * The privacy bubble dismisses itself after this delay. It is exported so the
 * behaviour can be asserted without duplicating the number in a test.
 */
export const PRIVACY_AUTO_DISMISS_MS = 2000;

export const PRIVACY_HEADLINE = "Deine Gesundheit. Deine Daten. Deine Privatsphäre.";

export const PRIVACY_BODY =
  "Wir setzen auf die strengen Datenschutzstandards der DSGVO, eine sichere Datenverarbeitung und maximale Transparenz. Deine Daten gehören dir: Kein Datenverkauf, keine Nutzung für fremde Werbung und volle Kontrolle über deine persönlichen Informationen. Du kannst jederzeit die Löschung deiner Daten veranlassen.";

/**
 * Green DSGVO bubble pinned to the top-right corner of the app frame. Tapping it
 * opens a rounded card with the privacy statement, which closes on its own after
 * two seconds, or earlier via the cross, the background or the Escape key.
 */
export function PrivacyBubble() {
  useLanguage();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  const close = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
  };

  // Auto-dismiss: the card never stays on screen longer than the set delay,
  // whichever way it was opened or closed.
  useEffect(() => {
    if (!open) return;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setOpen(false);
    }, PRIVACY_AUTO_DISMISS_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="privacy-bubble absolute right-3 z-50 inline-flex items-center gap-1.5 rounded-full bg-fv px-3 py-1.5 font-data text-[11px] uppercase tracking-normal text-ink shadow-md ring-1 ring-ink/5 transition-transform active:scale-95"
      >
        <ShieldCheck className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        <Localized>DSGVO</Localized>
      </button>

      {open && (
        <div className="absolute inset-0 z-50 flex justify-center px-4 pt-[68px]">
          <div className="absolute inset-0 bg-ink/10" onClick={close} aria-hidden="true" />
          <div
            role="dialog"
            aria-label={translateText("Datenschutz")}
            className="privacy-pop relative w-full max-w-[340px] rounded-[22px] border border-border bg-card p-4 shadow-xl"
          >
            <button
              type="button"
              onClick={close}
              aria-label={translateText("Schließen")}
              className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-ink/50 hover:bg-fv/10 hover:text-ink"
            >
              <X className="size-4" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <p className="pr-7 text-[15px] font-bold leading-snug text-foreground">
              <Localized>{PRIVACY_HEADLINE}</Localized>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              <Localized>{PRIVACY_BODY}</Localized>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
