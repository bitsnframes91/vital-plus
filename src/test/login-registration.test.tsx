import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route as LoginRoute } from "@/routes/login";

const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), navigate: vi.fn() }));
vi.mock("@tanstack/react-router", async (original) => ({ ...(await original<typeof import("@tanstack/react-router")>()), useNavigate: () => auth.navigate }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: auth.signUp,
      signInWithPassword: auth.signInWithPassword,
      getUser: async () => ({ data: { user: null } }),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock("@/lib/account.functions", () => ({ accountExists: vi.fn(async () => ({ exists: true })), requestPasswordReset: vi.fn() }));

// The real /login route component under a bare root, so search validation and the form are exercised.
async function renderLogin(path: string) {
  const root = createRootRoute({ staticData: { sitemap: false }, component: Outlet });
  const login = createRoute({ getParentRoute: () => root, path: "/login", staticData: { sitemap: false }, validateSearch: LoginRoute.options.validateSearch, component: LoginRoute.options.component! });
  const router = createRouter({ routeTree: root.addChildren([login]), history: createMemoryHistory({ initialEntries: [path] }) });
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: /Konto anlegen|Anmelden/ });
}
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 10)); });

describe("Registration form", () => {
  beforeEach(() => {
    sessionStorage.clear();
    auth.signUp.mockReset().mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    auth.signInWithPassword.mockReset();
    auth.navigate.mockReset();
  });

  it("shows Vital Plus branding and a swipe-to-register control", async () => {
    await renderLogin("/login?mode=register");
    expect(screen.getByText("Vital Plus Konto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Konto anlegen" })).toHaveAttribute("type", "submit");
    expect(screen.getByText("Nach rechts wischen")).toBeInTheDocument();
  });

  it("does not create an account from an incomplete form", async () => {
    await renderLogin("/login?mode=register");
    fireEvent.click(screen.getByRole("button", { name: "Konto anlegen" }));
    await settle();
    fireEvent.change(screen.getByPlaceholderText("E-Mail"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Konto anlegen" }));
    await settle();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates the account once and asks for email confirmation", async () => {
    await renderLogin("/login?mode=register");
    fireEvent.change(screen.getByPlaceholderText("E-Mail"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Passwort"), { target: { value: "sicheres-passwort" } });
    const button = screen.getByRole("button", { name: "Konto anlegen" });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByText("Bestätige deine E-Mail");
    expect(auth.signUp).toHaveBeenCalledTimes(1);
    expect(auth.signUp.mock.calls[0]![0]).toMatchObject({ email: "person@example.com", password: "sicheres-passwort", options: { emailRedirectTo: `${window.location.origin}/heute` } });
  });

  it("keeps sign-in navigation to Heute", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-01" } }, error: null });
    await renderLogin("/login");
    fireEvent.change(screen.getByPlaceholderText("E-Mail"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Passwort"), { target: { value: "geheim" } });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    await waitFor(() => expect(auth.navigate).toHaveBeenCalledWith({ to: "/heute" }));
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
  });
});
