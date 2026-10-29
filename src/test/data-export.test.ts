import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "@/lib/app-settings";
import { emptyAccountState } from "@/lib/apple-health/device-state";

// "Meine Daten herunterladen": the export separates the account's server copy from device-only data,
// contains no credentials and reads only the verified signed-in user's own rows.
const m = vi.hoisted(() => ({
  user: { id: "user-a" } as { id: string } | null,
  authError: null as Error | null,
  row: { data: null as unknown, error: null as Error | null },
  consents: { data: [] as unknown[], error: null as Error | null },
  calls: [] as { table: string; select: string; eq: [string, string] }[],
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: m.user }, error: m.authError }) },
    from: (table: string) => ({
      select: (select: string) => ({
        eq: (column: string, value: string) => {
          m.calls.push({ table, select, eq: [column, value] });
          return { maybeSingle: async () => m.row, order: async () => m.consents };
        },
      }),
    }),
  },
}));

const {
  buildDataExport,
  exportFileName,
  ExportIdentityError,
  isEmptyExport,
  loadServerCopy,
  withoutSensitive,
} = await import("@/lib/data-export");

const account = { email: "qa@example.com", userId: "user-a" };
const state = {
  name: "Anna",
  meals: [{ id: "x", name: "Haferflocken", kcal: 350 }],
  labs: [],
  body: { weightKg: 70 },
  goals: ["Longevity"],
};
const device = (overrides: Record<string, unknown> = {}) => ({
  state: { ...state, account, ...overrides },
  settings: defaultSettings,
  appleHealth: null,
});
const server = (s: unknown = state) => ({
  healthData: { updatedAt: "2026-10-29T10:00:00.000Z", state: s as never },
  consents: [
    {
      policyVersion: "2026-10-v1",
      consentedAt: "2026-10-01T08:00:00.000Z",
      withdrawnAt: null,
      dataChoice: null,
    },
  ],
});
const at = new Date("2026-10-29T12:00:00.000Z");

beforeEach(() => {
  m.user = { id: "user-a" };
  m.authError = null;
  m.row = { data: null, error: null };
  m.consents = { data: [], error: null };
  m.calls = [];
});

