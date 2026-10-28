import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppleHealthController, useAppleHealth, type AppleHealthContextValue } from '@/components/AppleHealth';
import { healthReadings } from '@/lib/apple-health/readings';
import { emptyAccountState } from '@/lib/apple-health/device-state';
import { setHealthBridgeForTests, type HealthBridge } from '@/lib/apple-health/bridge';
import { completion } from '@/lib/wellness-progress';

const day = '2026-10-20';
const account = { ...emptyAccountState(), connected: true, intro: 'connected' as const, summary: { days: { [day]: { steps: 830, sleepMinutes: 450, activeEnergyKcal: 34, heartRate: { avg: 68 } }, '2026-10-19': { steps: 1200 } }, startDay: '2026-10-19', endDay: day, failedTypes: [] } };
afterEach(() => { cleanup(); setHealthBridgeForTests(undefined); });

describe('device-local screen readings', () => {
  it('uses measured steps and sleep without modifying manual entries', () => {
    // No sleep entered today: the measurement is shown (a manual entry would correct it).
    const manual = { steps: 2000, sleepHours: null };
    const result = healthReadings(account, day, manual);
    expect(result.steps).toBe(830);
    expect(result.sleepHours).toBe(7.5);
    expect(completion(result.steps, 10000)).toBe(8.3);
    expect(10000 - (result.steps ?? 0)).toBe(9170);
    expect(completion(result.sleepHours, 8)).toBe(93.75);
    expect(manual).toEqual({ steps: 2000, sleepHours: null });
  });
  it('falls back independently for missing measurements, not to zero', () => {
    const missingSleep = { ...account, summary: { ...account.summary, days: { [day]: { steps: 830 } } } };
    expect(healthReadings(missingSleep, day, { steps: null, sleepHours: 6 }).sleepHours).toBe(6);
    expect(healthReadings(missingSleep, day, { steps: null, sleepHours: null }).sleepHours).toBeNull();
  });
  it('retains a measured zero rather than using the manual fallback', () => {
    const zero = { ...account, summary: { ...account.summary, days: { [day]: { steps: 0 } } } };
    expect(healthReadings(zero, day, { steps: 2000, sleepHours: null }).steps).toBe(0);
  });
  it('does not use stale daily readings after midnight', () => {
    expect(healthReadings(account, '2026-10-21', { steps: null, sleepHours: null }).steps).toBeNull();
  });
  it('returns only actual daily history and separates the latest weight', () => {
    const result = healthReadings(account, day, { steps: null, sleepHours: null });
    expect(result.history.map(([date]) => date)).toEqual(['2026-10-19', day]);
    expect(result.today?.activeEnergyKcal).toBe(34);
    expect(result.today?.heartRate?.avg).toBe(68);
    expect(result.weight).toBeUndefined();
  });
  it('disconnection drops measured history and uses manual values', () => {
    const result = healthReadings({ ...account, connected: false }, day, { steps: 100, sleepHours: 5 });
    expect(result.steps).toBe(100);
    expect(result.history).toEqual([]);
  });
  it('syncs through the existing provider and saves only to the native account file', async () => {
    let value: AppleHealthContextValue | null = null;
    const saveState = vi.fn(async () => {});
    const bridge: HealthBridge = {
      isAvailable: async () => ({ available: true }),
      requestAuthorization: async () => ({ requested: true }),
      getWriteStatus: async () => ({ statuses: {} }),
      readDailySummary: async () => ({ startDay: day, endDay: day, failedTypes: [], results: [{ type: 'stepCount', day, aggregation: 'sum', value: 830, unit: 'count' }, { type: 'sleepAnalysis', day, aggregation: 'sum', value: 450, unit: 'min' }] }),
      loadState: async () => ({ json: JSON.stringify(account) }), saveState,
      clearState: async () => {}, writeSamples: async () => ({ results: [] }), deleteSamples: async () => ({ results: [] }),
    };
    setHealthBridgeForTests(bridge);
    function Probe() { value = useAppleHealth(); return null; }
    const view = render(<AppleHealthController userId="user-a" onboarded records={{ meals: [], waterLog: {}, weightLog: {} }}><Probe /></AppleHealthController>);
    await waitFor(() => expect(value?.account?.connected).toBe(true));
    const loaded = value as AppleHealthContextValue | null;
    if (!loaded) throw new Error('provider missing');
    await act(() => loaded.sync());
    const synced = value as AppleHealthContextValue | null;
    expect(healthReadings(synced?.account, day, { steps: null, sleepHours: null }).sleepHours).toBe(7.5);
    expect(saveState).toHaveBeenCalledWith(expect.objectContaining({ accountKey: expect.stringMatching(/^[a-f0-9]{64}$/), json: expect.stringContaining('830') }));
    view.rerender(<AppleHealthController userId={null} onboarded records={{ meals: [], waterLog: {}, weightLog: {} }}><Probe /></AppleHealthController>);
    await waitFor(() => expect(value?.account).toBeNull());
  });
});
