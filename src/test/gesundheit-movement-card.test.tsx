import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DaySummary } from "@/lib/apple-health/summary";
import { StoreProvider } from "@/lib/store";

const readings = vi.hoisted(() => ({ today: undefined as DaySummary | undefined }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: { children: ReactNode; "aria-label"?: string }) => (
    <a aria-label={props["aria-label"]}>{children}</a>
  ),
}));
vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/HealthMascot", () => ({ HealthMascot: () => null }));
vi.mock("@/components/AppleHealth", () => ({ AppleHealthSection: () => null }));
vi.mock("@/components/AppleHealthReadings", () => ({
  useHealthReadings: () => ({
    today: readings.today,
    steps: readings.today?.steps ?? 1234, // manual fallback, must not reach the Bewegung card
    sleepHours: null,
    stepsSource: null,
    sleepSource: null,
    weight: undefined,
    distanceKm: null,
    walkingSpeedKmh: null,
    runningSpeedKmh: null,
    history: [],
  }),
}));

const { Route } = await import("@/routes/gesundheit");
const Health = Route.options.component!;
const card = (name: string) => within(screen.getByRole("heading", { name }).parentElement!);

afterEach(() => {
  cleanup();
  readings.today = undefined;
});

describe("Gesundheit Trends card: Bewegung", () => {
  it("shows today's Apple Health steps, not active energy", () => {
    readings.today = { steps: 8421, activeEnergyKcal: 512, distanceKm: 6.4 };
    render(
      <StoreProvider>
        <Health />
      </StoreProvider>,
    );
    const movement = card("Bewegung");
    expect(movement.getByText("8.421")).toBeInTheDocument();
    expect(movement.getByText("Schritte")).toBeInTheDocument();
    expect(movement.getByText("Apple Health")).toBeInTheDocument();
    expect(movement.queryByText("512")).not.toBeInTheDocument();
    expect(movement.queryByText("kcal/Tag")).not.toBeInTheDocument();
    expect(card("Distanz").getByText("6,4")).toBeInTheDocument();
  });

  it("stays empty without measured steps, even when steps were entered manually", () => {
    readings.today = { activeEnergyKcal: 512 };
    render(
      <StoreProvider>
        <Health />
      </StoreProvider>,
    );
    const movement = card("Bewegung");
    expect(movement.getByText("–/–")).toBeInTheDocument();
    expect(movement.queryByText("1.234")).not.toBeInTheDocument();
    expect(movement.queryByText("Apple Health")).not.toBeInTheDocument();
  });
});

describe("Gesundheit: Schritte heute and heart rate", () => {
  const stepsCard = () => within(screen.getByText("Schritte heute").parentElement!);
  const page = () =>
    render(
      <StoreProvider>
        <Health />
      </StoreProvider>,
    );

  it("shows only Apple Health steps, without manual entry or the BMI note", () => {
    readings.today = { steps: 6543 };
    page();
    const steps = stepsCard();
    expect(steps.getByText("Heute: 6.543 Schritte")).toBeInTheDocument();
    expect(steps.getByText("Apple Health")).toBeInTheDocument();
    expect(steps.queryByText("Manuell erfasst")).not.toBeInTheDocument();
    expect(steps.queryByRole("textbox")).not.toBeInTheDocument();
    expect(steps.queryByRole("button", { name: /Speichern/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/aus deinem BMI/)).not.toBeInTheDocument();
  });

  it("keeps the missing-data placeholder and ignores manual steps", () => {
    readings.today = { activeEnergyKcal: 512 };
    page();
    const steps = stepsCard();
    expect(steps.getByText("Noch keine Schritte für heute.")).toBeInTheDocument();
    expect(steps.queryByText(/1\.234/)).not.toBeInTheDocument();
    expect(steps.queryByText("Apple Health")).not.toBeInTheDocument();
  });

  it("has no standalone heart-rate card", () => {
    readings.today = { steps: 100, heartRate: { avg: 64 } };
    page();
    expect(screen.queryByText("Herzfrequenz (Durchschnitt)")).not.toBeInTheDocument();
    expect(screen.queryByText("Schläge/Min.")).not.toBeInTheDocument();
  });
});
