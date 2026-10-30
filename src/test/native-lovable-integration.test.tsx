import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// iOS side of the Lovable release (six-digit email codes, dark theme): codes are verified inside the
// app, emailed links point to the hosted app instead of capacitor://localhost, and the status bar
// follows the theme.
const auth = vi.hoisted(() => ({
  verifyOtp: vi.fn(async (_: unknown) => ({ error: null as Error | null })),
  resend: vi.fn(async (_: unknown) => ({ error: null as Error | null })),
  signInWithOtp: vi.fn(async (_: unknown) => ({ error: null as Error | null })),
}));
const navigate = vi.hoisted(() => vi.fn());
const statusBar = vi.hoisted(() => ({ setStyle: vi.fn(async (_: unknown) => {}) }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("@/lib/native-app", () => ({
  isNativeApp: true,
  NATIVE_WEB_ORIGIN: "https://fairvitalgo.lovable.app",
  publicAppUrl: (path: string) => `https://fairvitalgo.lovable.app${path}`,
}));
vi.mock("@capacitor/status-bar", () => ({
  StatusBar: statusBar,
  Style: { Dark: "DARK", Light: "LIGHT" },
}));

const { MagicCodeEntry, RESEND_SECONDS } = await import("@/components/MagicCodeEntry");
const { syncStatusBar } = await import("@/mobile/native-shell");
const read = (path: string) => readFileSync(join(__dirname, "../..", path), "utf8");

beforeEach(() => {
  for (const fn of [auth.verifyOtp, auth.resend, auth.signInWithOtp, navigate, statusBar.setStyle])
    fn.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("six-digit email codes in the iOS app", () => {
  it("verifies a login code inside the app and opens Heute", async () => {
    render(<MagicCodeEntry email=" person@example.com " />);
    fireEvent.change(screen.getByLabelText("Dein Anmeldecode:"), { target: { value: "123 456" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Code bestätigen" })));
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "person@example.com",
      token: "123456",
      type: "email",
    });
    expect(navigate).toHaveBeenCalledWith({ to: "/heute" });
  });

  it("verifies signup confirmation codes as signup and rejects short codes without a request", async () => {
    render(<MagicCodeEntry email="new@example.com" type="signup" />);
    const input = screen.getByLabelText("Dein Anmeldecode:");
    fireEvent.change(input, { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Code bestätigen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Code ungültig oder abgelaufen.");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "654321" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Code bestätigen" })));
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "new@example.com",
      token: "654321",
      type: "signup",
    });
  });

  it("shows an error and stays on the screen when the code is wrong or expired", async () => {
    auth.verifyOtp.mockResolvedValueOnce({ error: new Error("expired") });
    render(<MagicCodeEntry email="person@example.com" />);
    fireEvent.change(screen.getByLabelText("Dein Anmeldecode:"), { target: { value: "111111" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Code bestätigen" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Code ungültig oder abgelaufen.");
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ["email", () => auth.signInWithOtp],
    ["signup", () => auth.resend],
  ] as const)(
    "resends a %s code with a link to the hosted app, not capacitor://localhost",
    async (type, call) => {
      vi.useFakeTimers();
      render(<MagicCodeEntry email="person@example.com" type={type} />);
      await act(async () => {
        vi.advanceTimersByTime(RESEND_SECONDS * 1000);
      });
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: "Code erneut senden" })),
      );
      expect(call()).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: "https://fairvitalgo.lovable.app/heute",
          }),
        }),
      );
    },
  );

  it("builds every emailed auth link with publicAppUrl", () => {
    for (const file of [
      "src/routes/index.tsx",
      "src/routes/login.tsx",
      "src/components/MagicCodeEntry.tsx",
      "src/components/PasswordResetForm.tsx",
    ]) {
      const source = read(file);
      expect(source, file).not.toMatch(/window\.location\.origin/);
      expect(source, file).toContain("publicAppUrl(");
    }
  });
});

describe("status bar and theme", () => {
  it("uses dark text on the light theme and light text on the dark theme", async () => {
    const root = document.createElement("html");
    syncStatusBar(root);
    expect(statusBar.setStyle).toHaveBeenLastCalledWith({ style: "LIGHT" });
    root.classList.add("dark");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(statusBar.setStyle).toHaveBeenLastCalledWith({ style: "DARK" });
    root.classList.add("other");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(statusBar.setStyle).toHaveBeenCalledTimes(2);
    root.classList.remove("dark");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(statusBar.setStyle).toHaveBeenLastCalledWith({ style: "LIGHT" });
  });
});

describe("health data consent in onboarding", () => {
  it("starts unticked and is required before the questionnaire can finish", () => {
    const onboarding = read("src/routes/onboarding.tsx");
    expect(onboarding).toContain("const [ok, setOk] = useState(false);");
    expect(onboarding).toMatch(/valid: ok,/);
    expect(onboarding).toContain("disabled={!cur.valid}");
    expect(onboarding).toContain("healthConsentAt: new Date().toISOString()");
  });
});
