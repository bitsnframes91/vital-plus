import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Deletes the signed-in account only after the emailed reauthentication code is verified.
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const auth = getRequestHeader("authorization") ?? "";
    // The code (nonce) is only accepted by the auth server together with a password update.
    const res = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { "content-type": "application/json", apikey: key, authorization: auth },
      body: JSON.stringify({ password: crypto.randomUUID() + "Aa1!", nonce: data.code }),
    });
    if (!res.ok) throw new Error("Der Code ist ungültig oder abgelaufen.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_data").delete().eq("user_id", context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Konto konnte nicht gelöscht werden.");
    return { ok: true };
  });
