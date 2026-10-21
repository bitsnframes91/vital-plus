import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppleHealthController,
  AppleHealthSection,
  useAppleHealth,
} from "@/components/AppleHealth";
import {
  READ_TYPES,
  WRITE_TYPES,
  setHealthBridgeForTests,
  type HealthBridge,
  type WriteSample,
} from "@/lib/apple-health/bridge";
import { accountKeys, emptyAccountState, EXPORT_TYPES } from "@/lib/apple-health/device-state";
import { dayKey, type AppRecords } from "@/lib/apple-health/export-plan";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const TODAY = dayKey(new Date());
const OUTGOING = ["bodyMass", "dietaryWater", "dietaryEnergyConsumed"] as const;
const INCOMING = [
  "stepCount",
  "sleepAnalysis",
  "heartRate",
  "distanceWalkingRunning",
  "walkingSpeed",
  "runningSpeed",
  "activeEnergyBurned",
  "basalEnergyBurned",
];

function fakeBridge() {
  const files = new Map<string, string>();
  const written: WriteSample[] = [];
  const bridge = {
    isAvailable: vi.fn(async () => ({ available: true })),
    requestAuthorization: vi.fn(async () => ({ requested: true })),
    getRequestStatus: vi.fn(async () => ({ status: "unnecessary" as const })),
    getWriteStatus: vi.fn(async ({ types }: { types: readonly string[] }) => ({
      statuses: Object.fromEntries(types.map((t) => [t, "authorized"])),
    })),
    readDailySummary: vi.fn(async () => ({
      results: [{ type: "stepCount", day: TODAY, aggregation: "sum", value: 4321, unit: "count" }],
      failedTypes: [],
      startDay: TODAY,
      endDay: TODAY,
    })),
    writeSamples: vi.fn(async ({ samples }: { samples: WriteSample[] }) => {
      written.push(...samples);
      return { results: samples.map((s) => ({ recordId: s.recordId, status: "saved" as const })) };
    }),
    deleteSamples: vi.fn(async () => ({ results: [] })),
    startObserving: vi.fn(async () => ({ observing: READ_TYPES.length })),
    stopObserving: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({ remove: vi.fn(async () => {}) })),
    loadState: vi.fn(async ({ accountKey }: { accountKey: string }) => ({
      json: files.get(accountKey) ?? null,
    })),
    saveState: vi.fn(async ({ accountKey, json }: { accountKey: string; json: string }) => {
      files.set(accountKey, json);
    }),
    clearState: vi.fn(async () => {}),
  };
  setHealthBridgeForTests(bridge as unknown as HealthBridge);
  return { bridge, files, written };
}

let health: ReturnType<typeof useAppleHealth> = null;
function Probe() {
  health = useAppleHealth();
  return null;
}
const records: AppRecords = {
  meals: [{ id: "m1", kcal: 640, date: TODAY, time: "12:30" }],
  waterLog: { [TODAY]: 1.5 },
  weightLog: { [TODAY]: 78.4 },
};
const app = (userId = "user-a") => (
  <AppleHealthController userId={userId} onboarded records={records}>
    <Probe />
    <AppleHealthSection />
  </AppleHealthController>
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setHealthBridgeForTests(undefined);
  health = null;
});

describe("one-way Apple Health data flow", () => {
  it("reads only incoming measurements and writes only Vital Plus entries", () => {
    expect([...READ_TYPES].sort()).toEqual([...INCOMING].sort());
    for (const type of OUTGOING) {
      expect(READ_TYPES as readonly string[]).not.toContain(type);
      expect(WRITE_TYPES as readonly string[]).toContain(type);
      expect(EXPORT_TYPES as readonly string[]).toContain(type);
    }
  });

  it("requests read access for incoming types and write access only for the export types", async () => {
    const { bridge } = fakeBridge();
    render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Apple Health verbinden" }));
    await waitFor(() => expect(bridge.readDailySummary).toHaveBeenCalled());
    expect(bridge.requestAuthorization).toHaveBeenCalledWith({
      read: READ_TYPES,
      write: EXPORT_TYPES,
    });
    expect(bridge.readDailySummary).toHaveBeenCalledWith(
      expect.objectContaining({ types: READ_TYPES }),
    );
    await waitFor(() => expect(bridge.startObserving).toHaveBeenCalledWith({ types: READ_TYPES }));
    for (const call of bridge.getRequestStatus.mock.calls as unknown as [
      { read: readonly string[] },
    ][])
      for (const type of OUTGOING) expect(call[0].read).not.toContain(type);
  });

  it("lists only incoming measurements under Datenarten and keeps the export switches", async () => {
    fakeBridge();
    render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Apple Health verbinden" }));
    await waitFor(() =>
      expect(document.querySelectorAll("[data-metric]")).toHaveLength(INCOMING.length),
    );
    for (const type of OUTGOING)
      expect(document.querySelector(`[data-metric="${type}"]`)).toBeNull();
    expect(screen.getByText("In Apple Health speichern")).toBeInTheDocument();
  });

  it("never exports until the user turns an export on, then writes the entry once", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { bridge, written } = fakeBridge();
    render(app());
    fireEvent.click(await screen.findByRole("button", { name: "Apple Health verbinden" }));
    await waitFor(() => expect(health?.account?.lastSyncAt).not.toBeNull());
    // Past the 1.5 s export debounce without real waiting (keeps the suite fast and stable).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(health?.account?.exports).toEqual({
      bodyMass: false,
      dietaryWater: false,
      dietaryEnergyConsumed: false,
    });
    expect(bridge.writeSamples).not.toHaveBeenCalled();

    await act(() => health!.setExport("bodyMass", true));
    await waitFor(() => expect(written.filter((s) => s.type === "bodyMass")).toHaveLength(1));
    expect(written.every((s) => s.type === "bodyMass")).toBe(true);
    expect(written[0]).toMatchObject({ type: "bodyMass", value: 78.4, unit: "kg" });

    // A later sync does not write the unchanged weight again (ledger/duplicate protection).
    await act(() => health!.sync());
    // Past the 1.5 s export debounce without real waiting (keeps the suite fast and stable).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(written.filter((s) => s.type === "bodyMass")).toHaveLength(1);
  });

  it("keeps the automatic launch import for an existing connection", async () => {
    const { bridge, files } = fakeBridge();
    const { key } = await accountKeys("user-b");
    files.set(key, JSON.stringify({ ...emptyAccountState(), intro: "connected", connected: true }));
    render(app("user-b"));
    await waitFor(() => expect(bridge.readDailySummary).toHaveBeenCalledTimes(1));
    expect(bridge.requestAuthorization).not.toHaveBeenCalled();
  });
});
