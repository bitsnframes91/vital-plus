import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { needsConsentPrompt, canRecordLocalConsent, quotaRefusal, HEALTH_CONSENT_VERSION, GENERIC_LOGIN_ERROR } from "@/lib/consent-policy";

describe("health consent", () => {
  it("prompts existing users without a consent record", () => expect(needsConsentPrompt("none")).toBe(true));
  it("prompts users who consented to an older policy", () => expect(needsConsentPrompt("outdated")).toBe(true));
  it("does not prompt users with active consent", () => expect(needsConsentPrompt("active")).toBe(false));
  it("does not auto-record legacy local consent without a policy version", () =>
    expect(canRecordLocalConsent({ healthDataAt: "2026-01-01T00:00:00Z" })).toBe(false));
  it("records questionnaire consent for the current policy", () =>
    expect(canRecordLocalConsent({ healthDataAt: "2026-10-29T00:00:00Z", healthVersion: HEALTH_CONSENT_VERSION })).toBe(true));
  it("onboarding consent checkbox starts unticked", () =>
    expect(readFileSync("src/routes/onboarding.tsx", "utf8")).toMatch(/const \[ok, setOk\] = useState\(false\)/));
});

describe("AI quota refusals", () => {
  it("returns 429 when rate limited", () => expect(quotaRefusal("rate_limited")?.status).toBe(429));
  it("returns 429 when daily quota exceeded", () => expect(quotaRefusal("quota_exceeded")?.status).toBe(429));
  it("returns 403 without consent", () => expect(quotaRefusal("no_consent")?.status).toBe(403));
  it("returns 401 when unauthenticated", () => expect(quotaRefusal("unauthenticated")?.status).toBe(401));
  it("allows ok", () => expect(quotaRefusal("ok")).toBeNull());
  it("every AI endpoint requires auth and the quota check", () => {
    const ai = readFileSync("src/lib/ai.functions.ts", "utf8");
    const photo = readFileSync("src/lib/food-photo.functions.ts", "utf8");
    for (const k of ["lab", "meal_voice", "meal_text"]) expect(ai).toContain(`enforceAiQuota(context.supabase, "${k}")`);
    expect(photo).toContain('enforceAiQuota(context.supabase, "meal_photo")');
    expect(ai.match(/requireSupabaseAuth\]/g)?.length).toBe(4);
  });
});

describe("account enumeration", () => {
  it("accountExists endpoint no longer exists", () =>
    expect(readFileSync("src/lib/account.functions.ts", "utf8")).not.toContain("accountExists"));
  it("sign-in screens use one generic error", () => {
    for (const f of ["src/routes/login.tsx", "src/routes/index.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toContain("Dieses Konto existiert nicht");
      expect(src).toContain("GENERIC_LOGIN_ERROR");
    }
    expect(GENERIC_LOGIN_ERROR).toBe("E-Mail oder Passwort ist falsch.");
  });
});

describe("account deletion", () => {
  it("removes every user-linked table before deleting the auth user", () => {
    const src = readFileSync("src/lib/account.functions.ts", "utf8");
    for (const t of ["user_data", "ai_usage", "health_consents", "app_feedback"]) expect(src).toContain(`from("${t}")`);
    expect(src.indexOf("deleteUser")).toBeGreaterThan(src.indexOf('from("app_feedback")'));
  });
});
