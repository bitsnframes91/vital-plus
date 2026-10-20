import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppleHealthController,
  AppleHealthSection,
  AUTO_SYNC_STALE_MS,
  CHANGE_DEBOUNCE_MS,
  MIN_CHANGE_SYNC_GAP_MS,
  useAppleHealth,
} from "@/components/AppleHealth";
import { useHealthReadings } from "@/components/AppleHealthReadings";
import {
  READ_TYPES,
  setHealthBridgeForTests,
  type HealthBridge,
  type HealthDataChangedEvent,
  type RawSummary,
  type RequestStatus,
} from "@/lib/apple-health/bridge";
import {
  accountKeys,
  emptyAccountState,
  type AccountHealthState,
} from "@/lib/apple-health/device-state";
import { dayKey } from "@/lib/apple-health/export-plan";
import { METRIC_STATUS_TEXT, metricStates } from "@/lib/apple-health/metrics";
import { StoreProvider } from "@/lib/store";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const TODAY = dayKey(new Date());
const NO_RECORDS = { meals: [], waterLog: {}, weightLog: {} };

function fakeHealth({ status = "unnecessary" as RequestStatus } = {}) {
  const files = new Map<string, string>();
  const state = {
    steps: 8000 as number | null,
    status,
    listener: null as null | ((e: HealthDataChangedEvent) => void),
  };
  let release: (() => void) | null = null;
  const bridge = {
    isAvailable: vi.fn(async () => ({ available: true })),
    requestAuthorization: vi.fn(async () => {
      state.status = "unnecessary";
      return { requested: true };
    }),
    getRequestStatus: vi.fn(async () => ({ status: state.status })),
    getWriteStatus: vi.fn(async () => ({ statuses: {} })),
    readDailySummary: vi.fn(async (): Promise<RawSummary> => {
      if (release === null && hold.on) await new Promise<void>((r) => (release = r));
      return {
        results:
          state.steps == null
            ? []
            : [
                {
                  type: "stepCount",
                  day: TODAY,
                  aggregation: "sum",
                  value: state.steps,
                  unit: "count",
                },
              ],
        failedTypes: [],
        startDay: TODAY,
        endDay: TODAY,
      };
    }),
    writeSamples: vi.fn(async () => ({ results: [] })),
    deleteSamples: vi.fn(async () => ({ results: [] })),
    startObserving: vi.fn(async () => ({ observing: READ_TYPES.length })),
    stopObserving: vi.fn(async () => {}),
    addListener: vi.fn(
      async (_event: "healthDataChanged", listener: (e: HealthDataChangedEvent) => void) => {
        state.listener = listener;
        return {
          remove: vi.fn(async () => {
            if (state.listener === listener) state.listener = null;
          }),
        };
      },
    ),
    loadState: vi.fn(async ({ accountKey }: { accountKey: string }) => ({
      json: files.get(accountKey) ?? null,
    })),
    saveState: vi.fn(async ({ accountKey, json }: { accountKey: string; json: string }) => {
      files.set(accountKey, json);
    }),
    clearState: vi.fn(async () => {}),
  };
  // Holds the next import open until release() so concurrency can be tested.
  const hold = { on: false };
  setHealthBridgeForTests(bridge as unknown as HealthBridge);
  return {
    bridge,
    state,
    files,
    emit: (type = "stepCount") => act(() => state.listener?.({ type })),
    hold: () => {
      hold.on = true;
      release = null;
    },
    release: () => {
      hold.on = false;
      const r = release;
      release = null;
      r?.();
    },
    seed: async (userId: string, patch: Partial<AccountHealthState>) => {
      const { key } = await accountKeys(userId);
      files.set(key, JSON.stringify({ ...emptyAccountState(), intro: "connected", ...patch }));
    },
  };
}

let health: ReturnType<typeof useAppleHealth> = null;
function Probe() {
  health = useAppleHealth();
  return null;
}
function Steps() {
  const { today } = useHealthReadings();
  return <p data-testid="steps">{today?.steps ?? "none"}</p>;
}
function app(userId: string | null, children: React.ReactNode = null) {
  return (
    <StoreProvider>
      <AppleHealthController userId={userId} onboarded records={NO_RECORDS}>
        <Probe />
        {children}
      </AppleHealthController>
    </StoreProvider>
  );
}
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setHealthBridgeForTests(undefined);
  health = null;
});

