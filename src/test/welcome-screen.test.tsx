import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route as HomeRoute } from "@/routes/index";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), signInWithPassword: vi.fn(), account: null as null | { email: string; userId: string } }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => mocks.navigate,
  Link: ({ children, ...props }: { children: React.ReactNode; "aria-label"?: string }) => <a aria-label={props["aria-label"]}>{children}</a>,
}));
vi.mock("@/lib/store", () => ({ useStore: () => ({ s: { account: mocks.account } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithPassword: mocks.signInWithPassword, signOut: vi.fn() } } }));
vi.mock("@/lib/account.functions", () => ({ accountExists: vi.fn(async () => ({ exists: true })) }));

const Home = HomeRoute.options.component!;

describe("Welcome screen", () => {
  beforeEach(() => {
    mocks.navigate.mockReset().mockResolvedValue(undefined); mocks.signInWithPassword.mockReset(); mocks.account = null; sessionStorage.clear();
    // The start page reads an optional ?mode=login; rendered without a router there is none.
    vi.spyOn(HomeRoute, "useSearch").mockReturnValue({} as never);
  });

  it("shows the bundled Vital Plus logo", () => {
    render(<Home />);
    const logo = screen.getByRole("img", { name: "Vital Plus" });
    expect(logo.getAttribute("src")).toMatch(/vital-plus-logo\.webp/);
    expect(logo).toHaveAttribute("width", "1178");
    expect(screen.getByRole("heading", { level: 1, name: "Vital Plus" })).toBeInTheDocument();
  });

  it("starts the questionnaire from the new-user swipe", async () => {
    sessionStorage.setItem("vitalplus-questionnaire-draft", "{}");
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Los geht’s" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/onboarding" }));
    expect(sessionStorage.getItem("vitalplus-questionnaire-draft")).toBeNull();
  });

  it("asks for credentials instead of signing in with empty fields", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Einloggen" }));
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Bitte gib deine E-Mail-Adresse und dein Passwort ein.");
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("lets signed-in users swipe straight to Heute", async () => {
    mocks.account = { email: "person@example.com", userId: "user-a" };
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Weiter zu Heute" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/heute" }));
  });
});
