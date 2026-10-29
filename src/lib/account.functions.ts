import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Deletes the signed-in account only after the emailed reauthentication code is verified.
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().regex(/^\d{6,10}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
    const auth = getRequestHeader("authorization") ?? "";
    // The code (nonce) is only accepted by the auth server together with a password update.
    const res = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { "content-type": "application/json", apikey: key, authorization: auth },
      body: JSON.stringify({ password: crypto.randomUUID() + "Aa1!", nonce: data.code }),
    });
    if (!res.ok) {
      console.error("deleteAccount nonce check failed", res.status, (await res.text()).slice(0, 300));
      throw new Error("Der Code ist ungültig oder abgelaufen.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Each step is idempotent (deleting missing rows succeeds), so a retry after a partial failure completes the job.
    // Feedback is anonymised rather than deleted: the message stays useful but is no longer linked to the person.
    const steps = [
      () => supabaseAdmin.from("user_data").delete().eq("user_id", context.userId),
      () => supabaseAdmin.from("ai_usage").delete().eq("user_id", context.userId),
      () => supabaseAdmin.from("health_consents").delete().eq("user_id", context.userId),
      () => supabaseAdmin.from("app_feedback").update({ user_id: null }).eq("user_id", context.userId),
    ];
    for (const step of steps) {
      const { error } = await step();
      if (error) { console.error("deleteAccount cleanup failed", error.code); throw new Error("Konto konnte nicht vollständig gelöscht werden. Bitte versuche es erneut."); }
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error && error.status !== 404) throw new Error("Konto konnte nicht gelöscht werden. Bitte versuche es erneut.");
    return { ok: true as const };
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
