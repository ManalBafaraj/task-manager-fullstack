import { describe, expect, it } from "vitest";
import {
  countByStatus,
  filterTasks,
  TASK_STATUSES,
  validateTask,
  type Task,
  type TaskInput,
} from "@/lib/tasks";
import { validateRegister } from "@/lib/auth-validation";

const taskInput: TaskInput = {
  title: "Example task",
  description: "",
  checklist: [],
  status: "pending",
  priority: "medium",
  category: "General",
  dueDate: null,
  reminderEnabled: false,
  reminderType: "before-due",
  reminderTime: "09:00",
};

const tasks: Task[] = [
  {
    ...taskInput,
    _id: "1",
    title: "Write report",
    description: "Q4 numbers",
    status: "pending",
    createdAt: "2026-01-01",
  },
  {
    _id: "2",
    ...taskInput,
    title: "Gym",
    description: "Leg day",
    status: "in-progress",
    createdAt: "2026-01-02",
  },
  {
    _id: "3",
    ...taskInput,
    title: "Read book",
    description: "Chapter 4 report",
    status: "completed",
    createdAt: "2026-01-03",
  },
];

describe("TaskFlow rules", () => {
  it("uses exactly the API status values", () => {
    expect(TASK_STATUSES).toEqual(["pending", "in-progress", "completed"]);
  });

  it("filters by status", () => {
    expect(filterTasks(tasks, "", "in-progress").map((t) => t._id)).toEqual(["2"]);
  });

  it("searches title and description, case-insensitively", () => {
    expect(filterTasks(tasks, "REPORT", "all").map((t) => t._id)).toEqual(["1", "3"]);
  });

  it("counts tasks per status", () => {
    expect(countByStatus(tasks)).toEqual({ all: 3, pending: 1, "in-progress": 1, completed: 1 });
  });

  it("requires a task title", () => {
    expect(validateTask({ ...taskInput, title: "  " }).title).toBeTruthy();
  });

  it("rejects mismatched passwords on register", () => {
    const errors = validateRegister({
      name: "Manal",
      email: "manal@example.com",
      password: "secret1",
      confirmPassword: "secret2",
    });
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });
});
