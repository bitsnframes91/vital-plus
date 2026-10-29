import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppleHealthController, useAppleHealth } from "@/components/AppleHealth";
import { setHealthBridgeForTests, type HealthBridge } from "@/lib/apple-health/bridge";
import { accountKeys } from "@/lib/apple-health/device-state";
import type { AppRecords } from "@/lib/apple-health/export-plan";

// Apple Health values are health data: nothing is read without consent, and deleting the account or the
// health data removes this app's device cache, but never samples stored in Apple Health.
function fakeBridge() {
  const files = new Map<string, string>();
  const bridge = {
    isAvailable: vi.fn(async () => ({ available: true })),
    requestAuthorization: vi.fn(async () => ({ requested: true })),
    getWriteStatus: vi.fn(async () => ({ statuses: {} })),
    readDailySummary: vi.fn(async () => ({
      results: [],
      failedTypes: [],
      startDay: "2026-10-23",
      endDay: "2026-10-29",
    })),
    writeSamples: vi.fn(async () => ({ results: [] })),
    deleteSamples: vi.fn(async () => ({ results: [] })),
    loadState: vi.fn(async ({ accountKey }: { accountKey: string }) => ({
      json: files.get(accountKey) ?? null,
    })),
    saveState: vi.fn(async ({ accountKey, json }: { accountKey: string; json: string }) => {
      files.set(accountKey, json);
    }),
    clearState: vi.fn(async ({ accountKey }: { accountKey: string }) => {
      files.delete(accountKey);
    }),
  };
  return { bridge, files, typed: bridge as unknown as HealthBridge };
}
const records: AppRecords = { meals: [], waterLog: {}, weightLog: {} };
let api: ReturnType<typeof useAppleHealth> = null;
function Probe() {
  api = useAppleHealth();
  return null;
}

afterEach(() => {
  cleanup();
  setHealthBridgeForTests(undefined);
  api = null;
});

describe("Apple Health and health-data consent", () => {
  it("without consent nothing is loaded, imported or observed", async () => {
    const { bridge, typed } = fakeBridge();
    setHealthBridgeForTests(typed);
    render(
      <AppleHealthController userId={null} accountId="user-a" onboarded records={records}>
        <Probe />
      </AppleHealthController>,
    );
    await waitFor(() => expect(api?.phase).toBe("ready"));
    expect(bridge.loadState).not.toHaveBeenCalled();
    expect(bridge.readDailySummary).not.toHaveBeenCalled();
    expect(api?.introDue).toBe(false);
  });

  it("forgetDevice deletes the account's cache file, also while processing is paused", async () => {
    const { bridge, files, typed } = fakeBridge();
    const { key } = await accountKeys("user-a");
    files.set(
      key,
      JSON.stringify({ v: 1, intro: "connected", connected: true, exports: {}, ledger: {} }),
    );
    setHealthBridgeForTests(typed);
    render(
      <AppleHealthController userId={null} accountId="user-a" onboarded records={records}>
        <Probe />
      </AppleHealthController>,
    );
    await waitFor(() => expect(api?.phase).toBe("ready"));
    await act(async () => {
      await api!.forgetDevice();
    });
    expect(bridge.clearState).toHaveBeenCalledWith({ accountKey: key });
    expect(files.has(key)).toBe(false);
    expect(bridge.deleteSamples).not.toHaveBeenCalled();
  });

  it("forgetDevice on a connected account clears memory and the file without deleting Apple Health samples", async () => {
    const { bridge, files, typed } = fakeBridge();
    const { key } = await accountKeys("user-b");
    files.set(
      key,
      JSON.stringify({ v: 1, intro: "connected", connected: true, exports: {}, ledger: {} }),
    );
    setHealthBridgeForTests(typed);
    render(
      <AppleHealthController userId="user-b" onboarded records={records}>
        <Probe />
      </AppleHealthController>,
    );
    await waitFor(() => expect(api?.account?.connected).toBe(true));
    await act(async () => {
      await api!.forgetDevice();
    });
    expect(api?.account).toBeNull();
    expect(files.has(key)).toBe(false);
    expect(bridge.deleteSamples).not.toHaveBeenCalled();
  });
});
