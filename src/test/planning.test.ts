import { describe, expect, it } from "vitest";
import {
  dateKey,
  groupTasksByDate,
  monthDays,
  moveCalendar,
  weekDays,
  nextMove,
  nextMoveReason,
  newSprint,
  pauseSprint,
  startSprint,
  remainingTime,
  readSprint,
  saveSprint,
  SPRINT_DURATION,
} from "@/lib/planning";
import type { Task } from "@/lib/tasks";

const base: Task = {
  _id: "base",
  title: "A task",
  description: "",
  checklist: [],
  priority: "medium",
  category: "Work",
  status: "pending",
  dueDate: null,
  reminderEnabled: false,
  reminderType: "daily",
  reminderTime: "09:00",
  createdAt: "2026-01-01T00:00:00Z",
};
const task = (id: string, changes: Partial<Task> = {}): Task => ({ ...base, _id: id, ...changes });
const today = new Date(2026, 10, 11, 12);

describe("Next Move", () => {
  it("never recommends completed work and handles empty lists", () => {
    expect(nextMove([], today)).toBeNull();
    expect(
      nextMove([task("done", { status: "completed", dueDate: "2020-01-01" })], today),
    ).toBeNull();
  });
  it("ranks overdue, then today, before other tasks regardless of priority", () => {
    const overdue = task("overdue", { dueDate: "2026-11-10", priority: "low" });
    const dueToday = task("today", { dueDate: "2026-11-11T00:00:00Z", priority: "low" });
    const high = task("high", { priority: "high" });
    expect(nextMove([high, dueToday, overdue], today)?._id).toBe("overdue");
    expect(nextMove([high, dueToday], today)?._id).toBe("today");
  });
  it("uses priority before status, status before nearest date, then creation date", () => {
    expect(
      nextMove(
        [
          task("low", { priority: "low", status: "in-progress" }),
          task("high", { priority: "high" }),
        ],
        today,
      )?._id,
    ).toBe("high");
    expect(
      nextMove(
        [
          task("near", { dueDate: "2026-11-12" }),
          task("active", { status: "in-progress", dueDate: "2026-11-15" }),
        ],
        today,
      )?._id,
    ).toBe("active");
    expect(
      nextMove(
        [
          task("none"),
          task("near", { dueDate: "2026-11-12" }),
          task("far", { dueDate: "2026-11-20" }),
        ],
        today,
      )?._id,
    ).toBe("near");
    expect(nextMove([task("new", { createdAt: "2026-10-01" }), task("old")], today)?._id).toBe(
      "old",
    );
  });
  it("is stable, does not mutate data, and explains the recommendation", () => {
    const tasks = [task("b"), task("a")];
    expect(nextMove(tasks, today)?._id).toBe("a");
    expect(tasks[0]?._id).toBe("b");
    expect(nextMoveReason(task("urgent", { dueDate: "2026-11-10", priority: "high" }), today)).toBe(
      "Overdue · High priority",
    );
  });
});

describe("Calendar", () => {
  it("groups ISO due dates without moving them to a different local day", () => {
    const groups = groupTasksByDate([
      task("one", { dueDate: "2026-11-11T00:00:00.000Z" }),
      task("two", { dueDate: "2026-11-11" }),
      task("none"),
      task("invalid", { dueDate: "invalid" }),
    ]);
    expect(groups.get("2026-11-11")?.map((t) => t._id)).toEqual(["one", "two"]);
    expect(groups.get("2026-11-12") ?? []).toEqual([]);
    expect(groups.size).toBe(1);
  });
  it("navigates across year boundaries and short months", () => {
    expect(dateKey(moveCalendar(new Date(2026, 11, 31), 1, "week"))).toBe("2027-01-07");
    expect(dateKey(moveCalendar(new Date(2026, 0, 31), 1, "month"))).toBe("2026-02-28");
    expect(dateKey(moveCalendar(new Date(2026, 0, 1), -1, "month"))).toBe("2025-12-01");
    expect(weekDays(today)).toHaveLength(7);
    expect(monthDays(today).length % 7).toBe(0);
    expect(monthDays(today).some((d) => dateKey(d) === "2026-11-30")).toBe(true);
  });
});

describe("Focus timer", () => {
  it("uses wall-clock deadlines, pauses, and resumes without losing time", () => {
    const initial = newSprint("task");
    expect(initial.remaining).toBe(SPRINT_DURATION);
    const running = startSprint(initial, 1000);
    expect(remainingTime(running, 11000)).toBe(SPRINT_DURATION - 10000);
    const paused = pauseSprint(running, 11000);
    expect(remainingTime(paused, 90000)).toBe(SPRINT_DURATION - 10000);
    expect(remainingTime(startSprint(paused, 90000), 91000)).toBe(SPRINT_DURATION - 11000);
    expect(remainingTime(running, 9999999)).toBe(0);
  });
  it("restores a running sprint after refresh and removes ended sessions", () => {
    const state = startSprint(newSprint("task"), 1000);
    expect(saveSprint(localStorage, "sprint", state)).toBe(true);
    expect(readSprint(localStorage, "sprint")).toEqual(state);
    expect(remainingTime(readSprint(localStorage, "sprint")!, 31000)).toBe(SPRINT_DURATION - 30000);
    saveSprint(localStorage, "sprint", null);
    expect(readSprint(localStorage, "sprint")).toBeNull();
  });
  it("handles corrupt data and unavailable storage", () => {
    expect(readSprint({ getItem: () => "{broken" }, "key")).toBeNull();
    expect(readSprint({ getItem: () => '{"taskId":"x","remaining":-1}' }, "key")).toBeNull();
    expect(
      saveSprint(
        {
          setItem: () => {
            throw new Error();
          },
          removeItem: () => {},
        },
        "key",
        newSprint("x"),
      ),
    ).toBe(false);
  });
});
