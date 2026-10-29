import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Health-data consent (Art. 9 GDPR) is the last questionnaire step: it starts unticked, the
// questionnaire cannot finish without it, and the time of consent is stored.
const store = vi.hoisted(() => ({
  set: vi.fn(),
  grantConsent: vi.fn(async () => true),
  s: {
    name: "",
    goals: [] as string[],
    diet: "",
    account: null as null | { email: string; userId: string },
    consent: { practitioner: false, analytics: false },
    body: {},
    onboarded: false,
  },
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/store", async (original) => ({
  ...(await original<typeof import("@/lib/store")>()),
  useStore: () => store,
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const { Route } = await import("@/routes/onboarding");
const { readQuestionnaire } = await import("@/lib/questionnaire-draft");
const Onboarding = Route.options.component!;
const weiter = () => screen.getByRole("button", { name: "Weiter" });
// The last step finishes the questionnaire: "Konto anlegen" before sign-up, "Los geht's" when signed in.
const finish = () => screen.getByRole("button", { name: /^(Konto anlegen|Los geht's)$/ });

// Fills every step before the consent step.
function fillQuestionnaire() {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Anna" } });
  fireEvent.click(weiter());
  const goals = screen
    .getAllByRole("button")
    .filter((b) => !["Weiter", "Zurück"].includes(b.textContent ?? ""));
  fireEvent.click(goals[0]!);
  fireEvent.click(weiter());
  fireEvent.click(weiter()); // diet is optional
  fireEvent.change(screen.getByLabelText(/Gewicht/), { target: { value: "70" } });
  fireEvent.change(screen.getByLabelText(/Größe/), { target: { value: "172" } });
  fireEvent.click(weiter());
  fireEvent.change(screen.getByLabelText("Alter (Jahre)"), { target: { value: "35" } });
  for (const name of ["Geschlecht", "Aktivität"]) {
    const select = screen.getByLabelText(name) as HTMLSelectElement;
    fireEvent.change(select, {
      target: { value: [...select.options].find((o) => o.value)!.value },
    });
  }
  fireEvent.click(weiter());
}

beforeEach(() => {
  vi.spyOn(Route, "useSearch").mockReturnValue({} as never);
  store.set.mockClear();
  store.grantConsent.mockClear();
  navigate.mockClear();
  store.s.account = null;
  sessionStorage.clear();
});
afterEach(cleanup);

describe("health data consent in the questionnaire", () => {
  it("starts unticked and blocks finishing until it is given", () => {
    render(<Onboarding />);
    fillQuestionnaire();
    const consent = screen.getByRole("checkbox");
    expect(screen.getByText(/Ich willige ausdrücklich ein/)).toBeInTheDocument();
    expect(consent).not.toBeChecked();
    expect(finish()).toBeDisabled();
    fireEvent.click(finish());
    expect(navigate).not.toHaveBeenCalled();
    expect(readQuestionnaire()).toBeNull();
    // Privacy Policy and Terms are linked from the consent.
    const links = within(consent.closest("div")!.parentElement!).getAllByRole("button");
    expect(links.map((b) => b.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Datenschutz/),
        expect.stringMatching(/AGB|Nutzungsbedingungen/),
      ]),
    );
  });

  it("stores the time of consent with the questionnaire before sign-up", () => {
    render(<Onboarding />);
    fillQuestionnaire();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(finish()).toBeEnabled();
    fireEvent.click(finish());
    expect(navigate).toHaveBeenCalledWith({ to: "/login", search: { mode: "register" } });
    expect(Date.parse(readQuestionnaire()!.healthConsentAt!)).not.toBeNaN();
  });

  it("records the consent on the server for the signed-in account", () => {
    store.s.account = { email: "anna@example.com", userId: "user-a" };
    render(<Onboarding />);
    fillQuestionnaire();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(finish());
    const saved = store.set.mock.calls.at(-1)![0] as { onboarded: boolean; consent?: unknown };
    expect(saved.onboarded).toBe(true);
    // The consent date is stored by grantConsent, only after the server recorded the consent.
    expect(saved.consent).toBeUndefined();
    expect(store.grantConsent).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({ to: "/heute" });
  });
});
