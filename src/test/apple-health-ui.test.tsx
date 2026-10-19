import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  AppleHealthController,
  AppleHealthIntro,
  AppleHealthProvider,
  AppleHealthSection,
} from "@/components/AppleHealth";
import {
  setHealthBridgeForTests,
  type HealthBridge,
  type RawSummary,
  type WriteSample,
} from "@/lib/apple-health/bridge";
import { accountKeys, parseAccountState } from "@/lib/apple-health/device-state";
import { dayKey, type AppRecords } from "@/lib/apple-health/export-plan";
import { StoreProvider, useStore } from "@/lib/store";

const supa = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  saved: null as Record<string, unknown> | null,
  upsert: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: supa.user } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: supa.saved ? { state: supa.saved } : null }),
        }),
      }),
      upsert: supa.upsert,
    }),
  },
}));

const TODAY = dayKey(new Date());
const summary = (steps: number): RawSummary => ({
  results: [{ type: "stepCount", day: TODAY, aggregation: "sum", value: steps, unit: "count" }],
  failedTypes: [],
  startDay: TODAY,
  endDay: TODAY,
});

function fakeBridge(steps = 11111) {
  const files = new Map<string, string>();
  const written: WriteSample[] = [];
  const bridge = {
    isAvailable: vi.fn(async () => ({ available: true })),
    requestAuthorization: vi.fn(async () => ({ requested: true })),
    getWriteStatus: vi.fn(async ({ types }: { types: readonly string[] }) => ({
      statuses: Object.fromEntries(types.map((t) => [t, "authorized"])),
    })),
    readDailySummary: vi.fn(async () => summary(steps)),
    writeSamples: vi.fn(async ({ samples }: { samples: WriteSample[] }) => {
      written.push(...samples);
      return { results: samples.map((s) => ({ recordId: s.recordId, status: "saved" as const })) };
    }),
    deleteSamples: vi.fn(async ({ items }: { items: { recordId: string }[] }) => ({
      results: items.map((i) => ({ recordId: i.recordId, status: "deleted" as const })),
    })),
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
  return { bridge, files, written, typed: bridge as unknown as HealthBridge };
}

const noRecords: AppRecords = { meals: [], waterLog: {}, weightLog: {} };
function ui(
  userId: string | null,
  { onboarded = true, records = noRecords }: { onboarded?: boolean; records?: AppRecords } = {},
): ReactNode {
  return (
    <AppleHealthController userId={userId} onboarded={onboarded} records={records}>
      <AppleHealthIntro />
      <AppleHealthSection />
    </AppleHealthController>
  );
}
const stateOf = async (files: Map<string, string>, userId: string) =>
  parseAccountState(files.get((await accountKeys(userId)).key) ?? null);

afterEach(() => {
  cleanup();
  setHealthBridgeForTests(undefined);
});

describe("Apple Health availability", () => {
  it("explains that Apple Health needs the iPhone app on the web", () => {
    setHealthBridgeForTests(null);
    render(ui("user-a"));
    expect(
      screen.getByText("Apple Health ist in der Vital Plus App auf dem iPhone verfügbar."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Apple Health verbinden?")).not.toBeInTheDocument();
  });

  it("reports unsupported devices without requesting permissions", async () => {
    const { bridge, typed } = fakeBridge();
    bridge.isAvailable.mockResolvedValue({ available: false });
    setHealthBridgeForTests(typed);
    render(ui("user-a"));
    expect(
      await screen.findByText("Apple Health ist auf diesem Gerät nicht verfügbar."),
    ).toBeInTheDocument();
    expect(bridge.requestAuthorization).not.toHaveBeenCalled();
    expect(bridge.loadState).not.toHaveBeenCalled();
  });
});

describe("Apple Health onboarding", () => {
  it("shows the intro once and asks for permission only after the user taps connect", async () => {
    const { bridge, files, typed } = fakeBridge();
    setHealthBridgeForTests(typed);
    render(ui("user-a"));
    expect(await screen.findByText("Apple Health verbinden?")).toBeInTheDocument();
    expect(bridge.requestAuthorization).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Apple Health verbinden" })[0]!);
    await waitFor(() => expect(bridge.readDailySummary).toHaveBeenCalled());
    expect(bridge.requestAuthorization).toHaveBeenCalledWith({
      read: [
        "stepCount",
        "heartRate",
        "bodyMass",
        "sleepAnalysis",
        "dietaryEnergyConsumed",
        "activeEnergyBurned",
        "basalEnergyBurned",
        "dietaryWater",
      ],
      write: ["bodyMass", "dietaryWater", "dietaryEnergyConsumed"],
    });
    await waitFor(() =>
      expect(screen.queryByText("Apple Health verbinden?")).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("11.111")).toBeInTheDocument();
    const saved = await stateOf(files, "user-a");
    expect(saved).toMatchObject({ intro: "connected", connected: true });
    expect(saved.lastSyncAt).not.toBeNull();
  });

  it("does not show the intro before the questionnaire is done", async () => {
    const { bridge, typed } = fakeBridge();
    setHealthBridgeForTests(typed);
    render(ui("user-a", { onboarded: false }));
    await waitFor(() => expect(bridge.loadState).toHaveBeenCalled());
    expect(screen.queryByText("Apple Health verbinden?")).not.toBeInTheDocument();
  });

  it("remembers a skip for the account and still allows connecting later", async () => {
    const { bridge, files, typed } = fakeBridge();
    setHealthBridgeForTests(typed);
    const { unmount } = render(ui("user-a"));
    fireEvent.click(await screen.findByRole("button", { name: "Jetzt nicht" }));
    await waitFor(() =>
      expect(screen.queryByText("Apple Health verbinden?")).not.toBeInTheDocument(),
    );
    expect((await stateOf(files, "user-a")).intro).toBe("skipped");
    expect(bridge.requestAuthorization).not.toHaveBeenCalled();
    unmount();

    render(ui("user-a")); // next app launch
    expect(await screen.findByText("Nicht verbunden")).toBeInTheDocument();
    expect(screen.queryByText("Apple Health verbinden?")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Apple Health verbinden" }));
    await waitFor(() => expect(bridge.requestAuthorization).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Verbunden")).toBeInTheDocument();
  });
});

describe("Apple Health account isolation", () => {
  it("never shows the previous account's imported data", async () => {
    const { files, typed } = fakeBridge(11111);
    setHealthBridgeForTests(typed);
    const view = render(ui("user-a"));
    fireEvent.click((await screen.findAllByRole("button", { name: "Apple Health verbinden" }))[0]!);
    expect(await screen.findByText("11.111")).toBeInTheDocument();

    view.rerender(ui("user-b"));
    await waitFor(() => expect(screen.queryByText("11.111")).not.toBeInTheDocument());
    expect(await screen.findByText("Apple Health verbinden?")).toBeInTheDocument();
    expect((await stateOf(files, "user-b")).summary).toBeNull();

    view.rerender(ui(null));
    await waitFor(() =>
      expect(screen.queryByText("Apple Health verbinden?")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("11.111")).not.toBeInTheDocument();

    view.rerender(ui("user-a"));
    expect(await screen.findByText("11.111")).toBeInTheDocument();
  });
});

describe("Apple Health sync", () => {
  async function connected(steps = 11111) {
    const fake = fakeBridge(steps);
    setHealthBridgeForTests(fake.typed);
    const view = render(ui("user-a"));
    fireEvent.click((await screen.findAllByRole("button", { name: "Apple Health verbinden" }))[0]!);
    await screen.findByText("Jetzt synchronisieren");
    return { ...fake, view };
  }

  it("shows missing values as no data, not zero", async () => {
    await connected();
    expect(screen.getByText("Schritte").nextSibling?.textContent).toBe("11.111");
    expect(screen.getByText("Aktive Energie", { selector: "dt" }).nextSibling?.textContent).toBe(
      "Keine Daten",
    );
    expect(screen.getAllByText("Keine Daten")).toHaveLength(7);
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it("can cancel a running sync and ignores its late result", async () => {
    const { bridge, files } = await connected();
    let resolve!: (value: RawSummary) => void;
    bridge.readDailySummary.mockImplementationOnce(
      () =>
        new Promise<RawSummary>((r) => {
          resolve = r;
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Jetzt synchronisieren" }));
    fireEvent.click(await screen.findByRole("button", { name: "Synchronisierung abbrechen" }));
    await act(async () => {
      resolve(summary(99999));
    });
    expect(screen.getByRole("button", { name: "Jetzt synchronisieren" })).toBeInTheDocument();
    expect(screen.queryByText("99.999")).not.toBeInTheDocument();
    expect(JSON.stringify(await stateOf(files, "user-a"))).not.toContain("99999");
  });

  it("offers a retry after a failed sync", async () => {
    const { bridge } = await connected();
    bridge.readDailySummary.mockRejectedValue(
      Object.assign(new Error("x"), { code: "UNAVAILABLE" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Jetzt synchronisieren" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Apple Health konnte nicht synchronisiert werden.",
    );
    bridge.readDailySummary.mockResolvedValue(summary(22222));
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByText("22.222")).toBeInTheDocument();
  });

  it("disconnect deletes the local cache but keeps the intro choice", async () => {
    const { files } = await connected();
    fireEvent.click(screen.getByRole("button", { name: "Trennen" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Trennen und lokale Daten löschen" }),
    );
    expect(await screen.findByText("Nicht verbunden")).toBeInTheDocument();
    const saved = await stateOf(files, "user-a");
    expect(saved).toMatchObject({
      connected: false,
      summary: null,
      ledger: {},
      exportSince: null,
      intro: "connected",
    });
    expect(JSON.stringify(saved)).not.toContain("11111");
    expect(screen.queryByText("Apple Health verbinden?")).not.toBeInTheDocument();
  });
});

describe("Apple Health export", () => {
  const water: AppRecords = { meals: [], waterLog: { [TODAY]: 1.25 }, weightLog: {} };

  it("writes opted-in app entries once and never duplicates them", async () => {
    const { bridge, written, typed } = fakeBridge();
    setHealthBridgeForTests(typed);
    const view = render(ui("user-a", { records: water }));
    fireEvent.click((await screen.findAllByRole("button", { name: "Apple Health verbinden" }))[0]!);
    fireEvent.click(await screen.findByRole("switch", { name: "Wasser" }));
    await waitFor(() => expect(written).toHaveLength(1), { timeout: 3000 });
    expect(written[0]).toMatchObject({
      recordId: `water.${TODAY}`,
      type: "dietaryWater",
      value: 1250,
      unit: "mL",
    });
    expect(bridge.writeSamples.mock.calls[0]![0]).toMatchObject({
      accountTag: (await accountKeys("user-a")).tag,
    });

    view.rerender(ui("user-a", { records: { ...water } })); // same entries, new object
    fireEvent.click(screen.getByRole("button", { name: "Jetzt synchronisieren" }));
    await new Promise((r) => setTimeout(r, 1800));
    expect(written).toHaveLength(1);
    // Imported step data is never written back.
    expect(written.every((s) => s.type === "dietaryWater")).toBe(true);
  });

  it("explains partial write permission and skips blocked types", async () => {
    const { bridge, written, typed } = fakeBridge();
    bridge.getWriteStatus.mockResolvedValue({
      statuses: { bodyMass: "denied", dietaryWater: "denied", dietaryEnergyConsumed: "authorized" },
    });
    setHealthBridgeForTests(typed);
    render(ui("user-a", { records: water }));
    fireEvent.click((await screen.findAllByRole("button", { name: "Apple Health verbinden" }))[0]!);
    fireEvent.click(await screen.findByRole("switch", { name: "Wasser" }));
    expect(
      await screen.findByText(/Schreiben ist in Apple Health nicht erlaubt/),
    ).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 1800));
    expect(written).toHaveLength(0);
    expect(screen.getByRole("switch", { name: "Aktive Energie" })).toBeDisabled();
  });
});

describe("Apple Health privacy", () => {
  beforeEach(() => {
    localStorage.clear();
    supa.user = { id: "user-a", email: "a@example.com" };
    supa.saved = {
      name: "Mira",
      onboarded: true,
      body: { weightKg: 70, steps: 1234, stepsDate: TODAY },
    };
    supa.upsert.mockReset().mockResolvedValue({ error: null });
  });

  function Probe() {
    const { s } = useStore();
    return <output data-testid="store">{JSON.stringify(s)}</output>;
  }

  it("keeps imported data out of the synced account store and the cloud", async () => {
    const { bridge, typed } = fakeBridge(98765);
    bridge.readDailySummary.mockResolvedValue({
      ...summary(98765),
      results: [
        ...summary(98765).results,
        { type: "bodyMass", day: TODAY, aggregation: "latest", value: 91.7, unit: "kg" },
      ],
    });
    setHealthBridgeForTests(typed);
    render(
      <StoreProvider>
        <AppleHealthProvider>
          <AppleHealthIntro />
          <AppleHealthSection />
          <Probe />
        </AppleHealthProvider>
      </StoreProvider>,
    );
    fireEvent.click((await screen.findAllByRole("button", { name: "Apple Health verbinden" }))[0]!);
    expect(await screen.findByText("98.765")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 1000));
    const store = screen.getByTestId("store").textContent ?? "";
    expect(store).not.toContain("98765");
    expect(store).not.toContain("91.7");
    expect(JSON.parse(store).body).toMatchObject({ weightKg: 70, steps: 1234 });
    for (const [payload] of supa.upsert.mock.calls)
      expect(JSON.stringify(payload)).not.toMatch(/98765|91\.7/);
    expect(localStorage.getItem("fv-health-v1") ?? "").not.toMatch(/98765|91\.7/);
  });
});
