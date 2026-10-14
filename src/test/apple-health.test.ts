import { afterEach, describe, expect, it, vi } from "vitest";
import {
  healthBridge,
  setHealthBridgeForTests,
  type HealthBridge,
  type RawSummary,
} from "@/lib/apple-health/bridge";
import { normalizeSummary, toCanonical } from "@/lib/apple-health/summary";
import {
  ACTIVE_ENERGY_EXPORT_ENABLED,
  applyResults,
  planExports,
  type AppRecords,
} from "@/lib/apple-health/export-plan";
import {
  accountKeys,
  disconnectedState,
  emptyAccountState,
  noExports,
  parseAccountState,
} from "@/lib/apple-health/device-state";
import { importSummary, SyncCancelled } from "@/lib/apple-health/sync";

afterEach(() => setHealthBridgeForTests(undefined));

const NOW = new Date(2026, 9, 14, 18, 30); // 14 Oct 2026, local time
const TODAY = "2026-10-14";
const all = { bodyMass: true, dietaryWater: true, dietaryEnergyConsumed: true };
const authorized = {
  bodyMass: "authorized",
  dietaryWater: "authorized",
  dietaryEnergyConsumed: "authorized",
} as const;
const records = (over: Partial<AppRecords> = {}): AppRecords => ({
  meals: [],
  waterLog: {},
  weightLog: {},
  ...over,
});

describe("unsupported devices", () => {
  it("has no bridge outside the iPhone app", () => {
    expect(healthBridge()).toBeNull();
  });
});

describe("unit conversion", () => {
  it("converts to canonical units", () => {
    expect(toCanonical("activeEnergyBurned", 4184, "kJ")).toBeCloseTo(1000);
    expect(toCanonical("dietaryEnergyConsumed", 500, "kcal")).toBe(500);
    expect(toCanonical("dietaryWater", 1.5, "L")).toBe(1500);
    expect(toCanonical("dietaryWater", 8, "fl_oz_us")).toBeCloseTo(236.6, 1);
    expect(toCanonical("bodyMass", 176, "lb")).toBeCloseTo(79.83, 2);
    expect(toCanonical("bodyMass", 80000, "g")).toBe(80);
    expect(toCanonical("heartRate", 1.2, "count/s")).toBeCloseTo(72);
    expect(toCanonical("sleepAnalysis", 7.5, "h")).toBe(450);
  });
  it("drops unknown units and implausible values instead of guessing", () => {
    expect(toCanonical("bodyMass", 80, "stone")).toBeNull();
    expect(toCanonical("heartRate", 400, "count/min")).toBeNull();
    expect(toCanonical("stepCount", -5, "count")).toBeNull();
    expect(toCanonical("stepCount", Number.NaN, "count")).toBeNull();
    expect(toCanonical("bodyMass", 5, "kg")).toBeNull();
  });
});

describe("imported summaries", () => {
  const raw = (results: RawSummary["results"], extra: Partial<RawSummary> = {}): RawSummary => ({
    results,
    failedTypes: [],
    startDay: "2026-10-08",
    endDay: TODAY,
    ...extra,
  });

  it("keeps missing samples missing, never zero", () => {
    const summary = normalizeSummary(
      raw([{ type: "stepCount", day: TODAY, aggregation: "sum", value: 4200, unit: "count" }]),
    );
    expect(summary.days[TODAY]).toEqual({ steps: 4200 });
    expect(summary.days[TODAY]?.activeEnergyKcal).toBeUndefined();
    expect(summary.days["2026-10-13"]).toBeUndefined();
    expect(summary.latestBodyMass).toBeUndefined();
    expect(normalizeSummary(raw([])).days).toEqual({});
  });

  it("separates active, basal and dietary energy", () => {
    const summary = normalizeSummary(
      raw([
        { type: "activeEnergyBurned", day: TODAY, aggregation: "sum", value: 420, unit: "kcal" },
        { type: "basalEnergyBurned", day: TODAY, aggregation: "sum", value: 1600, unit: "kcal" },
        { type: "dietaryEnergyConsumed", day: TODAY, aggregation: "sum", value: 8368, unit: "kJ" },
      ]),
    );
    expect(summary.days[TODAY]).toEqual({
      activeEnergyKcal: 420,
      basalEnergyKcal: 1600,
      dietaryEnergyKcal: 2000,
    });
  });

  it("reads heart-rate statistics, sleep and the newest body mass", () => {
    const summary = normalizeSummary(
      raw([
        { type: "heartRate", day: TODAY, aggregation: "avg", value: 68, unit: "count/min" },
        { type: "heartRate", day: TODAY, aggregation: "max", value: 141, unit: "count/min" },
        { type: "sleepAnalysis", day: TODAY, aggregation: "sum", value: 432, unit: "min" },
        { type: "bodyMass", day: "2026-10-10", aggregation: "latest", value: 81, unit: "kg" },
        { type: "bodyMass", day: "2026-10-12", aggregation: "latest", value: 80.4, unit: "kg" },
        { type: "dietaryWater", day: TODAY, aggregation: "sum", value: 1250, unit: "mL" },
      ]),
    );
    expect(summary.days[TODAY]).toEqual({
      heartRate: { avg: 68, max: 141 },
      sleepMinutes: 432,
      waterMl: 1250,
    });
    expect(summary.latestBodyMass).toEqual({ kg: 80.4, day: "2026-10-12" });
  });

  it("ignores malformed rows and reports failed types", () => {
    const summary = normalizeSummary(
      raw(
        [
          { type: "stepCount", day: "yesterday", aggregation: "sum", value: 10, unit: "count" },
          { type: "bloodGlucose", day: TODAY, aggregation: "sum", value: 5, unit: "mmol/L" },
          { type: "stepCount", day: TODAY, aggregation: "sum", value: 10, unit: "furlong" },
        ],
        { failedTypes: ["sleepAnalysis", "somethingElse"] },
      ),
    );
    expect(summary.days).toEqual({});
    expect(summary.failedTypes).toEqual(["sleepAnalysis"]);
  });
});

