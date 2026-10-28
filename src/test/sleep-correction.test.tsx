import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WRITE_TYPES } from "@/lib/apple-health/bridge";
import { healthReadings } from "@/lib/apple-health/readings";
import { emptyAccountState, type AccountHealthState } from "@/lib/apple-health/device-state";
import { StoreProvider, dailyValue, todayDateKey, useStore } from "@/lib/store";

// Manual sleep correction: a value entered today overrides the Apple Health measurement on every
// screen, survives syncs, navigation and restarts, and is never written to Apple Health.
const db = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  saved: null as Record<string, unknown> | null,
  upserts: [] as { user_id: string; state: { body: { sleepHours: number | null } } }[],
  onAuth: null as ((event: string) => void) | null,
}));
const health = vi.hoisted(() => ({ account: null as AccountHealthState | null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: db.user } }),
      onAuthStateChange: (callback: (event: string) => void) => {
        db.onAuth = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: db.saved ? { state: db.saved } : null, error: null }),
        }),
      }),
      upsert: (row: (typeof db.upserts)[number]) => {
        db.upserts.push(row);
        db.saved = row.state;
        return Promise.resolve({ error: null });
      },
    }),
  },
}));
vi.mock("@/components/AppleHealth", () => ({
  AppleHealthSection: () => null,
  useAppleHealth: () => ({ account: health.account }),
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/HealthMascot", () => ({ HealthMascot: () => null }));

const { Route } = await import("@/routes/gesundheit");
const Health = Route.options.component!;
const { TodayWellnessGoals } = await import("@/components/TodayWellnessGoals");

const measured = (sleepMinutes: number): AccountHealthState => {
  const day = todayDateKey();
  return {
    ...emptyAccountState(),
    connected: true,
    summary: {
      days: { [day]: { sleepMinutes, steps: 900 } },
      startDay: day,
      endDay: day,
      failedTypes: [],
    },
  };
};
const sleepInput = () => screen.getByPlaceholderText("Stunden, z. B. 7,5 (empfohlen: 8 h)");
const saveSleep = (value: string) => {
  fireEvent.change(sleepInput(), { target: { value } });
  fireEvent.submit(sleepInput().closest("form")!);
};
const app = () => (
  <StoreProvider>
    <Health />
    <TodayWellnessGoals />
  </StoreProvider>
);

beforeEach(() => {
  localStorage.clear();
  db.user = null;
  db.saved = null;
  db.upserts = [];
  health.account = measured(450);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("sleep readings", () => {
  const day = "2026-10-28";
  const account = {
    ...emptyAccountState(),
    connected: true,
    summary: {
      days: { [day]: { sleepMinutes: 450 } },
      startDay: day,
      endDay: day,
      failedTypes: [],
    },
  };

  it("lets today's manual entry correct the Apple Health measurement and keeps both apart", () => {
    expect(healthReadings(account, day, { steps: null, sleepHours: 6.5 })).toMatchObject({
      sleepHours: 6.5,
      sleepMeasuredHours: 7.5,
      sleepSource: "Manuell korrigiert",
    });
    expect(account.summary.days[day]).toEqual({ sleepMinutes: 450 });
  });

  it("uses the measurement again once the correction is cleared, and labels plain manual entries", () => {
    expect(healthReadings(account, day, { steps: null, sleepHours: null })).toMatchObject({
      sleepHours: 7.5,
      sleepSource: "Apple Health",
    });
    expect(healthReadings(null, day, { steps: null, sleepHours: 6 })).toMatchObject({
      sleepHours: 6,
      sleepMeasuredHours: null,
      sleepSource: "Manuell erfasst",
    });
  });

  it("only treats an entry from today as a correction", () => {
    expect(dailyValue(6.5, "2000-01-01")).toBeNull();
  });
});

describe("correcting last night's sleep", () => {
  it("shows the saved correction immediately on Gesundheit and Heute", async () => {
    render(app());
    expect(await screen.findByText("Erfasst: 7,5 h")).toBeInTheDocument();
    saveSleep("6,5");
    expect(screen.getByText("Erfasst: 6,5 h")).toBeInTheDocument();
    expect(screen.getByTestId("sleep-correction")).toHaveTextContent(
      "Manuell korrigiert · Apple Health: 7,5 h",
    );
    expect(screen.getByText("6,5 / 8 h")).toBeInTheDocument();
    expect(screen.getByText("Schlaf letzte Nacht · Manuell korrigiert")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Schlaf" })).toHaveAttribute(
      "aria-valuenow",
      "81",
    );
  });

  it("is not overwritten when an automatic sync imports a new measurement", async () => {
    const view = render(app());
    await screen.findByText("Erfasst: 7,5 h");
    saveSleep("6,5");
    health.account = measured(480);
    view.rerender(app());
    expect(screen.getByText("Erfasst: 6,5 h")).toBeInTheDocument();
    expect(screen.getByTestId("sleep-correction")).toHaveTextContent("Apple Health: 8 h");
    expect(sleepInput()).toHaveValue("6.5");
  });

  it("stays after leaving the screen and reopening the app", async () => {
    const view = render(app());
    await screen.findByText("Erfasst: 7,5 h");
    saveSleep("6,5");
    view.unmount();
    render(app());
    expect(await screen.findByText("Erfasst: 6,5 h")).toBeInTheDocument();
    expect(screen.getByText("6,5 / 8 h")).toBeInTheDocument();
  });

  it("returns to the Apple Health value when the field is cleared", async () => {
    render(app());
    await screen.findByText("Erfasst: 7,5 h");
    saveSleep("6,5");
    saveSleep("");
    expect(screen.getByText("Erfasst: 7,5 h")).toBeInTheDocument();
    expect(screen.queryByTestId("sleep-correction")).not.toBeInTheDocument();
    expect(screen.getByText("Schlaf letzte Nacht · Apple Health")).toBeInTheDocument();
  });

  it("does not write the correction to Apple Health", () => {
    expect(WRITE_TYPES.some((type) => /sleep/i.test(type))).toBe(false);
    const plugin = readFileSync(
      join(__dirname, "../../ios/App/App/VitalHealthPlugin.swift"),
      "utf8",
    );
    expect(plugin.match(/static let writable: Set<String> = \[[^\]]*\]/)?.[0]).not.toMatch(
      /sleep/i,
    );
  });
});

describe("account copy of the correction", () => {
  let api: ReturnType<typeof useStore> | null = null;
  function Probe() {
    api = useStore();
    return null;
  }
  const signIn = async () => {
    db.user = { id: "user-a", email: "a@example.com" };
    db.saved = { body: { weightKg: null, waistCm: null, sleepHours: null, steps: null } };
    const view = render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
    await waitFor(() => expect(api?.s.account?.userId).toBe("user-a"));
    return view;
  };
  const correct = () =>
    act(() => api!.set({ body: { ...api!.s.body, sleepHours: 6.5, sleepDate: todayDateKey() } }));
  const hide = () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  };
  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  it("is saved as soon as the app is hidden and restored after a restart", async () => {
    const view = await signIn();
    correct();
    expect(db.upserts).toHaveLength(0);
    hide();
    expect(db.upserts).toHaveLength(1);
    expect(db.upserts[0]).toMatchObject({
      user_id: "user-a",
      state: { body: { sleepHours: 6.5 } },
    });
    view.unmount();
    localStorage.clear();
    api = null;
    render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
    await waitFor(() => expect(api?.s.account?.userId).toBe("user-a"));
    expect(dailyValue(api!.s.body.sleepHours, api!.s.body.sleepDate)).toBe(6.5);
    expect(db.upserts).toHaveLength(1);
  });

  it("is sent once, and a pending save is dropped on sign-out", async () => {
    await signIn();
    vi.useFakeTimers();
    correct();
    hide();
    vi.advanceTimersByTime(1000);
    expect(db.upserts).toHaveLength(1);
    correct();
    act(() => db.onAuth?.("SIGNED_OUT"));
    hide();
    vi.advanceTimersByTime(1000);
    expect(db.upserts).toHaveLength(1);
  });
});
