import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AppleHealthController } from '@/components/AppleHealth';
import { TodayWellnessGoals } from '@/components/TodayWellnessGoals';
import { setHealthBridgeForTests, type HealthBridge } from '@/lib/apple-health/bridge';
import { emptyAccountState } from '@/lib/apple-health/device-state';
import { todayDateKey } from '@/lib/store';
import type { ReactNode } from 'react';

const state = vi.hoisted(() => ({ set: vi.fn(), s: { body: { steps: 2000, stepsDate: '', sleepHours: 6, sleepDate: '', weightKg: null, heightCm: null }, meals: [], waterLog: {}, weightLog: {} } }));
vi.mock('@/lib/store', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/store')>(), useStore: () => state }));
vi.mock('@tanstack/react-router', async importOriginal => ({ ...await importOriginal<typeof import('@tanstack/react-router')>(), Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => <a href={to} {...props}>{children}</a> }));
afterEach(() => { cleanup(); setHealthBridgeForTests(undefined); });

it('the Heute screen reads synchronized steps and sleep without saving them into the account store', async () => {
 const day = todayDateKey();
 state.s.body.stepsDate = day;
 state.s.body.sleepDate = day;
 const summary = { days: { [day]: { steps: 830, sleepMinutes: 450 } }, startDay: day, endDay: day, failedTypes: [] };
 const bridge: HealthBridge = {
  isAvailable: async () => ({ available: true }),
  loadState: async () => ({ json: JSON.stringify({ ...emptyAccountState(), connected: true, summary }) }),
  requestAuthorization: async () => ({ requested: true }), getWriteStatus: async () => ({ statuses: {} }),
  readDailySummary: async () => ({ results: [], failedTypes: [], startDay: day, endDay: day }),
  saveState: async () => {}, clearState: async () => {}, writeSamples: async () => ({ results: [] }), deleteSamples: async () => ({ results: [] }),
 };
 setHealthBridgeForTests(bridge);
 render(<AppleHealthController userId="user-a" onboarded records={{ meals: [], waterLog: {}, weightLog: {} }}><TodayWellnessGoals /></AppleHealthController>);
 await waitFor(() => expect(screen.getByRole('progressbar', { name: 'Schritte noch zu gehen' })).toHaveAttribute('aria-valuenow', '8'));
 expect(screen.getByRole('progressbar', { name: 'Schlaf' })).toHaveAttribute('aria-valuenow', '94');
 expect(screen.getByText('9.170 Schritte')).toBeInTheDocument();
 expect(screen.getByText('7,5 / 8 h')).toBeInTheDocument();
 expect(state.set).not.toHaveBeenCalled();
 expect(state.s.body.steps).toBe(2000);
 expect(state.s.body.sleepHours).toBe(6);
});
