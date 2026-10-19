import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/native-app";

// Contract of ios/App/App/VitalHealthPlugin.swift. Apple Health exists only in the iPhone app;
// on the web and in the hosted app there is no bridge at all.

export const READ_TYPES = [
  "stepCount",
  "heartRate",
  "bodyMass",
  "sleepAnalysis",
  "dietaryEnergyConsumed",
  "activeEnergyBurned",
  "basalEnergyBurned",
  "dietaryWater",
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
