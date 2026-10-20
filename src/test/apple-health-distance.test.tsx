import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppleHealthController, useAppleHealth, type AppleHealthContextValue } from '@/components/AppleHealth';
import { READ_TYPES, setHealthBridgeForTests, type HealthBridge } from '@/lib/apple-health/bridge';
import { emptyAccountState, EXPORT_TYPES } from '@/lib/apple-health/device-state';
import { healthReadings } from '@/lib/apple-health/readings';
import { normalizeSummary } from '@/lib/apple-health/summary';
import { importSummary } from '@/lib/apple-health/sync';

const day = '2026-10-20';
const raw = { startDay: '2026-10-14', endDay: day, failedTypes: [], results: [
  { type: 'distanceWalkingRunning', day, aggregation: 'sum', value: 2345, unit: 'm' },
  { type: 'walkingSpeed', day, aggregation: 'avg', value: 1.25, unit: 'm/s' },
  { type: 'runningSpeed', day, aggregation: 'avg', value: 10.5, unit: 'km/h' },
] };
afterEach(() => { cleanup(); setHealthBridgeForTests(undefined); });

describe('verified distance and speed contract', () => {
  it('maps measured daily distance into km', () => {
    expect(normalizeSummary(raw).days[day]?.distanceKm).toBe(2.345);
  });
  it('maps average walking speed into km/h, not pace', () => {
    expect(normalizeSummary(raw).days[day]?.walkingSpeedKmh).toBe(4.5);
  });
  it('maps average running speed into km/h', () => {
    expect(normalizeSummary(raw).days[day]?.runningSpeedKmh).toBe(10.5);
  });
  it('never substitutes manual values for missing distance and speed', () => {
    const result = healthReadings({ ...emptyAccountState(), connected: true, summary: normalizeSummary({ ...raw, results: [] }) }, day, { steps: 10000, sleepHours: 8 });
    expect([result.distanceKm, result.walkingSpeedKmh, result.runningSpeedKmh]).toEqual([null, null, null]);
  });
  it('retains measured zero and exposes actual historical fields', () => {
    const summary = normalizeSummary({ ...raw, results: [...raw.results, { type: 'distanceWalkingRunning', day: '2026-10-19', aggregation: 'sum', value: 0, unit: 'km' }] });
    const result = healthReadings({ ...emptyAccountState(), connected: true, summary }, day, { steps: null, sleepHours: null });
    expect(result.distanceKm).toBe(2.345);
    expect(result.history[0]?.[1].distanceKm).toBe(0);
    expect(result.history[1]?.[1].runningSpeedKmh).toBe(10.5);
  });
  it('keeps unsupported running speed absent on older iOS', () => {
    const summary = normalizeSummary({ ...raw, results: raw.results.slice(0, 2), unsupportedTypes: ['runningSpeed'] });
    expect(summary.unsupportedTypes).toEqual(['runningSpeed']);
    expect(summary.days[day]?.runningSpeedKmh).toBeUndefined();
  });
  it('rejects summed speed rather than inventing an average', () => {
    const summary = normalizeSummary({ ...raw, results: [{ type: 'walkingSpeed', day, value: 1.25, unit: 'm/s', aggregation: 'sum' }] });
    expect(summary.days[day]?.walkingSpeedKmh).toBeUndefined();
  });
  it('imports seven days and requests all verified new types', async () => {
    const readDailySummary = vi.fn(async () => raw);
    await importSummary({ readDailySummary } as unknown as HealthBridge);
    expect(readDailySummary).toHaveBeenCalledWith({ days: 7, types: READ_TYPES });
    expect(READ_TYPES).toEqual(expect.arrayContaining(['distanceWalkingRunning', 'walkingSpeed', 'runningSpeed']));
  });
});

it.each(['shouldRequest', 'unnecessary', 'failure'] as const)('checks additional permissions before sync: %s', async status => {
  let value: AppleHealthContextValue | null = null;
  const order: string[] = [];
  const requestAuthorization = vi.fn(async () => { order.push('authorize'); return { requested: true }; });
  const getRequestStatus = vi.fn(async () => { order.push('status'); if (status === 'failure') throw new Error('older native plugin'); return { status }; });
  const saveState = vi.fn(async () => {});
  const bridge: HealthBridge = {
    isAvailable: async () => ({ available: true }),
    loadState: async () => ({ json: JSON.stringify({ ...emptyAccountState(), connected: true }) }),
    requestAuthorization, getRequestStatus,
    getWriteStatus: async () => ({ statuses: {} }),
    readDailySummary: async () => { order.push('read'); return raw; },
    saveState, clearState: async () => {}, writeSamples: async () => ({ results: [] }), deleteSamples: async () => ({ results: [] }),
  };
  setHealthBridgeForTests(bridge);
  function Probe() { value = useAppleHealth(); return null; }
  render(<AppleHealthController userId="distance-test" onboarded records={{ meals: [], waterLog: {}, weightLog: {} }}><Probe /></AppleHealthController>);
  await waitFor(() => expect(value?.account?.connected).toBe(true));
  expect(getRequestStatus).not.toHaveBeenCalled();
  const loaded = value as AppleHealthContextValue | null;
  if (!loaded) throw new Error('provider missing');
  await act(() => loaded.sync());
  expect(getRequestStatus).toHaveBeenCalledWith({ read: READ_TYPES, write: EXPORT_TYPES });
  expect(order).toEqual(status === 'shouldRequest' ? ['status', 'authorize', 'read'] : ['status', 'read']);
  expect(requestAuthorization).toHaveBeenCalledTimes(status === 'shouldRequest' ? 1 : 0);
  expect(saveState).toHaveBeenCalledWith(expect.objectContaining({ json: expect.stringContaining('distanceKm') }));
});