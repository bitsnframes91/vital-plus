import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Builds the server-only dependencies for the deletion challenge (admin client loaded in the handler).
async function deletionDeps() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const secret = process.env["ACCOUNT_DELETION_HMAC_SECRET"] ?? "";
  const must = (error: { code?: string } | null, what: string) => {
    if (error) { console.error(`account deletion: ${what} failed`, error.code); throw new Error(what); }
  };
  return {
    secret,
    async issue(userId: string, challengeId: string, mac: string) {
      const { data, error } = await supabaseAdmin.rpc("issue_account_deletion_challenge", { _user_id: userId, _challenge_id: challengeId, _code_mac: mac });
      must(error, "issue");
      return data as "ok" | "cooldown" | "limited";
    },
    async currentChallengeId(userId: string) {
      const { data, error } = await supabaseAdmin.rpc("account_deletion_challenge_id", { _user_id: userId });
      must(error, "lookup");
      return (data as string | null) ?? null;
    },
    async consume(userId: string, challengeId: string, mac: string) {
      const { data, error } = await supabaseAdmin.rpc("consume_account_deletion_challenge", { _user_id: userId, _challenge_id: challengeId, _code_mac: mac });
      must(error, "consume");
      return data as "ok" | "invalid" | "expired" | "locked";
    },
    async inProgress(userId: string) {
      const { data, error } = await supabaseAdmin.rpc("account_deletion_in_progress", { _user_id: userId });
      must(error, "progress");
      return data === true;
    },
    async sendCode(email: string, code: string, challengeId: string) {
      try {
        const res = await sendTemplateEmail("account-deletion-code", email, { templateData: { code }, idempotencyKey: `account-deletion-code-${challengeId}` });
        if (!res.sent) console.error("account deletion: code email suppressed");
        return res.sent;
      } catch (e) {
        console.error("account deletion: code email failed", (e as { code?: string }).code ?? "unknown");
        return false;
      }
    },
    // Each step is idempotent (deleting missing rows succeeds). Feedback is anonymised, not deleted.
    async cleanup(userId: string) {
      must((await supabaseAdmin.from("user_data").delete().eq("user_id", userId)).error, "cleanup user_data");
      must((await supabaseAdmin.from("ai_usage").delete().eq("user_id", userId)).error, "cleanup ai_usage");
      must((await supabaseAdmin.from("health_consents").delete().eq("user_id", userId)).error, "cleanup consents");
      must((await supabaseAdmin.from("app_feedback").update({ user_id: null }).eq("user_id", userId)).error, "cleanup feedback");
    },
    async deleteAuthUser(userId: string) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error && error.status !== 404) { console.error("account deletion: auth user delete failed", error.status); throw new Error("auth delete"); }
    },
    async clearChallenge(userId: string) {
      must((await supabaseAdmin.from("account_deletion_challenges").delete().eq("user_id", userId)).error, "clear challenge");
    },
  };
}

// Sends a fresh single-use deletion code to the signed-in account's own email address.
export const requestAccountDeletionCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email : "";
    if (!email) return { ok: false as const, reason: "send_failed" as const };
    const { requestDeletionCode } = await import("@/lib/account-deletion.server");
    return requestDeletionCode(await deletionDeps(), context.userId, email);
  });

// Deletes the signed-in account only after its own server-verified deletion code is consumed.
// `code: null` only resumes a deletion already verified server-side that failed part-way.
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().regex(/^\d{6}$/).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { deleteWithCode } = await import("@/lib/account-deletion.server");
    return deleteWithCode(await deletionDeps(), context.userId, data.code);
  });

// Sends a password-reset link only to accounts whose email has been confirmed.
// Always resolves the same way so the response does not reveal whether an account exists.
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(320), redirectTo: z.string().url().max(500) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    let confirmed = false;
    for (let page = 1; page <= 50; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("Senden nicht möglich");
      const hit = list.users.find((u) => u.email?.toLowerCase() === email);
      if (hit) { confirmed = !!hit.email_confirmed_at; break; }
      if (list.users.length < 1000) break;
    }
    if (!confirmed) return { ok: true };
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: data.redirectTo });
    if (error) throw new Error("Senden nicht möglich");
    return { ok: true };
  });
