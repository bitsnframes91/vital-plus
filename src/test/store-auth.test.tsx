import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";

const auth = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: string, session: { user: { id: string; email: string } } | null) => void),
  user: null as { id: string; email: string } | null,
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
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { state: { name: "Jonas", body: { weightKg: 80 } } } }) }) }),
      upsert: auth.upsert,
    }),
  },
}));

function StateProbe() {
  const { s } = useStore();
  return <output data-testid="state">{JSON.stringify({ name: s.name, account: s.account, weight: s.body.weightKg })}</output>;
}
const read = () => JSON.parse(screen.getByTestId("state").textContent || "{}");

describe("Account state isolation", () => {
  beforeEach(() => { localStorage.clear(); auth.user = null; auth.listener = undefined; });

  it("does not restore Jonas from a signed-out account cache", async () => {
    localStorage.setItem("fv-health-v1", JSON.stringify({ name: "Jonas", account: { userId: "previous-user" }, body: { weightKg: 80 } }));
    render(<StoreProvider><StateProbe /></StoreProvider>);
    await waitFor(() => expect(localStorage.getItem("fv-health-v1")).toBeNull());
    expect(read()).toEqual({ name: "", account: null, weight: null });
  });

  it("clears name and health details after logout", async () => {
    auth.user = { id: "user-a", email: "test@example.com" };
    render(<StoreProvider><StateProbe /></StoreProvider>);
    await waitFor(() => expect(read().name).toBe("Jonas"));
    act(() => auth.listener?.("SIGNED_OUT", null));
    expect(read()).toEqual({ name: "", account: null, weight: null });
    expect(localStorage.getItem("fv-health-v1")).toBeNull();
  });
});