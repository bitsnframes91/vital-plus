import { setResponseStatus } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONSENT_REQUIRED, HEALTH_CONSENT_VERSION, hasAiConsent, quotaRefusal, type AiConsentFields, type QuotaResult } from "./consent-policy";

export type AiKind = "meal_text" | "meal_voice" | "meal_photo" | "lab";

/** Checks consent + per-user limits atomically in the database. Returns an error DTO (and sets HTTP status) when refused. */
export async function enforceAiQuota(supabase: SupabaseClient<any>, kind: AiKind): Promise<{ ok: false; error: string } | null> {
  // AI consent is recorded in the caller's own account state (RLS: own row only); nothing is sent without it.
  const { data: row, error: rowError } = await supabase.from("user_data").select("state").maybeSingle();
  if (rowError) {
    console.error("AI consent check failed", rowError.code);
    setResponseStatus(503);
    return { ok: false, error: "Die KI-Funktion ist gerade nicht verfügbar." };
  }
  if (!hasAiConsent((row?.state as { consent?: AiConsentFields } | null)?.consent)) {
    setResponseStatus(403);
    return { ok: false, error: AI_CONSENT_REQUIRED };
  }
  const { data, error } = await supabase.rpc("consume_ai_quota", { _kind: kind, _version: HEALTH_CONSENT_VERSION });
  if (error) {
    console.error("quota check failed", error.code);
    setResponseStatus(503);
    return { ok: false, error: "Die KI-Funktion ist gerade nicht verfügbar." };
  }
  const refusal = quotaRefusal(data as QuotaResult);
  if (!refusal) return null;
  setResponseStatus(refusal.status);
  return { ok: false, error: refusal.error };
}
