import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Profil → Meine Daten → "Meine Daten herunterladen": every outcome is reported in German, and a
// file is only announced when one was actually downloaded or shared.
const m = vi.hoisted(() => ({
  account: { email: "qa@example.com", userId: "user-a" } as {
    email: string;
    userId: string;
  } | null,
  consent: "active" as string | null,
  state: {} as Record<string, unknown>,
  load: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/lib/data-export", async (original) => ({
  ...(await original<typeof import("@/lib/data-export")>()),
  loadServerCopy: m.load,
}));
vi.mock("@/lib/file-share", () => ({ saveTextFile: m.save }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/lib/store", () => ({
  useStore: () => ({
    s: { ...m.state, account: m.account },
    set: vi.fn(),
    consent: m.consent,
  }),
}));
vi.mock("@/components/AppleHealth", () => ({ useAppleHealth: () => null }));
vi.mock("@/components/ConsentGate", () => ({ WithdrawConsent: () => null }));
vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const { Route } = await import("@/routes/profil.$section");
const Submenu = Route.options.component!;
const saved = {
  name: "Anna",
  meals: [{ id: "m1", name: "Skyr" }],
  labs: [],
  goals: [],
  body: { weightKg: 70 },
  consent: { analytics: false },
};
const serverCopy = {
  healthData: { updatedAt: "2026-10-29T10:00:00.000Z", state: saved },
  consents: [],
};

const exportNow = () => {
  render(<Submenu />);
  fireEvent.click(screen.getByRole("button", { name: /Meine Daten herunterladen/ }));
};

beforeEach(() => {
  vi.spyOn(Route, "useParams").mockReturnValue({ section: "privacy" } as never);
  vi.spyOn(Route, "useNavigate").mockReturnValue(vi.fn() as never);
  m.account = { email: "qa@example.com", userId: "user-a" };
  m.consent = "active";
  m.state = saved;
  m.load.mockReset().mockResolvedValue(serverCopy);
  m.save.mockReset().mockResolvedValue("shared");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Meine Daten herunterladen", () => {
  it("exports the account's data as readable JSON and confirms only after sharing", async () => {
    exportNow();
    await screen.findByText("Deine Daten wurden exportiert.");
    expect(m.load).toHaveBeenCalledWith("user-a");
    const { filename, content } = m.save.mock.calls[0]![0] as { filename: string; content: string };
    expect(filename).toMatch(/^vitalplus-meine-daten-\d{4}-\d{2}-\d{2}\.json$/);
    const data = JSON.parse(content);
    expect(data.account).toEqual({ email: "qa@example.com", userId: "user-a" });
    expect(data.server.healthData.state.meals).toEqual([{ id: "m1", name: "Skyr" }]);
    expect(data.device.unsavedChanges).toBeNull();
  });

  it("still exports after consent was withdrawn", async () => {
    m.consent = "withdrawn";
    exportNow();
    await screen.findByText("Deine Daten wurden exportiert.");
    expect(
      JSON.parse((m.save.mock.calls[0]![0] as { content: string }).content).server.consentStatus,
    ).toBe("withdrawn");
  });

  it("reports a cancelled share sheet", async () => {
    m.save.mockResolvedValue("cancelled");
    exportNow();
    expect(
      await screen.findByText("Export abgebrochen. Es wurde keine Datei gespeichert oder geteilt."),
    ).toBeTruthy();
  });

  it("reports a started browser download", async () => {
    m.save.mockResolvedValue("downloaded");
    exportNow();
    expect(await screen.findByText(/Der Download deiner Daten wurde gestartet\./)).toBeTruthy();
  });

  it("reports a failed save without claiming success", async () => {
    m.save.mockRejectedValue(new Error("WRITE_FAILED"));
    exportNow();
    expect(await screen.findByText(/Der Export ist fehlgeschlagen\./)).toBeTruthy();
    expect(screen.queryByText("Deine Daten wurden exportiert.")).toBeNull();
  });

  it("creates no file when the account data cannot be loaded", async () => {
    m.load.mockRejectedValue(new Error("offline"));
    exportNow();
    expect(await screen.findByText(/Deine Kontodaten konnten nicht geladen werden\./)).toBeTruthy();
    expect(m.save).not.toHaveBeenCalled();
  });

  it("creates no file for an account without stored data", async () => {
    m.load.mockResolvedValue({ healthData: null, consents: [] });
    m.consent = null;
    m.state = { name: "", meals: [], labs: [], goals: [], body: { weightKg: null }, consent: {} };
    exportNow();
    expect(
      await screen.findByText(
        "Für dein Konto sind noch keine Daten gespeichert. Es wurde keine Datei erstellt.",
      ),
    ).toBeTruthy();
    expect(m.save).not.toHaveBeenCalled();
  });

  it("asks signed-out users to sign in", async () => {
    m.account = null;
    exportNow();
    expect(
      await screen.findByText("Bitte melde dich an, um deine Daten zu exportieren."),
    ).toBeTruthy();
    expect(m.load).not.toHaveBeenCalled();
  });
});
