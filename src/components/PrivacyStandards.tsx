import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/Localized";
import { privacyStandards } from "@/lib/privacy-standards";

/**
 * The privacy statement shown under Profil → Meine Daten, below the account
 * deletion row, so the screen explains how health data is protected before
 * someone decides to delete their account.
 */
export function PrivacyStandards() {
  const language = useLanguage();
  const copy = privacyStandards[language] ?? privacyStandards.de;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fresh text-ink">
          <ShieldCheck className="size-5!" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 className="text-[15px] font-bold leading-snug text-foreground">{copy.headline}</h2>
      </header>

      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{copy.intro}</p>

      <h3 className="mt-5 text-[12px] font-bold uppercase tracking-wide text-foreground">{copy.standardsTitle}</h3>
      <ul className="mt-2 space-y-2">
        {copy.standards.map(([title, text]) => (
          <li key={title} className="rounded-xl bg-muted p-3">
            <p className="text-[13px] font-semibold leading-5 text-foreground">{title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-[12px] font-bold uppercase tracking-wide text-foreground">{copy.legalTitle}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{copy.legalIntro}</p>
      <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
        {copy.legal.map(([title, text]) => (
          <li key={title} className="flex flex-col gap-0.5 bg-muted/40 px-3 py-2">
            <span className="text-[12px] font-semibold text-primary">{title}</span>
            <span className="text-[12px] leading-5 text-muted-foreground">{text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-border pt-3 text-center text-[13px] font-semibold text-foreground">{copy.closing}</p>
    </section>
  );
}
