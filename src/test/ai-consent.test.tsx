import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_CONSENT_REQUIRED, AI_CONSENT_VERSION, hasAiConsent } from "@/lib/consent-policy";
import { privacyCopy } from "@/lib/privacy-policy";
import { termsCopy, type TermsCopy } from "@/lib/terms";
import catalogue from "@/lib/translations.json";

// Content goes to third-party AI providers only after separate consent (App Review 5.1.2(i), Art. 9 GDPR).
const m = vi.hoisted(() => ({
  consent: {} as Record<string, unknown>,
  health: "active" as string | null,
  grant: vi.fn<() => Promise<boolean>>(),
  status: vi.fn(),
}));
vi.mock("@/lib/store", () => ({
  useStore: () => ({
    s: { consent: m.consent, account: { email: "a@b.de", userId: "u1" } },
    consent: m.health,
    grantAiConsent: m.grant,
    withdrawAiConsent: vi.fn(),
  }),
}));
vi.mock("@tanstack/react-start/server", () => ({ setResponseStatus: m.status }));

const { useAiConsent, AI_NOTICE } = await import("@/components/AiConsent");
const { enforceAiQuota } = await import("@/lib/ai-quota.server");
const read = (path: string) => readFileSync(path, "utf8");

beforeEach(() => {
  m.consent = {};
  m.health = "active";
  m.grant.mockReset();
  m.status.mockReset();
});
afterEach(cleanup);

describe("AI consent policy", () => {
  it("counts only consent to the current AI notice", () => {
    expect(hasAiConsent({ aiAt: "2026-10-30T10:00:00Z", aiVersion: AI_CONSENT_VERSION })).toBe(
      true,
    );
    expect(hasAiConsent({ aiAt: "2026-10-30T10:00:00Z", aiVersion: "2025-01-ai-v0" })).toBe(false);
    expect(hasAiConsent({ aiAt: null, aiVersion: AI_CONSENT_VERSION })).toBe(false);
    expect(hasAiConsent(undefined)).toBe(false);
  });
});

describe("server check before any AI request", () => {
  const client = (state: unknown, error: { code: string } | null = null) => {
    const rpc = vi.fn(async () => ({ data: "ok", error: null }));
    const maybeSingle = vi.fn(async () => ({
      data: state === undefined ? null : { state },
      error,
    }));
    const from = vi.fn(() => ({ select: () => ({ maybeSingle }) }));
    return { supabase: { from, rpc } as never, rpc, from };
  };

  it("refuses accounts without AI consent before the quota is used", async () => {
    const c = client({ consent: { healthDataAt: "x", healthVersion: "v" } });
    await expect(enforceAiQuota(c.supabase, "lab")).resolves.toEqual({
      ok: false,
      error: AI_CONSENT_REQUIRED,
    });
    expect(m.status).toHaveBeenCalledWith(403);
    expect(c.rpc).not.toHaveBeenCalled();
    expect(c.from).toHaveBeenCalledWith("user_data");
  });

  it("refuses accounts without saved state and fails closed when the check errors", async () => {
    await expect(enforceAiQuota(client(undefined).supabase, "meal_text")).resolves.toMatchObject({
      ok: false,
    });
    const broken = client(null, { code: "500" });
    await expect(enforceAiQuota(broken.supabase, "meal_voice")).resolves.toMatchObject({
      ok: false,
    });
    expect(m.status).toHaveBeenLastCalledWith(503);
    expect(broken.rpc).not.toHaveBeenCalled();
  });

  it("continues to the consent and quota check with current AI consent", async () => {
    const c = client({ consent: { aiAt: "2026-10-30T10:00:00Z", aiVersion: AI_CONSENT_VERSION } });
    await expect(enforceAiQuota(c.supabase, "meal_photo")).resolves.toBeNull();
    expect(c.rpc).toHaveBeenCalledWith(
      "consume_ai_quota",
      expect.objectContaining({ _kind: "meal_photo" }),
    );
  });
});

function Probe({ onResult }: { onResult: (ok: boolean) => void }) {
  const ai = useAiConsent();
  return (
    <>
      <button onClick={() => void ai.ensure().then(onResult)}>KI starten</button>
      {ai.dialog}
    </>
  );
}

