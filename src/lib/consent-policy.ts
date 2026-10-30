// Shared (browser-safe) health-data consent policy constants and helpers.
export const HEALTH_CONSENT_VERSION = "2026-10-v1";

export type ConsentStatus = "active" | "withdrawn" | "outdated" | "none";
export type QuotaResult = "ok" | "unauthenticated" | "invalid" | "no_consent" | "rate_limited" | "quota_exceeded";

/** Separate, optional consent to send content to the third-party AI providers named in the AI notice. */
export const AI_CONSENT_VERSION = "2026-10-ai-v1";

export type AiConsentFields = { aiAt?: string | null; aiVersion?: string | null };

/** AI features may send data only after consent to the current AI notice was recorded in the account state. */
export function hasAiConsent(consent: AiConsentFields | null | undefined): boolean {
  return !!consent?.aiAt && consent.aiVersion === AI_CONSENT_VERSION;
}

/** Refusal for AI requests from accounts (or older app versions) that never recorded AI consent. */
export const AI_CONSENT_REQUIRED = "Bitte erlaube zuerst die KI-Auswertung durch Drittanbieter (Profil → Meine Daten).";

/** A signed-in user must be asked for consent unless an active record for the current policy exists. */
export function needsConsentPrompt(status: ConsentStatus | null | undefined): boolean {
  return status !== "active" && status !== "withdrawn";
}

/** A locally ticked questionnaire consent may be recorded server-side only if it matches the current policy. */
export function canRecordLocalConsent(local: { healthDataAt?: string | null; healthVersion?: string | null } | undefined): boolean {
  return !!local?.healthDataAt && local.healthVersion === HEALTH_CONSENT_VERSION;
}

/** HTTP status and user-facing message for a refused AI quota check. */
export function quotaRefusal(result: QuotaResult): { status: number; error: string } | null {
  switch (result) {
    case "ok": return null;
    case "unauthenticated": return { status: 401, error: "Bitte melde dich an." };
    case "no_consent": return { status: 403, error: "Bitte erteile zuerst deine Einwilligung zur Verarbeitung von Gesundheitsdaten." };
    case "rate_limited": return { status: 429, error: "Zu viele Anfragen. Bitte warte eine Minute." };
    case "quota_exceeded": return { status: 429, error: "Tageslimit für KI-Auswertungen erreicht. Morgen geht es weiter." };
    default: return { status: 400, error: "Anfrage ungültig." };
  }
}

/** Generic sign-in failure text: never reveals whether an email is registered. */
export const GENERIC_LOGIN_ERROR = "E-Mail oder Passwort ist falsch.";

/** Login codes for an unregistered email are refused with otp_disabled; screens treat that like a sent code. */
export function codeRequestFailed(error: { code?: string | undefined } | null | undefined): boolean {
  return !!error && error.code !== "otp_disabled";
}
