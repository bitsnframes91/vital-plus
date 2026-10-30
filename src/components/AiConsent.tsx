import { useRef, useState } from "react";
import { Bot } from "lucide-react";
import { useStore } from "@/lib/store";
import { hasAiConsent } from "@/lib/consent-policy";
import { translateText } from "@/lib/language";
import { Localized, useLanguage } from "@/components/Localized";
import { LegalLinks } from "@/components/LegalLinks";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Disclosure shown before anything is sent to a third-party AI provider (App Review 5.1.2(i), Art. 9 GDPR).
// Keep it in sync with the AI section of src/lib/privacy-policy.ts and the providers in the AI server functions.
export const AI_NOTICE_TITLE = "KI-Auswertung durch Drittanbieter";
export const AI_NOTICE = [
  "Für diese Funktion sendet fairvitalgo Inhalte an externe KI-Dienste. Ohne deine Zustimmung wird nichts übertragen.",
  "Was gesendet wird: je nach Funktion dein Laborbefund (PDF oder Foto) mit deinen zuletzt erfassten Mahlzeiten, dein Essensfoto, deine Sprachaufnahme oder der eingegebene Name einer Mahlzeit. Ein Befund kann persönliche Angaben enthalten, die darauf stehen, z. B. Name und Geburtsdatum. Deine E-Mail-Adresse und Apple-Health-Werte werden nicht gesendet.",
  "An wen: über das KI-Gateway unseres Hosting-Anbieters Lovable an OpenAI (Auswertung von Befunden, Fotos und Mahlzeiten) und Google (Umwandlung von Sprache in Text). Die Verarbeitung kann außerhalb der EU stattfinden, z. B. in den USA.",
  "Wozu: nur um das Ergebnis zu erstellen. Ergebnisse sind Schätzungen und ersetzen keine ärztliche Beratung.",
  "Freiwillig: Ohne Zustimmung kannst du Mahlzeiten und Laborwerte von Hand eintragen. Du kannst die Zustimmung jederzeit unter Profil → Meine Daten widerrufen.",
];

/** Asks for AI consent before the first AI request; `ensure()` resolves true once consent is recorded. */
export function useAiConsent() {
  const { s, consent, grantAiConsent } = useStore();
  const granted = hasAiConsent(s.consent);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const answer = useRef<((ok: boolean) => void) | null>(null);

  const close = (ok: boolean) => {
    answer.current?.(ok);
    answer.current = null;
    setOpen(false);
  };
  const ensure = () => {
    if (granted) return Promise.resolve(true);
    answer.current?.(false);
    setErr("");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      answer.current = resolve;
    });
  };
  const agree = async () => {
    setBusy(true);
    setErr("");
    const done = await grantAiConsent();
    setBusy(false);
    if (done) close(true);
    else
      setErr(
        consent === "active"
          ? "Speichern nicht möglich. Bitte prüfe deine Internetverbindung und versuche es erneut."
          : "Bitte erteile zuerst deine Einwilligung zur Verarbeitung von Gesundheitsdaten.",
      );
  };

  const dialog = (
    <AiConsentDialog
      open={open}
      busy={busy}
      error={err}
      onAgree={() => void agree()}
      onCancel={() => close(false)}
    />
  );
  return { granted, ensure, dialog };
}

function AiConsentDialog({
  open,
  busy,
  error,
  onAgree,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  onAgree: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <AlertDialogContent className="max-h-[85dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Bot size={20} aria-hidden="true" />
            <Localized>{AI_NOTICE_TITLE}</Localized>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-left text-sm">
              {AI_NOTICE.map((p) => (
                <p key={p}>
                  <Localized>{p}</Localized>
                </p>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <LegalLinks prefix="Mehr dazu in unseren" />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            <Localized>{error}</Localized>
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>
            <Localized>{"Nicht erlauben"}</Localized>
          </AlertDialogCancel>
          <Button disabled={busy} onClick={onAgree} className="bg-fresh text-ink hover:bg-fresh/90">
            <Localized>{busy ? "Wird gespeichert …" : "Zustimmen und fortfahren"}</Localized>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Profile control: shows the AI consent state and lets the user give or withdraw it. */
export function AiConsentSetting() {
  useLanguage();
  const { s, withdrawAiConsent } = useStore();
  const { granted, ensure, dialog } = useAiConsent();
  if (!s.account) return null;
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-sm font-semibold">
        <Localized>{AI_NOTICE_TITLE}</Localized>
      </p>
      <p className="text-xs text-muted-foreground">
        <Localized>
          {granted
            ? "Erlaubt. Befunde, Fotos, Sprachaufnahmen und Mahlzeitennamen werden zur Auswertung an OpenAI bzw. Google gesendet."
            : "Nicht erlaubt. Es werden keine Inhalte an KI-Dienste gesendet; du kannst Werte von Hand eintragen."}
        </Localized>
      </p>
      {granted ? (
        <Button
          variant="outline"
          onClick={() => {
            if (
              window.confirm(
                translateText(
                  "KI-Auswertung nicht mehr erlauben? Bereits übernommene Werte bleiben gespeichert.",
                ),
              )
            )
              withdrawAiConsent();
          }}
          className="w-full"
        >
          <Localized>{"KI-Auswertung widerrufen"}</Localized>
        </Button>
      ) : (
        <Button variant="outline" onClick={() => void ensure()} className="w-full">
          <Localized>{"KI-Auswertung erlauben …"}</Localized>
        </Button>
      )}
      {dialog}
    </div>
  );
}
