import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppleHealthController,
  AppleHealthSection,
  useAppleHealth,
} from "@/components/AppleHealth";
import {
  READ_TYPES,
  setHealthBridgeForTests,
  type HealthBridge,
  type RawSummary,
  type RequestStatus,
} from "@/lib/apple-health/bridge";
import { accountKeys, emptyAccountState, parseAccountState } from "@/lib/apple-health/device-state";
import { dayKey } from "@/lib/apple-health/export-plan";
import { healthReadings } from "@/lib/apple-health/readings";
import { normalizeSummary } from "@/lib/apple-health/summary";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const TODAY = dayKey(new Date());
const raw = (results: RawSummary["results"], extra: Partial<RawSummary> = {}): RawSummary => ({
  results,
  failedTypes: [],
  startDay: TODAY,
  endDay: TODAY,
  ...extra,
});

describe("distance and speed in the daily summary", () => {
  it("reads distance in km and average speeds in km/h, converting other units", () => {
    const summary = normalizeSummary(
      raw([
        { type: "distanceWalkingRunning", day: TODAY, aggregation: "sum", value: 6.42, unit: "km" },
        { type: "walkingSpeed", day: TODAY, aggregation: "avg", value: 4.8, unit: "km/h" },
        { type: "runningSpeed", day: TODAY, aggregation: "avg", value: 10.5, unit: "km/h" },
        {
          type: "distanceWalkingRunning",
          day: "2026-01-01",
          aggregation: "sum",
          value: 2500,
          unit: "m",
        },
        { type: "walkingSpeed", day: "2026-01-01", aggregation: "avg", value: 1.25, unit: "m/s" },
      ]),
    );
    expect(summary.days[TODAY]).toEqual({
      distanceKm: 6.42,
      walkingSpeedKmh: 4.8,
      runningSpeedKmh: 10.5,
    });
    expect(summary.days["2026-01-01"]?.distanceKm).toBeCloseTo(2.5);
    expect(summary.days["2026-01-01"]?.walkingSpeedKmh).toBeCloseTo(4.5);
  });

  it("keeps missing measurements missing instead of zero", () => {
    const summary = normalizeSummary(
      raw([{ type: "stepCount", day: TODAY, aggregation: "sum", value: 900, unit: "count" }]),
    );
    expect(summary.days[TODAY]).toEqual({ steps: 900 });
    expect(summary.days[TODAY]).not.toHaveProperty("distanceKm");
    expect(summary.days[TODAY]).not.toHaveProperty("walkingSpeedKmh");
    expect(summary.days[TODAY]).not.toHaveProperty("runningSpeedKmh");
  });

  it("drops implausible values, unknown units and the wrong aggregation", () => {
    const summary = normalizeSummary(
      raw([
        { type: "walkingSpeed", day: TODAY, aggregation: "avg", value: 60, unit: "km/h" },
        { type: "runningSpeed", day: TODAY, aggregation: "avg", value: 9, unit: "knots" },
        { type: "runningSpeed", day: TODAY, aggregation: "sum", value: 9, unit: "km/h" },
        { type: "distanceWalkingRunning", day: TODAY, aggregation: "sum", value: -1, unit: "km" },
      ]),
    );
    expect(summary.days[TODAY] ?? {}).toEqual({});
  });

  it("reports types the iPhone's iOS version cannot provide, and tolerates older native builds", () => {
    expect(
      normalizeSummary(raw([], { unsupportedTypes: ["runningSpeed", "bogus"] })).unsupportedTypes,
    ).toEqual(["runningSpeed"]);
    expect(normalizeSummary(raw([])).unsupportedTypes).toEqual([]);
  });
});

