import { describe, expect, it } from "vitest";
import {
  FROM_ADDRESS,
  FROM_DOMAIN,
  ROOT_DOMAIN,
  SENDER_DOMAIN,
  SITE_NAME,
} from "@/lib/email-templates/sender";

// The sender identity the user asked for: name "FairvitalGO", address
// noreply@fairvitalgo.de, delivered through the verified notify subdomain.
describe("app email sender identity", () => {
  it("signs every email as FairvitalGO", () => {
    expect(SITE_NAME).toBe("FairvitalGO");
  });

  it("shows noreply@fairvitalgo.de as the visible address", () => {
    expect(FROM_ADDRESS).toBe("noreply@fairvitalgo.de");
    expect(FROM_DOMAIN).toBe("fairvitalgo.de");
  });

  it("delivers through the verified sender subdomain, never the root domain", () => {
    expect(SENDER_DOMAIN).toBe("notify.fairvitalgo.de");
    expect(SENDER_DOMAIN).not.toBe(ROOT_DOMAIN);
  });

  it("keeps the visible address inside the brand's own root domain", () => {
    expect(FROM_ADDRESS.endsWith(`@${ROOT_DOMAIN}`)).toBe(true);
  });
});
