import { describe, expect, it } from "vitest";
import { needsConfirm } from "../components/ConfirmBanner";

describe("provider confirmation", () => {
  const account = (provider: string, confirmed = false) => ({
    email: "test@example.com",
    app_metadata: { provider },
    user_metadata: { vivo_confirmed: confirmed },
  });
  it("does not require an extra email link for Apple accounts", () => {
    expect(needsConfirm(account("apple"))).toBe(false);
  });
  it("preserves the extra confirmation for Google accounts", () => {
    expect(needsConfirm(account("google"))).toBe(true);
    expect(needsConfirm(account("google", true))).toBe(false);
  });
  it("leaves password account confirmation to the sign-in service", () => {
    expect(needsConfirm(account("email"))).toBe(false);
  });
});