import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizePreferences, validatePreferencesPatch } from "../../shared/preferences";
import { dashboardPhrase } from "@/lib/dashboard-copy";
import {
  claimCompletion,
  newSprint,
  startSprint,
  saveSprint,
  readSprint,
  remainingTime,
} from "@/lib/planning";
import { announceCompletion, notificationStatus } from "@/lib/completion-alert";
import { updateTask, undoCompletion } from "@/lib/task-mutations";
import { tasksApi } from "@/lib/api";
import type { Task } from "@/lib/tasks";

const task: Task = {
  _id: "qa",
  title: "كتابة outline",
  description: "Keep this",
  status: "in-progress",
  priority: "high",
  category: "Work",
  dueDate: null,
  checklist: [{ text: "Step", completed: true }],
  reminderEnabled: true,
  reminderType: "daily",
  reminderTime: "13:45",
  createdAt: "2026-01-01",
};
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe("preferences and contextual copy", () => {
  it("migrates existing users and rejects unsupported values rather than weakening types", () => {
    expect(normalizePreferences(null)).toMatchObject({
      focusMinutes: 25,
      completionSound: true,
      completionSoundId: "chime",
      appearance: "light",
    });
    expect(validatePreferencesPatch({ focusMinutes: 17 }).ok).toBe(false);
    expect(validatePreferencesPatch({ defaultReminderTime: "24:01" }).ok).toBe(false);
    expect(validatePreferencesPatch({ email: "other@example.test" }).ok).toBe(false);
    expect(
      normalizePreferences({ focusMinutes: 60, appearance: "dark", completionSoundId: "pulse" }),
    ).toMatchObject({
      focusMinutes: 60,
      appearance: "dark",
      completionSoundId: "pulse",
    });
    expect(validatePreferencesPatch({ completionSoundId: "unknown" }).ok).toBe(false);
  });
  it("is deterministic, state aware, and uses singular and plural grammar", () => {
    const one = { all: 1, pending: 1, "in-progress": 0, completed: 0 };
    expect(dashboardPhrase(one, "qa", "2026-11-12")).toBe(dashboardPhrase(one, "qa", "2026-11-12"));
    expect(dashboardPhrase(one, "qa", "2026-11-12")).toMatch(/^One task is waiting/);
    expect(dashboardPhrase({ ...one, all: 2, pending: 2 }, "qa", "2026-11-12")).toMatch(
      /^Two tasks are waiting/,
    );
    expect(dashboardPhrase({ ...one, pending: 0, "in-progress": 1 }, "qa", "2026-11-12")).toMatch(
      /^One task in progress/,
    );
    expect(dashboardPhrase({ ...one, pending: 0, completed: 1 }, "qa", "2026-11-12")).toMatch(
      /complete|done/,
    );
  });
});
describe("completion lifecycle", () => {
  it("retains the chosen duration on restore and claims an expired session once before alerting", () => {
    const running = startSprint(newSprint("qa", 45), 1000);
    saveSprint(localStorage, "timer", running);
    const restored = readSprint(localStorage, "timer")!;
    expect(restored.durationMs).toBe(45 * 60000);
    expect(remainingTime(restored, 1000 + 45 * 60000 + 1)).toBe(0);
    const claimed = claimCompletion(localStorage, "timer", restored, 1000 + 45 * 60000 + 1);
    expect(claimed?.alertedAt).not.toBeNull();
    expect(claimCompletion(localStorage, "timer", restored, 1000 + 45 * 60000 + 2)).toBeNull();
    expect(readSprint(localStorage, "timer")?.alertedAt).toBe(claimed?.alertedAt);
    expect(newSprint("next", 15).durationMs).toBe(15 * 60000);
  });
  it("supports visual fallback without audio or permission requests", () => {
    const title = document.title;
    expect(notificationStatus()).toBe("unsupported");
    const restore = announceCompletion("QA", "test", {
      sound: false,
      soundId: "chime",
      notifications: false,
    });
    expect(document.title).toContain("Focus session complete");
    restore();
    expect(document.title).toBe(title);
  });
});
describe("completion, reopening, and Undo", () => {
  function setup() {
    const client = new QueryClient();
    client.setQueryData(["tasks"], [task]);
    vi.spyOn(toast, "success").mockImplementation(() => "qa");
    vi.spyOn(toast, "error").mockImplementation(() => "qa");
    return client;
  }
  it("persists completion and Undo restores exact in-progress state and other fields", async () => {
    const client = setup();
    const update = vi
      .spyOn(tasksApi, "update")
      .mockImplementation(async (_id, changes) => ({ ...task, ...changes }));
    await updateTask(client, task, { status: "completed" });
    expect(toast.success).toHaveBeenCalledWith(
      "Task completed",
      expect.objectContaining({
        duration: 9000,
        action: expect.objectContaining({ label: "Undo" }),
      }),
    );
    await undoCompletion(client, task._id, "in-progress");
    expect(update).toHaveBeenLastCalledWith(task._id, { status: "in-progress" });
    expect(client.getQueryData(["tasks"])).toEqual([task]);
  });
  it("reopens without changing checklist/reminders and preserves state on failed save/Undo", async () => {
    const client = setup();
    const done: Task = { ...task, status: "completed" };
    client.setQueryData(["tasks"], [done]);
    const api = vi.spyOn(tasksApi, "update").mockRejectedValue(new Error("offline"));
    await expect(updateTask(client, done, { status: "pending" })).rejects.toThrow("offline");
    expect(client.getQueryData(["tasks"])).toEqual([done]);
    await undoCompletion(client, done._id, "in-progress");
    expect(toast.error).toHaveBeenCalled();
    api.mockResolvedValue({ ...done, status: "pending" });
    await updateTask(client, done, { status: "pending" });
    expect(client.getQueryData(["tasks"])).toEqual([{ ...task, status: "pending" }]);
  });
});
