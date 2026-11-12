import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Task } from "./tasks";

// Due dates are calendar dates, including ISO dates returned by MongoDB.
export function dateKey(value: Date | string): string {
  if (typeof value === "string") {
    if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return "";
    const day = value.slice(0, 10);
    const parsed = new Date(`${day}T12:00:00`);
    return isValid(parsed) && format(parsed, "yyyy-MM-dd") === day ? day : "";
  }
  return isValid(value) ? format(value, "yyyy-MM-dd") : "";
}

export function groupTasksByDate(tasks: readonly Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.dueDate ? dateKey(task.dueDate) : "";
    if (key) groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return groups;
}

export function monthDays(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(date)),
    end: endOfWeek(endOfMonth(date)),
  });
}
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export function moveCalendar(date: Date, amount: number, view: "week" | "month"): Date {
  return view === "week" ? addDays(date, amount * 7) : addMonths(date, amount);
}

function urgency(task: Task, today: string): number {
  const due = task.dueDate ? dateKey(task.dueDate) : "";
  return due && due < today ? 0 : due === today ? 1 : 2;
}
const priorities = { high: 0, medium: 1, low: 2 };
export function nextMove(tasks: readonly Task[], now = new Date()): Task | null {
  const today = dateKey(now);
  return (
    [...tasks]
      .filter((t) => t.status !== "completed")
      .sort(
        (a, b) =>
          urgency(a, today) - urgency(b, today) ||
          priorities[a.priority] - priorities[b.priority] ||
          Number(b.status === "in-progress") - Number(a.status === "in-progress") ||
          (dateKey(a.dueDate ?? "") || "9999").localeCompare(dateKey(b.dueDate ?? "") || "9999") ||
          a.createdAt.localeCompare(b.createdAt) ||
          a._id.localeCompare(b._id),
      )[0] ?? null
  );
}
export function nextMoveReason(task: Task, now = new Date()): string {
  const level = urgency(task, dateKey(now));
  return (
    [
      level === 0 ? "Overdue" : level === 1 ? "Due today" : null,
      task.priority === "high" ? "High priority" : null,
      task.status === "in-progress" ? "Already in progress" : null,
    ]
      .filter(Boolean)
      .join(" · ") || (task.dueDate ? "Your next upcoming task" : "A good place to begin")
  );
}

export const SPRINT_DURATION = 25 * 60 * 1000;
export interface SprintState {
  taskId: string;
  remaining: number;
  /** Absolute endsAt timestamp; the legacy field name is retained for migration. */
  deadline: number | null;
  started: boolean;
  durationMs: number;
  sessionId: string;
  alertedAt: number | null;
  completionDismissed: boolean;
}
let sequence = 0;
export function newSprint(taskId: string, minutes: 15 | 25 | 45 | 60 = 25): SprintState {
  return {
    taskId,
    remaining: minutes * 60000,
    durationMs: minutes * 60000,
    deadline: null,
    started: false,
    sessionId:
      typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${++sequence}`,
    alertedAt: null,
    completionDismissed: false,
  };
}
export function remainingTime(state: SprintState, now: number): number {
  return Math.max(0, state.deadline === null ? state.remaining : state.deadline - now);
}
export function startSprint(state: SprintState, now: number): SprintState {
  return { ...state, started: true, deadline: now + state.remaining };
}
export function pauseSprint(state: SprintState, now: number): SprintState {
  return { ...state, remaining: remainingTime(state, now), deadline: null };
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function readSprint(storage: Pick<Storage, "getItem">, key: string): SprintState | null {
  try {
    const s: unknown = JSON.parse(storage.getItem(key) ?? "null");
    if (!record(s)) return null;
    const duration =
      typeof s["durationMs"] === "number" &&
      [15, 25, 45, 60].some((n) => n * 60000 === s["durationMs"])
        ? s["durationMs"]
        : SPRINT_DURATION;
    const taskId = s["taskId"],
      remaining = s["remaining"],
      deadline = s["deadline"],
      started = s["started"];
    if (
      typeof taskId !== "string" ||
      typeof remaining !== "number" ||
      !Number.isFinite(remaining) ||
      remaining < 0 ||
      remaining > duration ||
      typeof started !== "boolean" ||
      !(deadline === null || (typeof deadline === "number" && Number.isFinite(deadline)))
    )
      return null;
    return {
      taskId,
      remaining,
      deadline,
      started,
      durationMs: duration,
      sessionId:
        typeof s["sessionId"] === "string"
          ? s["sessionId"]
          : `legacy:${taskId}:${deadline}:${remaining}`,
      alertedAt:
        typeof s["alertedAt"] === "number" && Number.isFinite(s["alertedAt"])
          ? s["alertedAt"]
          : null,
      completionDismissed: s["completionDismissed"] === true,
    };
  } catch {
    return null;
  }
}
export function saveSprint(
  storage: Pick<Storage, "setItem" | "removeItem">,
  key: string,
  state: SprintState | null,
): boolean {
  try {
    if (state) storage.setItem(key, JSON.stringify(state));
    else storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
const memoryClaims = new Set<string>();
export function claimCompletion(
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
  state: SprintState,
  now: number,
): SprintState | null {
  if (!state.started || state.alertedAt !== null || remainingTime(state, now) > 0) return null;
  const current = readSprint(storage, key) ?? state;
  if (
    current.sessionId !== state.sessionId ||
    current.alertedAt !== null ||
    memoryClaims.has(state.sessionId)
  )
    return null;
  const completed = { ...current, remaining: 0, deadline: null, alertedAt: now };
  try {
    storage.setItem(key, JSON.stringify(completed));
  } catch {
    memoryClaims.add(state.sessionId);
  }
  return completed;
}