describe("healthReadings distance and speed", () => {
  const connected = (days: Record<string, object>) => ({
    ...emptyAccountState(),
    connected: true,
    summary: { days, startDay: TODAY, endDay: TODAY, failedTypes: [] },
  });
  const manual = { steps: 4000, sleepHours: 7 };

  it("exposes today's measured values", () => {
    const readings = healthReadings(
      connected({ [TODAY]: { distanceKm: 3.2, walkingSpeedKmh: 4.6, runningSpeedKmh: 11 } }),
      TODAY,
      manual,
    );
    expect(readings).toMatchObject({ distanceKm: 3.2, walkingSpeedKmh: 4.6, runningSpeedKmh: 11 });
  });

  it("returns null without measurements or when disconnected, never a manual or zero value", () => {
    expect(healthReadings(connected({ [TODAY]: { steps: 10 } }), TODAY, manual)).toMatchObject({
      distanceKm: null,
      walkingSpeedKmh: null,
      runningSpeedKmh: null,
    });
    const disconnected = { ...connected({ [TODAY]: { distanceKm: 3.2 } }), connected: false };
    expect(healthReadings(disconnected, TODAY, manual).distanceKm).toBeNull();
  });

  it("keeps the speeds in the 7-day history for Trends", () => {
    const readings = healthReadings(
      connected({ [TODAY]: { walkingSpeedKmh: 4.6 }, "2000-01-01": { distanceKm: 1 } }),
      TODAY,
      manual,
    );
    expect(readings.history).toEqual([
      ["2000-01-01", { distanceKm: 1 }],
      [TODAY, { walkingSpeedKmh: 4.6 }],
    ]);
  });
});

describe("new read permissions for accounts connected earlier", () => {
  afterEach(() => {
    cleanup();
    setHealthBridgeForTests(undefined);
  });

  async function connectedAccount(status: RequestStatus | Error | "missing") {
    const files = new Map<string, string>();
    const { key } = await accountKeys("user-a");
    files.set(
      key,
      JSON.stringify({
        ...emptyAccountState(),
        intro: "connected",
        connected: true,
        connectedAt: "2026-10-01T08:00:00.000Z",
      }),
    );
    const bridge = {
      isAvailable: vi.fn(async () => ({ available: true })),
      requestAuthorization: vi.fn(async () => ({ requested: true })),
      getRequestStatus: vi.fn(async () => {
        if (status instanceof Error) throw status;
        return { status: status as RequestStatus };
      }),
      getWriteStatus: vi.fn(async () => ({ statuses: {} })),
      readDailySummary: vi.fn(async () =>
        raw([
          {
            type: "distanceWalkingRunning",
            day: TODAY,
            aggregation: "sum",
            value: 5.1,
            unit: "km",
          },
        ]),
      ),
      writeSamples: vi.fn(async () => ({ results: [] })),
      deleteSamples: vi.fn(async () => ({ results: [] })),
      loadState: vi.fn(async ({ accountKey }: { accountKey: string }) => ({
        json: files.get(accountKey) ?? null,
      })),
      saveState: vi.fn(async ({ accountKey, json }: { accountKey: string; json: string }) => {
        files.set(accountKey, json);
      }),
      clearState: vi.fn(async () => {}),
    };
    if (status === "missing") delete (bridge as Partial<typeof bridge>).getRequestStatus;
    setHealthBridgeForTests(bridge as unknown as HealthBridge);
    function Distance() {
      const distance = healthReadings(useAppleHealth()?.account, TODAY, {
        steps: null,
        sleepHours: null,
      }).distanceKm;
      return <p data-testid="distance">{distance == null ? "Keine Daten" : distance}</p>;
    }
    render(
      <AppleHealthController
        userId="user-a"
        onboarded
        records={{ meals: [], waterLog: {}, weightLog: {} }}
      >
        <AppleHealthSection />
        <Distance />
      </AppleHealthController>,
    );
    // Launch imports automatically (stale cache) without showing the Health sheet.
    await waitFor(() => expect(bridge.readDailySummary).toHaveBeenCalledTimes(1));
    expect(bridge.requestAuthorization).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Jetzt synchronisieren" }));
    await waitFor(() => expect(bridge.readDailySummary).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("distance").textContent).toBe("5.1"));
    return { bridge, files, key };
  }

  it("asks once for undecided types on a user-initiated sync, then imports", async () => {
    const { bridge, files, key } = await connectedAccount("shouldRequest");
    expect(bridge.getRequestStatus).toHaveBeenCalledWith({
      read: READ_TYPES,
      write: ["bodyMass", "dietaryWater", "dietaryEnergyConsumed"],
    });
    expect(bridge.requestAuthorization).toHaveBeenCalledTimes(1);
    expect(bridge.requestAuthorization).toHaveBeenCalledWith({
      read: READ_TYPES,
      write: ["bodyMass", "dietaryWater", "dietaryEnergyConsumed"],
    });
    // The sheet comes before the user-initiated import (the second read).
    expect(bridge.requestAuthorization.mock.invocationCallOrder[0]).toBeLessThan(
      bridge.readDailySummary.mock.invocationCallOrder[1]!,
    );
    expect(parseAccountState(files.get(key) ?? null)).toMatchObject({
      connected: true,
      connectedAt: "2026-10-01T08:00:00.000Z",
    });
  });

  it("does not show the Health sheet when nothing is undecided", async () => {
    const { bridge } = await connectedAccount("unnecessary");
    expect(bridge.requestAuthorization).not.toHaveBeenCalled();
  });

  it.each([
    ["a failing status check", new Error("AUTH_FAILED") as Error | "missing"],
    ["an older native build", "missing" as const],
  ])("keeps the connection and syncs with %s", async (_case, status) => {
    const { bridge, files, key } = await connectedAccount(status);
    expect(bridge.requestAuthorization).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(parseAccountState(files.get(key) ?? null).connected).toBe(true);
  });
});

