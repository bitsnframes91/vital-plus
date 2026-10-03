import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

function routeAt(path: "/" | "/heute" | "/login") {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return router.routesByPath[path];
}

describe("App routing", () => {
  it("registers the new home and preserved daily routes", () => {
    expect(routeAt("/")).toBeDefined();
    expect(routeAt("/heute")).toBeDefined();
  });

  it("registers the account route", () => {
    expect(routeAt("/login")).toBeDefined();
  });
});
