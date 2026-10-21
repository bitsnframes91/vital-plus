import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isNativeApp } from "@/lib/native-app";

// Contract of ios/App/App/VitalHealthPlugin.swift. Apple Health exists only in the iPhone app;
// on the web and in the hosted app there is no bridge at all.

// One-way data flow. READ: measurements imported from Apple Health (read authorization, sync,
// observers). WRITE: entries made in Vital Plus (weight, water, dietary energy), exported only when
// the user turns an export on. Read and write permissions are independent in HealthKit.
export const READ_TYPES = [
  "stepCount",
  "heartRate",
  "sleepAnalysis",
  "activeEnergyBurned",
  "basalEnergyBurned",
  "distanceWalkingRunning",
  "walkingSpeed",
  // iOS 16+. On iOS 15 the plugin skips it and lists it in RawSummary.unsupportedTypes.
  "runningSpeed",
] as const;
export type ReadType = (typeof READ_TYPES)[number];

export const WRITE_TYPES = [
  "bodyMass",
  "dietaryWater",
  "dietaryEnergyConsumed",
  "activeEnergyBurned",
] as const;
export type WriteType = (typeof WRITE_TYPES)[number];
export type WriteStatus = "authorized" | "denied" | "notDetermined";
/** HKAuthorizationRequestStatus: "shouldRequest" means the Health sheet has types to ask about. */
export type RequestStatus = "shouldRequest" | "unnecessary" | "unknown";

export type RawSummaryRow = {
  type: string;
  day: string;
  aggregation: string;
  value: number;
  unit: string;
};
export type RawSummary = {
  results: RawSummaryRow[];
  failedTypes: string[];
  /** Requested types this iOS version does not support (absent from older native builds). */
  unsupportedTypes?: string[];
  startDay: string;
  endDay: string;
};
export type WriteSample = {
  recordId: string;
  type: WriteType;
  value: number;
  unit: string;
  startMs: number;
  endMs: number;
  version: number;
};
export type WriteResult = {
  recordId: string;
  status: "saved" | "duplicate" | "unauthorized" | "invalid" | "failed";
};
export type DeleteItem = { recordId: string; type: WriteType };
/** Emitted while the app is active when HealthKit reports new, changed or deleted samples. */
export type HealthDataChangedEvent = { type: string };
export type DeleteResult = {
  recordId: string;
  status: "deleted" | "notFound" | "unauthorized" | "invalid" | "failed";
};

export interface HealthBridge {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(options: {
    read: readonly ReadType[];
    write: readonly WriteType[];
  }): Promise<{ requested: boolean }>;
  /** Optional so test doubles and older native builds without it still satisfy the contract. */
  getRequestStatus?(options: {
    read: readonly ReadType[];
    write: readonly WriteType[];
  }): Promise<{ status: RequestStatus }>;
  getWriteStatus(options: {
    types: readonly WriteType[];
  }): Promise<{ statuses: Partial<Record<WriteType, WriteStatus>> }>;
  readDailySummary(options: { days: number; types?: readonly ReadType[] }): Promise<RawSummary>;
  writeSamples(options: {
    accountTag: string;
    samples: WriteSample[];
  }): Promise<{ results: WriteResult[] }>;
  deleteSamples(options: {
    accountTag: string;
    items: DeleteItem[];
  }): Promise<{ results: DeleteResult[] }>;
  /** Foreground HKObserverQuery per type (no background delivery). Optional for test doubles. */
  startObserving?(options: { types: readonly ReadType[] }): Promise<{ observing: number }>;
  stopObserving?(): Promise<void>;
  addListener?(
    eventName: "healthDataChanged",
    listener: (event: HealthDataChangedEvent) => void,
  ): Promise<PluginListenerHandle>;
  loadState(options: { accountKey: string }): Promise<{ json: string | null }>;
  saveState(options: { accountKey: string; json: string }): Promise<void>;
  clearState(options: { accountKey: string }): Promise<void>;
}

let override: HealthBridge | null | undefined;
let native: HealthBridge | undefined;

/** The native bridge, or null where Apple Health cannot exist (web, hosted app). */
export function healthBridge(): HealthBridge | null {
  if (override !== undefined) return override;
  if (!isNativeApp) return null;
  return (native ??= registerPlugin<HealthBridge>("VitalHealth"));
}

export function setHealthBridgeForTests(bridge: HealthBridge | null | undefined): void {
  override = bridge;
}

/** Plugin rejections carry a code; UNAVAILABLE and INVALID are permanent, the rest may be retried. */
export function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}