describe("export planning", () => {
  const meal = (id: string, date: string, kcal: number, time = "12:30") => ({
    id,
    date,
    kcal,
    time,
  });

  it("exports nothing until a type is switched on", () => {
    const plan = planExports({
      records: records({ waterLog: { [TODAY]: 1 } }),
      settings: noExports(),
      since: TODAY,
      ledger: {},
      statuses: authorized,
      now: NOW,
    });
    expect(plan).toEqual({ writes: [], deletes: [], blocked: [] });
  });

  it("writes only app entries from the opt-in day and the last 7 days, in HealthKit units", () => {
    const plan = planExports({
      records: records({
        meals: [meal("a1", TODAY, 512.34), meal("old", "2026-10-11", 300), meal("zero", TODAY, 0)],
        waterLog: { [TODAY]: 1.25, "2026-10-12": 2 },
        weightLog: { [TODAY]: 80.44, "2026-10-01": 82 },
      }),
      settings: all,
      since: "2026-10-12",
      ledger: {},
      statuses: authorized,
      now: NOW,
    });
    const byId = Object.fromEntries(plan.writes.map((w) => [w.recordId, w]));
    expect(Object.keys(byId).sort()).toEqual([
      "meal.a1",
      "water.2026-10-12",
      "water.2026-10-14",
      "weight.2026-10-14",
    ]);
    expect(byId["meal.a1"]).toMatchObject({
      type: "dietaryEnergyConsumed",
      value: 512.3,
      unit: "kcal",
      startMs: new Date(2026, 9, 14, 12, 30).getTime(),
    });
    expect(byId["water.2026-10-14"]).toMatchObject({
      type: "dietaryWater",
      value: 1250,
      unit: "mL",
      startMs: new Date(2026, 9, 14).getTime(),
      endMs: NOW.getTime(),
    });
    expect(byId["weight.2026-10-14"]).toMatchObject({ type: "bodyMass", value: 80.4, unit: "kg" });
  });

  it("never writes active or basal energy", () => {
    expect(ACTIVE_ENERGY_EXPORT_ENABLED).toBe(false);
    const plan = planExports({
      records: records({ meals: [meal("a", TODAY, 600)] }),
      settings: all,
      since: TODAY,
      ledger: {},
      statuses: { ...authorized, activeEnergyBurned: "authorized" },
      now: NOW,
    });
    expect(plan.writes.map((w) => w.type)).toEqual(["dietaryEnergyConsumed"]);
  });

  it("prevents duplicate writes and replaces changed values with a higher version", () => {
    const input = {
      records: records({ waterLog: { [TODAY]: 1 } }),
      settings: all,
      since: TODAY,
      statuses: authorized,
      now: NOW,
    };
    const first = planExports({ ...input, ledger: {} });
    const ledger = applyResults(
      {},
      first.writes,
      first.writes.map((w) => ({ recordId: w.recordId, status: "saved" as const })),
      [],
      [],
      NOW,
    );
    expect(planExports({ ...input, ledger }).writes).toEqual([]);
    const changed = planExports({
      ...input,
      records: records({ waterLog: { [TODAY]: 1.5 } }),
      ledger,
    });
    expect(changed.writes).toHaveLength(1);
    expect(changed.writes[0]!.value).toBe(1500);
    expect(changed.writes[0]!.version).toBeGreaterThan(first.writes[0]!.version - 1);
    expect(changed.writes[0]!.recordId).toBe(first.writes[0]!.recordId);
  });

  it("treats a native duplicate as already written and keeps failed writes for retry", () => {
    const plan = planExports({
      records: records({ waterLog: { [TODAY]: 1 }, weightLog: { [TODAY]: 80 } }),
      settings: all,
      since: TODAY,
      ledger: {},
      statuses: authorized,
      now: NOW,
    });
    const ledger = applyResults(
      {},
      plan.writes,
      [
        { recordId: "water.2026-10-14", status: "duplicate" },
        { recordId: "weight.2026-10-14", status: "failed" },
      ],
      [],
      [],
      NOW,
    );
    expect(Object.keys(ledger)).toEqual(["water.2026-10-14"]);
  });

  it("handles partial write authorization", () => {
    const plan = planExports({
      records: records({ meals: [meal("a", TODAY, 600)], waterLog: { [TODAY]: 1 } }),
      settings: all,
      since: TODAY,
      ledger: {},
      statuses: { dietaryEnergyConsumed: "authorized", dietaryWater: "denied" },
      now: NOW,
    });
    expect(plan.writes.map((w) => w.type)).toEqual(["dietaryEnergyConsumed"]);
    expect(plan.blocked.sort()).toEqual(["bodyMass", "dietaryWater"]);
  });

  it("deletes only its own record when a meal is removed, never weights or disabled types", () => {
    const ledger = {
      "meal.gone": {
        type: "dietaryEnergyConsumed" as const,
        value: 400,
        version: 1,
        startMs: 1,
        endMs: 1,
        day: TODAY,
      },
      "weight.2026-10-13": {
        type: "bodyMass" as const,
        value: 80,
        version: 1,
        startMs: 1,
        endMs: 1,
        day: "2026-10-13",
      },
      "water.2026-10-13": {
        type: "dietaryWater" as const,
        value: 1000,
        version: 1,
        startMs: 1,
        endMs: 1,
        day: "2026-10-13",
      },
    };
    const plan = planExports({
      records: records(),
      settings: { ...all, dietaryWater: false },
      since: "2026-10-10",
      ledger,
      statuses: authorized,
      now: NOW,
    });
    expect(plan.deletes).toEqual([{ recordId: "meal.gone", type: "dietaryEnergyConsumed" }]);
    const next = applyResults(
      ledger,
      [],
      [],
      plan.deletes,
      [{ recordId: "meal.gone", status: "deleted" }],
      NOW,
    );
    expect(next["meal.gone"]).toBeUndefined();
    expect(next["weight.2026-10-13"]).toBeDefined();
  });
});

