import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

async function open(path: string) {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  await router.state.isLoadingPromise;
  return router;
}

afterEach(() => {
  cleanup();
});

describe("Password reset return path", () => {
  it("sends 'Zurück zur Anmeldung' to the start page login form", async () => {
    await open("/login?mode=reset");
    const back = await screen.findByRole("link", { name: "Zurück zur Anmeldung" });
    expect(back.getAttribute("href")).toBe("/?mode=login");
  });

  it("opens the start page on the login tab when asked for it", async () => {
    const router = await open("/?mode=login");
    expect(router.state.location.pathname).toBe("/");
    expect(await screen.findByRole("button", { name: "Einloggen" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the start page on the new-visitor tab by default", async () => {
    await open("/");
    expect(await screen.findByRole("button", { name: "Neu hier" })).toHaveAttribute("aria-pressed", "true");
  });
});
