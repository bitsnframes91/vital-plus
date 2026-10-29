import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Profile deletion on the iPhone: the server-verified code flow, and only after the server confirms the
// deletion is everything this device kept for the account removed (Apple Health samples stay).
const m = vi.hoisted(() => ({
  requestCode: vi.fn(),
  del: vi.fn(),
  forgetDevice: vi.fn(async () => {}),
  forgetAccount: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  syncPaused: false,
}));
vi.mock("@/lib/account.functions", () => ({
  deleteAccount: m.del,
  requestAccountDeletionCode: m.requestCode,
}));
vi.mock("@tanstack/react-start", async (original) => ({
  ...(await original<typeof import("@tanstack/react-start")>()),
  useServerFn: (fn: unknown) => fn,
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  useLocation: ({ select }: { select: (l: { pathname: string }) => string }) =>
    select({ pathname: "/profil" }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  Outlet: () => null,
}));
vi.mock("@/lib/store", () => ({
  useStore: () => ({
    s: { account: { email: "qa@example.com", userId: "user-a" } },
    forgetAccount: m.forgetAccount,
    syncPaused: m.syncPaused,
  }),
}));
vi.mock("@/components/AppleHealth", () => ({
  useAppleHealth: () => ({ forgetDevice: m.forgetDevice }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: m.signOut } } }));
vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ProfileMascot", () => ({ ProfileMascot: () => null }));

const { Route } = await import("@/routes/profil");
const Profile = Route.options.component!;

function openCodeStep() {
  render(<Profile />);
  fireEvent.click(screen.getByRole("button", { name: "Ja" }));
}
const enter = (code: string) =>
  fireEvent.change(screen.getByLabelText("Bestätigungscode"), { target: { value: code } });
const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Konto endgültig löschen" }));

beforeEach(() => {
  vi.spyOn(Route, "useSearch").mockReturnValue({ action: "delete" } as never);
  for (const f of [m.requestCode, m.del, m.forgetDevice, m.forgetAccount, m.signOut]) f.mockClear();
  m.requestCode.mockResolvedValue({ ok: true });
  m.syncPaused = false;
  localStorage.setItem("vitalplus-feedback-at", "1");
});
afterEach(cleanup);

describe("account deletion in Profile", () => {
  it("requests a code from the server and deletes with it, then clears this device", async () => {
    m.del.mockResolvedValue({ ok: true });
    openCodeStep();
    await waitFor(() => expect(m.requestCode).toHaveBeenCalledOnce());
    enter("12a3456");
    submit();
    await waitFor(() => expect(m.signOut).toHaveBeenCalledWith({ scope: "local" }));
    expect(m.del).toHaveBeenCalledWith({ data: { code: "123456" } });
    expect(m.forgetDevice).toHaveBeenCalledOnce();
    expect(m.forgetAccount).toHaveBeenCalledOnce();
    expect(localStorage.getItem("vitalplus-feedback-at")).toBeNull();
  });

  it("keeps everything on the device when the code is refused", async () => {
    m.del.mockResolvedValue({ ok: false, reason: "invalid" });
    openCodeStep();
    await screen.findByLabelText("Bestätigungscode");
    enter("000000");
    submit();
    expect(await screen.findByText("Der Code ist ungültig oder abgelaufen.")).toBeInTheDocument();
    expect(m.forgetDevice).not.toHaveBeenCalled();
    expect(m.forgetAccount).not.toHaveBeenCalled();
    expect(m.signOut).not.toHaveBeenCalled();
  });

  it("asks for a new code after too many wrong attempts", async () => {
    m.del.mockResolvedValue({ ok: false, reason: "locked" });
    openCodeStep();
    await screen.findByLabelText("Bestätigungscode");
    enter("111111");
    submit();
    expect(await screen.findByText(/Zu viele falsche Versuche/)).toBeInTheDocument();
    expect(m.forgetAccount).not.toHaveBeenCalled();
  });

  it("resumes a verified deletion that failed part-way without a code, then clears the device", async () => {
    m.del
      .mockResolvedValueOnce({ ok: false, reason: "cleanup_failed" })
      .mockResolvedValueOnce({ ok: true });
    openCodeStep();
    await screen.findByLabelText("Bestätigungscode");
    enter("123456");
    submit();
    expect(await screen.findByText(/noch nicht abgeschlossen/)).toBeInTheDocument();
    expect(m.forgetAccount).not.toHaveBeenCalled();
    submit();
    await waitFor(() => expect(m.forgetAccount).toHaveBeenCalledOnce());
    expect(m.del).toHaveBeenLastCalledWith({ data: { code: null } });
    expect(m.forgetDevice).toHaveBeenCalledOnce();
  });

  it("shows the paused-saving notice only while consent is missing", () => {
    vi.spyOn(Route, "useSearch").mockReturnValue({} as never);
    m.syncPaused = true;
    render(<Profile />);
    expect(
      screen.getByText("Deine Gesundheitsdaten werden gerade nicht gespeichert"),
    ).toBeInTheDocument();
    // Held changes live only in this device's cache, which sign-out clears.
    expect(screen.getByText(/Wenn du dich vorher abmeldest/)).toBeInTheDocument();
    cleanup();
    m.syncPaused = false;
    render(<Profile />);
    expect(screen.queryByText("Deine Gesundheitsdaten werden gerade nicht gespeichert")).toBeNull();
  });
});
