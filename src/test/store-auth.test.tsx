import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";
import type { QuestionnaireDraft } from "@/lib/questionnaire-draft";

const auth = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: string, session: { user: { id: string; email: string } } | null) => void),
  user: null as { id: string; email: string; user_metadata?: Record<string, unknown> } | null,
  saved: { name: "Jonas", body: { weightKg: 80 } } as Record<string, unknown> | null,
  upsert: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: auth.user } }),
      onAuthStateChange: (listener: typeof auth.listener) => {
        auth.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    rpc: async () => ({ data: true, error: null }),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: auth.saved ? { state: auth.saved } : null }) }) }),
      upsert: auth.upsert,
    }),
  },
}));

function StateProbe() {
  const { s } = useStore();
  return <output data-testid="state">{JSON.stringify({ name: s.name, account: s.account, weight: s.body.weightKg, onboarded: s.onboarded })}</output>;
}
const read = () => JSON.parse(screen.getByTestId("state").textContent || "{}");

describe("Account state isolation", () => {
  beforeEach(() => { localStorage.clear(); auth.user = null; auth.listener = undefined; auth.saved = { name: "Jonas", body: { weightKg: 80 } }; auth.upsert.mockResolvedValue({ error: null }); });

  it("does not restore Jonas from a signed-out account cache", async () => {
    localStorage.setItem("fv-health-v1", JSON.stringify({ name: "Jonas", account: { userId: "previous-user" }, body: { weightKg: 80 } }));
    render(<StoreProvider><StateProbe /></StoreProvider>);
    await waitFor(() => expect(localStorage.getItem("fv-health-v1")).toBeNull());
    expect(read()).toEqual({ name: "", account: null, weight: null, onboarded: false });
  });

  it("clears name and health details after logout", async () => {
    auth.user = { id: "user-a", email: "test@example.com" };
    render(<StoreProvider><StateProbe /></StoreProvider>);
    await waitFor(() => expect(read().name).toBe("Jonas"));
    act(() => auth.listener?.("SIGNED_OUT", null));
    expect(read()).toEqual({ name: "", account: null, weight: null, onboarded: false });
    expect(localStorage.getItem("fv-health-v1")).toBeNull();
  });
  it("restores completed questionnaire only from the verified new account", async () => {
    auth.saved = null;
    const questionnaire: QuestionnaireDraft = { name: "Mira", goals: ["Longevity"], diet: "Vegetarisch", body: { age: 35, sex: "female", activity: "moderate", weightKg: 72.5, heightCm: 175, stepGoal: 8000 } };
    auth.user = { id: "new-user", email: "test@example.com", user_metadata: { questionnaire } };
    render(<StoreProvider><StateProbe /></StoreProvider>);
    await waitFor(() => expect(read()).toEqual({ name: "Mira", weight: 72.5, onboarded: true, account: { userId: "new-user", email: "test@example.com" } }));
  });
});