describe("AI consent dialog", () => {
  it("asks first and reports a refusal without recording consent", async () => {
    const result = vi.fn();
    render(<Probe onResult={result} />);
    fireEvent.click(screen.getByText("KI starten"));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("OpenAI");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Google");
    fireEvent.click(screen.getByText("Nicht erlauben"));
    await waitFor(() => expect(result).toHaveBeenCalledWith(false));
    expect(m.grant).not.toHaveBeenCalled();
  });

  it("records consent and continues once the user agrees", async () => {
    m.grant.mockResolvedValue(true);
    const result = vi.fn();
    render(<Probe onResult={result} />);
    fireEvent.click(screen.getByText("KI starten"));
    fireEvent.click(await screen.findByText("Zustimmen und fortfahren"));
    await waitFor(() => expect(result).toHaveBeenCalledWith(true));
    expect(m.grant).toHaveBeenCalledOnce();
  });

  it("stays open with a message when consent cannot be saved", async () => {
    m.grant.mockResolvedValue(false);
    m.health = "withdrawn";
    const result = vi.fn();
    render(<Probe onResult={result} />);
    fireEvent.click(screen.getByText("KI starten"));
    fireEvent.click(await screen.findByText("Zustimmen und fortfahren"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Einwilligung zur Verarbeitung von Gesundheitsdaten",
    );
    expect(result).not.toHaveBeenCalled();
  });

  it("does not ask again once consent is recorded", async () => {
    m.consent = { aiAt: "2026-10-30T10:00:00Z", aiVersion: AI_CONSENT_VERSION };
    const result = vi.fn();
    render(<Probe onResult={result} />);
    await act(async () => {
      fireEvent.click(screen.getByText("KI starten"));
    });
    expect(result).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("AI features wait for consent", () => {
  it("guards every screen that calls an AI server function", () => {
    const nutrition = read("src/routes/ernaehrung.tsx");
    expect(nutrition).toContain("<VoiceMealEntry beforeStart={askAi}");
    expect(nutrition).toContain("if (!ai.granted || photoBusy || n.length < 3");
    expect(nutrition).toContain('if (consent !== "active" || !ai.granted) return;');
    expect(nutrition).toContain("if (!e2 && ai.granted) e2 = await runEstimate(n);");
    expect(nutrition).toContain("if (askAi()) photoInput.current?.click();");
    const lab = read("src/routes/labor.tsx");
    expect(lab).toContain("if (!file || !ai.granted) return;");
    expect(lab.match(/<label onClick=\{askAi\}/g)).toHaveLength(2);
    // Manual entries refresh the plan through the AI only with consent; the value is saved either way.
    expect(lab).toContain(
      'if (!ai.granted) return setMsg({ ok: true, text: "Wert gespeichert." });',
    );
  });
});

const plain = (copy: TermsCopy) =>
  copy.sections
    .flatMap((s) => [
      s.title,
      ...s.blocks.flatMap((b) => [
        b.h,
        b.p,
        ...(b.list ?? []),
        ...(b.items ?? []).flatMap((i) => [i.label, i.text]),
      ]),
    ])
    .filter(Boolean)
    .join(" ");

// Release gates for the public App Store submission. The brand owner replaced both texts in Lovable on
// 30 October 2026; they do not yet name the AI providers the server functions call, describe voice input as
// device speech recognition and keep a provider placeholder in the terms. The wording is the owner's legal
// decision, so these stay skipped until the texts are updated (docs/ios/app-store-submission.md §2).
describe("legal texts", () => {
  it.skip("disclose Apple Health, server-side voice transcription and the AI providers in every language", () => {
    for (const lang of ["de", "en", "es"] as const) {
      const text = plain(privacyCopy[lang]);
      for (const word of ["OpenAI", "Google", "Lovable", "Apple"]) expect(text).toContain(word);
    }
    expect(plain(privacyCopy.de)).not.toContain(
      "Spracherkennung des Browsers oder Betriebssystems",
    );
  });

  it.skip("keep no unfinished placeholders in the terms", () => {
    for (const lang of ["de", "en", "es"] as const) {
      const text = plain(termsCopy[lang]);
      expect(text).not.toMatch(
        /vor Freigabe|zu ergänzen|noch zu bestätigend|before approval|remains to be confirmed|antes de la aprobación|pendiente de confirmación/,
      );
    }
  });

  it("translate the AI notice", () => {
    const c = catalogue as Record<string, string[]>;
    for (const p of [...AI_NOTICE, AI_CONSENT_REQUIRED]) expect(c[p]?.length).toBe(2);
  });
});
