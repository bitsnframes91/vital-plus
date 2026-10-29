import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";
import { HEALTH_CONSENT_VERSION } from "@/lib/consent-policy";
import type { QuestionnaireDraft } from "@/lib/questionnaire-draft";

// The server refuses user_data writes without active consent (42501). The store must never send a save
// before consent is confirmed, and must send the held data once it is.
const db = vi.hoisted(() => ({
  user: null as { id: string; email: string; user_metadata?: Record<string, unknown> } | null,
  saved: null as Record<string, unknown> | null,
  status: "none" as string,
  log: [] as string[],
  upserts: [] as { state: Record<string, unknown> }[],
  upsertError: null as null | { code: string; message: string },
  listener: undefined as undefined | ((event: string) => void),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: db.user } }),
      onAuthStateChange: (listener: (event: string) => void) => {
        db.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      db.log.push(name);
      if (name === "health_consent_status") return { data: db.status, error: null };
      if (name === "give_health_consent") {
        db.status = args["_version"] === HEALTH_CONSENT_VERSION ? "active" : "outdated";
        return { data: null, error: null };
      }
      if (name === "withdraw_health_consent") {
        db.status = "withdrawn";
        if (args["_delete_data"]) db.saved = null;
        return { data: null, error: null };
      }
      return { data: null, error: { message: "unknown" } };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: db.saved ? { state: db.saved } : null, error: null }),
        }),
      }),
      upsert: async (row: { state: Record<string, unknown> }) => {
        db.log.push("upsert");
        if (db.upsertError) return { error: db.upsertError };
        db.upserts.push(row);
        db.saved = row.state;
        return { error: null };
      },
    }),
  },
}));

let api: ReturnType<typeof useStore> | null = null;
function Probe() {
  api = useStore();
  return null;
}
const mount = () =>
  render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );
const questionnaire = (version: string): QuestionnaireDraft => ({
  name: "Mira",
  goals: ["Longevity"],
  diet: "",
  healthConsentAt: "2026-10-29T08:00:00Z",
  healthConsentVersion: version,
  body: {
    age: 35,
    sex: "female",
    activity: "moderate",
    weightKg: 72.5,
    heightCm: 175,
    stepGoal: 8000,
  },
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  Object.assign(db, {
    user: null,
    saved: null,
    status: "none",
    log: [],
    upserts: [],
    upsertError: null,
    listener: undefined,
  });
  api = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const settle = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
};

describe("signup save ordering", () => {
  it("records questionnaire consent before the first save, then saves the questionnaire once", async () => {
    db.user = {
      id: "new-user",
      email: "m@example.com",
      user_metadata: { questionnaire: questionnaire(HEALTH_CONSENT_VERSION) },
    };
    mount();
    await waitFor(() => expect(api?.consent).toBe("active"));
    await settle();
    expect(db.log.indexOf("give_health_consent")).toBeGreaterThan(-1);
    expect(db.log.indexOf("upsert")).toBeGreaterThan(db.log.indexOf("give_health_consent"));
    expect(db.upserts).toHaveLength(1);
    expect(db.upserts[0]!.state).toMatchObject({
      name: "Mira",
      onboarded: true,
      body: { weightKg: 72.5 },
    });
  });

  it("does not record consent ticked for an older policy and sends nothing until the user consents", async () => {
    db.user = {
      id: "new-user",
      email: "m@example.com",
      user_metadata: { questionnaire: questionnaire("2025-01-v0") },
    };
    mount();
    await waitFor(() => expect(api?.consent).toBe("none"));
    act(() => api!.set({ name: "Mira R." }));
    await settle();
    expect(db.log).not.toContain("upsert");
    expect(db.log).not.toContain("give_health_consent");

    await act(async () => {
      expect(await api!.grantConsent()).toBe(true);
    });
    await settle();
    expect(db.upserts).toHaveLength(1);
    expect(db.upserts[0]!.state).toMatchObject({
      name: "Mira R.",
      consent: { healthVersion: HEALTH_CONSENT_VERSION },
    });
  });

  it("prompts an existing user without consent and saves nothing meanwhile", async () => {
    db.saved = {
      name: "Jonas",
      onboarded: true,
      consent: { practitioner: false, analytics: false, healthDataAt: "2026-01-01T00:00:00Z" },
    };
    db.user = { id: "old-user", email: "j@example.com" };
    mount();
    await waitFor(() => expect(api?.consent).toBe("none"));
    act(() => api!.set({ name: "Jonas K." }));
    await settle();
    expect(db.log).toEqual(["health_consent_status"]);
  });
});

describe("paused saving (Profile notice)", () => {
  it("is paused only when the server reports no consent, and resumeSync sends held changes", async () => {
    db.saved = { name: "Jonas", onboarded: true };
    db.user = { id: "user-a", email: "j@example.com" };
    mount();
    expect(api!.syncPaused).toBe(false); // unknown while loading: no notice
    await waitFor(() => expect(api?.consent).toBe("none"));
    expect(api!.syncPaused).toBe(true);
    act(() => api!.set({ name: "Jonas K." }));
    await settle();
    expect(db.log).not.toContain("upsert");

    // Consent given elsewhere (another device or the web app): resumeSync picks it up.
    db.status = "active";
    act(() => api!.resumeSync());
    await waitFor(() => expect(api!.syncPaused).toBe(false));
    await settle();
    expect(db.upserts).toHaveLength(1);
    expect(db.upserts[0]!.state).toMatchObject({ name: "Jonas K." });
  });
});

describe("withdrawal", () => {
  beforeEach(() => {
    db.status = "active";
    db.saved = {
      name: "Jonas",
      onboarded: true,
      body: { weightKg: 80 },
      consent: {
        practitioner: false,
        analytics: false,
        healthDataAt: "x",
        healthVersion: HEALTH_CONSENT_VERSION,
      },
    };
    db.user = { id: "user-a", email: "j@example.com" };
  });

  it("keeping data: saves the last change first, then stops saving", async () => {
    mount();
    await waitFor(() => expect(api?.consent).toBe("active"));
    act(() => api!.set({ name: "Jonas K." }));
    await act(async () => {
      expect(await api!.withdrawConsent(false)).toBe(true);
    });
    expect(db.log.slice(-2)).toEqual(["upsert", "withdraw_health_consent"]);
    expect(db.upserts.at(-1)!.state).toMatchObject({ name: "Jonas K." });
    expect(api!.consent).toBe("withdrawn");
    expect(api!.s.name).toBe("Jonas K.");
    expect(api!.s.consent.healthVersion).toBeNull();
    const before = db.log.length;
    act(() => api!.set({ name: "Later" }));
    await settle();
    expect(db.log.length).toBe(before);
  });

  it("erasing data: drops unsent changes and clears the device copy", async () => {
    mount();
    await waitFor(() => expect(api?.consent).toBe("active"));
    act(() => api!.set({ name: "Unsent" }));
    await act(async () => {
      expect(await api!.withdrawConsent(true)).toBe(true);
    });
    await settle();
    expect(db.log).not.toContain("upsert");
    expect(api!.s).toMatchObject({
      name: "",
      onboarded: false,
      meals: [],
      labs: [],
      account: { userId: "user-a" },
    });
    expect(JSON.parse(localStorage.getItem("fv-health-v1")!).name).toBe("");
  });

  it("a write refused with 42501 (consent withdrawn on another device) is held and consent re-checked", async () => {
    mount();
    await waitFor(() => expect(api?.consent).toBe("active"));
    db.upsertError = { code: "42501", message: "health data consent required" };
    db.status = "withdrawn";
    act(() => api!.set({ name: "Elsewhere" }));
    await settle();
    await waitFor(() => expect(api!.consent).toBe("withdrawn"));
    db.upsertError = null;
    await act(async () => {
      await api!.grantConsent();
    });
    await settle();
    expect(db.upserts.at(-1)!.state).toMatchObject({ name: "Elsewhere" });
  });
});

describe("account removal on this device", () => {
  it("forgetAccount drops unsent saves and the cached state", async () => {
    db.status = "active";
    db.saved = { name: "Jonas", onboarded: true };
    db.user = { id: "user-a", email: "j@example.com" };
    mount();
    await waitFor(() => expect(api?.consent).toBe("active"));
    act(() => api!.set({ name: "Unsent" }));
    act(() => api!.forgetAccount());
    window.dispatchEvent(new Event("pagehide"));
    await settle();
    expect(db.log).not.toContain("upsert");
    expect(localStorage.getItem("fv-health-v1")).toBeNull();
    expect(api!.s.account).toBeNull();
    expect(api!.consent).toBeNull();
  });

  it("sign-out resets consent so the next account starts unknown", async () => {
    db.status = "active";
    db.saved = { name: "Jonas", onboarded: true };
    db.user = { id: "user-a", email: "j@example.com" };
    mount();
    await waitFor(() => expect(api?.consent).toBe("active"));
    act(() => db.listener?.("SIGNED_OUT"));
    expect(api!.consent).toBeNull();
    expect(api!.s.name).toBe("");
  });
});
