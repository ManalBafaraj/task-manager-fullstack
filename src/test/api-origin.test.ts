import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, authApi, request, session, tasksApi } from "@/lib/api";
import type { TaskInput } from "@/lib/tasks";

afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("same-origin API requests", () => {
  it("ignores an obsolete loopback override for health, auth, and task requests", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    const fetch = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetch);
    const input: TaskInput = {
      title: "LAN task",
      description: "",
      status: "pending",
      priority: "medium",
      category: "General",
      checklist: [],
      dueDate: null,
      reminderEnabled: false,
      reminderType: "daily",
      reminderTime: "09:00",
    };
    await request("/health");
    await authApi.login({ email: "qa@example.test", password: "test-password" });
    await authApi.register({ name: "QA", email: "qa@example.test", password: "test-password" });
    await tasksApi.list();
    await tasksApi.create(input);
    await tasksApi.update("task-id", input);
    await tasksApi.remove("task-id");
    expect(API_URL).toBe("/api");
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      "/api/health",
      "/api/auth/login",
      "/api/auth/register",
      "/api/tasks",
      "/api/tasks",
      "/api/tasks/task-id",
      "/api/tasks/task-id",
    ]);
  });
});
