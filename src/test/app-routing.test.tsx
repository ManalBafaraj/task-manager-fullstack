import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { Route as homeRoute } from "@/routes/index";
import { requireSession } from "@/lib/auth-guard";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it("keeps the Home page public and the application routes reachable", () => {
    expect(homeRoute.options.beforeLoad).toBeUndefined();
    expect(homeRoute.options.component).toBeTypeOf("function");
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const path of [
      "/login",
      "/register",
      "/dashboard",
      "/calendar",
      "/notifications",
      "/settings",
      "/privacy",
      "/terms",
    ]) {
      expect(router.matchRoutes(path).at(-1)?.routeId).toBe(path);
    }
  });
  it("redirects unauthenticated visitors and accepts a stored session", () => {
    localStorage.clear();
    sessionStorage.clear();
    expect(() => requireSession()).toThrow();
    sessionStorage.setItem("taskflow_token", "test-token");
    expect(() => requireSession()).not.toThrow();
    sessionStorage.clear();
  });
});