describe("buildDataExport", () => {
  it("lists the account's server copy and device-only data separately", () => {
    const data = buildDataExport({
      account,
      server: server(),
      device: device(),
      consentStatus: "active",
      exportedAt: at,
    });
    expect(data).toMatchObject({
      format: "vitalplus-meine-daten",
      formatVersion: 1,
      exportedAt: "2026-10-29T12:00:00.000Z",
      account,
    });
    expect(data.server.healthData?.state).toEqual(state);
    expect(data.server.consents).toHaveLength(1);
    expect(data.server.consentStatus).toBe("active");
    // Same content in a different key order is not reported as unsaved.
    expect(data.device.unsavedChanges).toBeNull();
    expect(data.device.appSettings).toEqual(defaultSettings);
    expect(data.device.appleHealth).toBeNull();
    expect(isEmptyExport(data)).toBe(false);
  });

  it("adds device changes the account does not have, e.g. after consent was withdrawn", () => {
    const data = buildDataExport({
      account,
      server: server(),
      device: device({ body: { weightKg: 68 } }),
      consentStatus: "withdrawn",
      exportedAt: at,
    });
    expect(data.server.healthData?.state).toMatchObject({ body: { weightKg: 70 } });
    expect(data.device.unsavedChanges?.state).toMatchObject({ body: { weightKg: 68 } });
    expect(data.device.unsavedChanges?.state).not.toHaveProperty("account");
  });

  it("includes the device-only Apple Health summary but not the internal write ledger", () => {
    const health = {
      ...emptyAccountState(),
      connected: true,
      connectedAt: "2026-10-20T08:00:00.000Z",
      summary: {
        days: { "2026-10-28": { steps: 8000 } },
        startDay: "2026-10-22",
        endDay: "2026-10-28",
        failedTypes: [],
      },
      ledger: {
        r1: {
          type: "bodyMass" as const,
          value: 70,
          version: 1,
          startMs: 0,
          endMs: 0,
          day: "2026-10-28",
        },
      },
    };
    const data = buildDataExport({
      account,
      server: server(),
      device: { ...device(), appleHealth: health },
      consentStatus: "active",
      exportedAt: at,
    });
    expect(data.device.appleHealth).toMatchObject({
      connected: true,
      importedDays: { "2026-10-28": { steps: 8000 } },
    });
    expect(JSON.stringify(data)).not.toContain("ledger");
  });

  it("never contains credentials", () => {
    const leaky = {
      ...state,
      access_token: "a",
      refresh_token: "b",
      nested: { password: "c", apiKey: "d", keep: 1 },
    };
    const data = buildDataExport({
      account,
      server: server(leaky),
      device: device(leaky),
      consentStatus: "active",
      exportedAt: at,
    });
    const text = JSON.stringify(data);
    for (const secret of ["access_token", "refresh_token", '"password"', "apiKey"])
      expect(text).not.toContain(secret);
    expect(text).toContain('"keep":1');
    expect(withoutSensitive({ n: Number.NaN, u: undefined })).toEqual({ n: null });
  });

  it("is empty for an account without stored data and without own device entries", () => {
    const fresh = {
      name: "",
      meals: [],
      labs: [],
      goals: ["Longevity", "Mehr Energie"],
      body: { weightKg: null },
      weightLog: {},
      waterLog: {},
      fullDays: {},
      aiPlan: null,
    };
    const data = buildDataExport({
      account,
      server: { healthData: null, consents: [] },
      device: { state: fresh, settings: defaultSettings, appleHealth: emptyAccountState() },
      consentStatus: null,
      exportedAt: at,
    });
    expect(isEmptyExport(data)).toBe(true);
    const own = buildDataExport({
      account,
      server: { healthData: null, consents: [] },
      device: {
        state: { ...fresh, meals: [{ id: "m" }] },
        settings: defaultSettings,
        appleHealth: null,
      },
      consentStatus: null,
      exportedAt: at,
    });
    expect(isEmptyExport(own)).toBe(false);
    expect(own.device.unsavedChanges).not.toBeNull();
  });

  it("names the file after the local date", () => {
    expect(exportFileName(new Date(2026, 0, 5))).toBe("vitalplus-meine-daten-2026-01-05.json");
  });
});

describe("loadServerCopy", () => {
  it("reads only the signed-in user's own rows, without needing active consent", async () => {
    m.row = { data: { state, updated_at: "2026-10-29T10:00:00.000Z" }, error: null };
    m.consents = {
      data: [
        {
          policy_version: "2026-10-v1",
          consented_at: "2026-10-01T08:00:00.000Z",
          withdrawn_at: "2026-10-20T08:00:00.000Z",
          data_choice: "keep",
        },
      ],
      error: null,
    };
    const copy = await loadServerCopy("user-a");
    expect(copy.healthData).toEqual({ updatedAt: "2026-10-29T10:00:00.000Z", state });
    expect(copy.consents).toEqual([
      {
        policyVersion: "2026-10-v1",
        consentedAt: "2026-10-01T08:00:00.000Z",
        withdrawnAt: "2026-10-20T08:00:00.000Z",
        dataChoice: "keep",
      },
    ]);
    expect(m.calls).toEqual([
      { table: "user_data", select: "state, updated_at", eq: ["user_id", "user-a"] },
      {
        table: "health_consents",
        select: "policy_version, consented_at, withdrawn_at, data_choice",
        eq: ["user_id", "user-a"],
      },
    ]);
  });

  it("refuses when the verified session belongs to someone else or nobody", async () => {
    m.user = { id: "user-b" };
    await expect(loadServerCopy("user-a")).rejects.toBeInstanceOf(ExportIdentityError);
    m.user = null;
    await expect(loadServerCopy("user-a")).rejects.toBeInstanceOf(ExportIdentityError);
    expect(m.calls).toEqual([]);
  });

  it("fails instead of exporting a partial copy when a read fails", async () => {
    m.row = { data: null, error: new Error("offline") };
    await expect(loadServerCopy("user-a")).rejects.toThrow("offline");
    m.row = { data: null, error: null };
    m.consents = { data: [], error: new Error("offline") };
    await expect(loadServerCopy("user-a")).rejects.toThrow("offline");
  });
});