describe("import sync", () => {
  const ok: RawSummary = {
    results: [{ type: "stepCount", day: TODAY, aggregation: "sum", value: 900, unit: "count" }],
    failedTypes: [],
    startDay: "2026-10-08",
    endDay: TODAY,
  };
  const bridgeWith = (readDailySummary: HealthBridge["readDailySummary"]) =>
    ({ readDailySummary }) as unknown as HealthBridge;
  const instant = () => Promise.resolve();

  it("requests a bounded window", async () => {
    const read = vi.fn().mockResolvedValue(ok);
    await importSummary(bridgeWith(read), { wait: instant });
    expect(read).toHaveBeenCalledWith(expect.objectContaining({ days: 7 }));
  });

  it("retries transient failures", async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error("busy"))
      .mockRejectedValueOnce(new Error("busy"))
      .mockResolvedValue(ok);
    const summary = await importSummary(bridgeWith(read), { wait: instant });
    expect(read).toHaveBeenCalledTimes(3);
    expect(summary.days[TODAY]?.steps).toBe(900);
  });

  it("does not retry when HealthKit is unavailable", async () => {
    const read = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { code: "UNAVAILABLE" }));
    await expect(importSummary(bridgeWith(read), { wait: instant })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("discards results after cancellation", async () => {
    let resolve!: (value: RawSummary) => void;
    const read = vi.fn(
      () =>
        new Promise<RawSummary>((r) => {
          resolve = r;
        }),
    );
    const controller = new AbortController();
    const pending = importSummary(bridgeWith(read), { signal: controller.signal, wait: instant });
    controller.abort();
    resolve(ok);
    await expect(pending).rejects.toBeInstanceOf(SyncCancelled);
  });
});

describe("device-only account state", () => {
  it("derives a separate, non-reversible key per account", async () => {
    const a = await accountKeys("user-a");
    const b = await accountKeys("user-b");
    expect(a.key).toMatch(/^[a-f0-9]{64}$/);
    expect(a.tag).toBe(a.key.slice(0, 16));
    expect(a.key).not.toBe(b.key);
    expect(a.key).not.toContain("user-a");
    expect((await accountKeys("user-a")).key).toBe(a.key);
  });

  it("falls back to an empty state for unreadable files", () => {
    expect(parseAccountState(null)).toEqual(emptyAccountState());
    expect(parseAccountState("{not json")).toEqual(emptyAccountState());
    expect(parseAccountState(JSON.stringify({ v: 99, connected: true }))).toEqual(
      emptyAccountState(),
    );
  });

  it("disconnect clears imported data, export settings and the ledger but remembers the intro", () => {
    const state = {
      ...emptyAccountState(),
      intro: "connected" as const,
      connected: true,
      lastSyncAt: "x",
      exportSince: TODAY,
      exports: all,
      summary: { days: { [TODAY]: { steps: 1 } }, startDay: TODAY, endDay: TODAY, failedTypes: [] },
      ledger: {
        "water.2026-10-14": {
          type: "dietaryWater" as const,
          value: 1,
          version: 1,
          startMs: 1,
          endMs: 1,
          day: TODAY,
        },
      },
    };
    expect(disconnectedState(state)).toEqual({ ...emptyAccountState(), intro: "connected" });
    expect(disconnectedState(emptyAccountState()).intro).toBe("skipped");
  });
});