describe("automatic Apple Health sync", () => {
  it("imports on launch when the cache is stale, without any permission prompt", async () => {
    const h = fakeHealth({ status: "shouldRequest" });
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(60) });
    render(app("user-a"));
    await waitFor(() => expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(1));
    expect(h.bridge.requestAuthorization).not.toHaveBeenCalled();
    await waitFor(() => expect(health?.account?.summary?.days[TODAY]?.steps).toBe(8000));
    expect(h.bridge.startObserving).toHaveBeenCalledWith({ types: READ_TYPES });
    expect(h.bridge.addListener).toHaveBeenCalledWith("healthDataChanged", expect.any(Function));
  });

  it("does not import on launch when the cache is fresh", async () => {
    const h = fakeHealth();
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(1) });
    render(app("user-a"));
    await waitFor(() => expect(health?.account?.connected).toBe(true));
    await settle();
    expect(h.bridge.readDailySummary).not.toHaveBeenCalled();
  });

  it("never imports or observes without a connection", async () => {
    const h = fakeHealth();
    await h.seed("user-a", { connected: false, intro: "skipped" });
    render(app("user-a"));
    await waitFor(() => expect(health?.account).not.toBeNull());
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => health?.refreshIfStale());
    await settle();
    expect(h.bridge.readDailySummary).not.toHaveBeenCalled();
    expect(h.bridge.startObserving).not.toHaveBeenCalled();
  });

  it("imports when returning to the app with stale data, not when hidden or fresh", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const h = fakeHealth();
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(1) });
    render(app("user-a"));
    await waitFor(() => expect(health?.account?.connected).toBe(true));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await settle();
    expect(h.bridge.readDailySummary).not.toHaveBeenCalled();

    vi.setSystemTime(Date.now() + AUTO_SYNC_STALE_MS + 1000);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await settle();
    expect(h.bridge.readDailySummary).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(() => expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(1));
    visibility.mockRestore();
  });

  it("refreshes stale data when Gesundheit, Heute or Trends render readings", async () => {
    const h = fakeHealth();
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(1) });
    const view = render(app("user-a"));
    await waitFor(() => expect(health?.account?.connected).toBe(true));
    view.rerender(app("user-a", <Steps />));
    await settle();
    expect(h.bridge.readDailySummary).not.toHaveBeenCalled();

    cleanup();
    const stale = fakeHealth();
    await stale.seed("user-b", { connected: true, lastSyncAt: minutesAgo(30) });
    render(app("user-b", <Steps />));
    await waitFor(() => expect(screen.getByTestId("steps").textContent).toBe("8000"));
    expect(stale.bridge.readDailySummary).toHaveBeenCalledTimes(1);
  });

  it("coalesces HealthKit change bursts and rate-limits change-triggered imports", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const h = fakeHealth();
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(1) });
    render(app("user-a"));
    await waitFor(() => expect(h.state.listener).not.toBeNull());

    h.state.steps = 9100;
    h.emit("stepCount");
    h.emit("distanceWalkingRunning");
    h.emit("stepCount");
    expect(h.bridge.readDailySummary).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANGE_DEBOUNCE_MS + 100);
    });
    await waitFor(() => expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(health?.account?.summary?.days[TODAY]?.steps).toBe(9100));

    // A new burst right after waits for the minimum gap instead of importing again immediately.
    h.emit("stepCount");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANGE_DEBOUNCE_MS + 100);
    });
    expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_CHANGE_SYNC_GAP_MS);
    });
    await waitFor(() => expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(2));
  });

  it("queues one trailing import for changes during a running import, never two in parallel", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const h = fakeHealth();
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(60) });
    h.hold();
    render(app("user-a"));
    await waitFor(() => expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(1));
    act(() => health?.refreshIfStale());
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    h.emit();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_CHANGE_SYNC_GAP_MS + CHANGE_DEBOUNCE_MS);
    });
    expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(1);
    h.release();
    await waitFor(() => expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(2));
    await settle();
    expect(h.bridge.readDailySummary).toHaveBeenCalledTimes(2);
  });

  it("drops a deleted measurement from the cache on the next import", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const h = fakeHealth();
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(60) });
    render(app("user-a", <Steps />));
    await waitFor(() => expect(screen.getByTestId("steps").textContent).toBe("8000"));
    h.state.steps = null; // the sample was deleted in Apple Health
    h.emit("stepCount");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_CHANGE_SYNC_GAP_MS + CHANGE_DEBOUNCE_MS);
    });
    await waitFor(() => expect(screen.getByTestId("steps").textContent).toBe("none"));
  });

  it("stops observing on account switch and never imports for the next account's missing connection", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const h = fakeHealth();
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(1) });
    await h.seed("user-b", { connected: false, intro: "skipped" });
    const view = render(app("user-a"));
    await waitFor(() => expect(h.state.listener).not.toBeNull());
    view.rerender(app("user-b"));
    await waitFor(() => expect(h.bridge.stopObserving).toHaveBeenCalled());
    await waitFor(() => expect(h.state.listener).toBeNull());
    await waitFor(() => expect(health?.account?.connected).toBe(false));
    h.emit();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_CHANGE_SYNC_GAP_MS + CHANGE_DEBOUNCE_MS);
    });
    expect(h.bridge.readDailySummary).not.toHaveBeenCalled();
  });
});