describe("native distance and speed reads", () => {
  const swift = readFileSync(join(__dirname, "../../ios/App/App/VitalHealthPlugin.swift"), "utf8");

  it("reads the three HealthKit identifiers, runningSpeed only from iOS 16", () => {
    expect(swift).toContain('"distanceWalkingRunning": .distanceWalkingRunning');
    expect(swift).toContain('"walkingSpeed": .walkingSpeed');
    expect(swift).toMatch(
      /if #available\(iOS 16\.0, \*\) \{\s*identifiers\["runningSpeed"\] = \.runningSpeed\s*\}/,
    );
    expect(swift.match(/\.runningSpeed\b/g)).toHaveLength(1);
  });

  it("sums distance in km and averages speed samples in km/h", () => {
    expect(swift).toContain(
      '"distanceWalkingRunning": UnitInfo(unit: .meterUnit(with: .kilo), name: "km")',
    );
    expect(swift).toMatch(
      /"walkingSpeed": UnitInfo\(unit: HKUnit\.meterUnit\(with: \.kilo\)\.unitDivided\(by: \.hour\(\)\), name: "km\/h"\)/,
    );
    expect(swift).toMatch(
      /"runningSpeed": UnitInfo\(unit: HKUnit\.meterUnit\(with: \.kilo\)\.unitDivided\(by: \.hour\(\)\), name: "km\/h"\)/,
    );
    expect(swift).toContain('averaged: Set<String> = ["walkingSpeed", "runningSpeed"]');
    expect(swift).toMatch(
      /Self\.averaged\.contains\(name\):\s*readDaily\(name, options: \.discreteAverage/,
    );
  });

  it("accepts every TypeScript read type and skips ones this iOS version lacks", () => {
    const known = swift.match(/knownReadable: Set<String> = \[([^\]]+)\]/)?.[1] ?? "";
    for (const type of READ_TYPES) expect(known).toContain(`"${type}"`);
    expect(swift).toContain('"unsupportedTypes": unsupported');
    expect(swift).toContain('CAPPluginMethod(name: "getRequestStatus"');
    expect(swift).toContain("store.getRequestStatusForAuthorization(toShare: share, read: read)");
  });
});