describe("per-metric permission and availability", () => {
  it("offers 'Zugriff anfragen' only for undecided types and shows the sheet once, on tap", async () => {
    const h = fakeHealth({ status: "shouldRequest" });
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(60) });
    render(app("user-a", <AppleHealthSection />));
    const button = await screen.findByRole("button", { name: "Zugriff anfragen" });
    expect(h.bridge.requestAuthorization).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(h.bridge.requestAuthorization).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Zugriff anfragen" })).not.toBeInTheDocument(),
    );
    act(() => health?.refreshIfStale());
    await act(() => health!.sync());
    expect(h.bridge.requestAuthorization).toHaveBeenCalledTimes(1);
  });

  it("lists every supported metric with a status from the last import", async () => {
    const h = fakeHealth();
    await h.seed("user-a", { connected: true, lastSyncAt: minutesAgo(60) });
    render(app("user-a", <AppleHealthSection />));
    await waitFor(() =>
      expect(document.querySelector('[data-metric="stepCount"]')?.getAttribute("data-status")).toBe(
        "available",
      ),
    );
    const items = document.querySelectorAll("[data-metric]");
    expect(items).toHaveLength(11);
    expect(document.querySelector('[data-metric="heartRate"]')?.getAttribute("data-status")).toBe(
      "noData",
    );
    expect(screen.queryByText(/verweigert|abgelehnt|denied/i)).not.toBeInTheDocument();
  });

  it("derives statuses without inventing permission results", () => {
    expect(metricStates(null).every((m) => m.status === "notSynced")).toBe(true);
    const states = metricStates({
      days: { [TODAY]: { steps: 10, walkingSpeedKmh: 4.5 }, "2000-01-01": { steps: 5 } },
      latestBodyMass: { kg: 70, day: "2000-01-01" },
      startDay: TODAY,
      endDay: TODAY,
      failedTypes: ["sleepAnalysis"],
      unsupportedTypes: ["runningSpeed"],
    });
    const of = (type: string) => states.find((s) => s.type === type)!;
    expect(of("stepCount")).toMatchObject({ status: "available", lastDay: TODAY });
    expect(of("bodyMass")).toMatchObject({ status: "available", lastDay: "2000-01-01" });
    expect(of("runningSpeed").status).toBe("unsupported");
    expect(of("sleepAnalysis").status).toBe("failed");
    expect(of("heartRate").status).toBe("noData");
    expect(states.map((s) => s.type)).toEqual(expect.arrayContaining([...READ_TYPES]));
    expect(Object.values(METRIC_STATUS_TEXT).join(" ")).not.toMatch(
      /verweigert|abgelehnt|nicht erlaubt/i,
    );
  });
});

describe("native change observation", () => {
  const swift = readFileSync(join(__dirname, "../../ios/App/App/VitalHealthPlugin.swift"), "utf8");
  it("uses foreground HKObserverQuery and emits healthDataChanged, without background delivery", () => {
    expect(swift).toContain('CAPPluginMethod(name: "startObserving"');
    expect(swift).toContain('CAPPluginMethod(name: "stopObserving"');
    expect(swift).toContain("HKObserverQuery(sampleType: type, predicate: notOwn)");
    expect(swift).toContain('notifyListeners("healthDataChanged", data: ["type": name])');
    expect(swift).not.toContain("enableBackgroundDelivery");
    const entitlements = readFileSync(
      join(__dirname, "../../ios/App/App/App.entitlements"),
      "utf8",
    );
    expect(entitlements).not.toContain("background-delivery");
  });
});
