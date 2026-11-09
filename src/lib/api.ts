/**
 * API client for TaskFlow.
 *
 * Every screen talks to the backend only through `authApi` and `tasksApi`.
 * Right now these run against in-browser mock data so the UI can be previewed.
 * To connect the real Node/Express/MongoDB REST API, set VITE_API_URL and replace
 * each mock body with the matching `request(...)` call shown in the comments.
 */
import type { Task, TaskInput } from "./tasks";

export const API_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";
const MOCK_TASKS_KEY = "taskflow_mock_tasks";

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

/* ---------------- token storage ---------------- */

function storage(remember = true): Storage | null {
  if (typeof window === "undefined") return null;
  return remember ? window.localStorage : window.sessionStorage;
}

export const session = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  },
  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },
  save(auth: AuthResponse, remember: boolean) {
    const s = storage(remember);
    s?.setItem(TOKEN_KEY, auth.token);
    s?.setItem(USER_KEY, JSON.stringify(auth.user));
  },
  clear() {
    if (typeof window === "undefined") return;
    for (const s of [localStorage, sessionStorage]) {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    }
  },
};

/* ---------------- real request helper (for later) ---------------- */

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = session.getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.message ?? "Something went wrong.", res.status);
  return body as T;
}

/* ---------------- mock layer ---------------- */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const daysAgo = (d: number, h = 0) =>
  new Date(Date.now() - d * 86_400_000 - h * 3_600_000).toISOString();

const SEED_TASKS: Task[] = [
  {
    _id: "t1",
    title: "Finalize Q4 portfolio case study",
    description:
      "Write the problem statement, add the before/after screenshots and polish the results section.",
    status: "in-progress",
    createdAt: daysAgo(0, 3),
  },
  {
    _id: "t2",
    title: "Book dentist appointment",
    description: "Call the clinic before Friday and ask for an early morning slot.",
    status: "pending",
    createdAt: daysAgo(1),
  },
  {
    _id: "t3",
    title: "Read “Deep Work” — chapter 4",
    description: "Take notes on the rules for scheduling deep work blocks.",
    status: "completed",
    createdAt: daysAgo(2),
  },
  {
    _id: "t4",
    title: "Plan weekend grocery list",
    description: "Vegetables, oat milk, coffee beans and ingredients for Sunday dinner.",
    status: "pending",
    createdAt: daysAgo(3),
  },
  {
    _id: "t5",
    title: "Refactor API error handling",
    description: "Centralize error responses in the Express middleware and add status codes.",
    status: "in-progress",
    createdAt: daysAgo(4),
  },
  {
    _id: "t6",
    title: "Renew gym membership",
    description: "Membership expires at the end of the month — compare yearly plan pricing.",
    status: "completed",
    createdAt: daysAgo(6),
  },
];

function loadMockTasks(): Task[] {
  if (typeof window === "undefined") return [...SEED_TASKS];
  const raw = localStorage.getItem(MOCK_TASKS_KEY);
  if (!raw) return [...SEED_TASKS];
  try {
    return JSON.parse(raw) as Task[];
  } catch {
    return [...SEED_TASKS];
  }
}

function saveMockTasks(tasks: Task[]) {
  if (typeof window !== "undefined") localStorage.setItem(MOCK_TASKS_KEY, JSON.stringify(tasks));
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------- public API ---------------- */

export const authApi = {
  // Real: request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(input) })
  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    await delay(900);
    if (input.password === "wrongpass")
      throw new ApiError("Invalid email or password. Please try again.", 401);
    const name = input.email.split("@")[0].replace(/[._-]+/g, " ");
    return {
      token: `mock.${uid()}`,
      user: { _id: uid(), name: name.charAt(0).toUpperCase() + name.slice(1), email: input.email },
    };
  },

  // Real: request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(input) })
  async register(input: { name: string; email: string; password: string }): Promise<AuthResponse> {
    await delay(1000);
    if (input.email.toLowerCase() === "taken@taskflow.app")
      throw new ApiError("An account with this email already exists.", 409);
    return {
      token: `mock.${uid()}`,
      user: { _id: uid(), name: input.name.trim(), email: input.email },
    };
  },

  logout() {
    session.clear();
  },
};

export type MockScenario = "error" | "empty" | undefined;

export const tasksApi = {
  // Real: request<Task[]>("/api/tasks")
  async list(scenario?: MockScenario): Promise<Task[]> {
    await delay(1100);
    if (scenario === "error") throw new ApiError("We couldn't load your tasks.", 503);
    if (scenario === "empty") return [];
    return loadMockTasks().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Real: request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) })
  async create(input: TaskInput): Promise<Task> {
    await delay(700);
    const task: Task = {
      _id: uid(),
      title: input.title.trim(),
      description: input.description.trim(),
      status: input.status,
      createdAt: new Date().toISOString(),
    };
    saveMockTasks([task, ...loadMockTasks()]);
    return task;
  },

  // Real: request<Task>(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(input) })
  async update(id: string, input: TaskInput): Promise<Task> {
    await delay(700);
    const tasks = loadMockTasks();
    const idx = tasks.findIndex((t) => t._id === id);
    if (idx === -1) throw new ApiError("Task not found.", 404);
    const updated: Task = {
      ...tasks[idx],
      title: input.title.trim(),
      description: input.description.trim(),
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    tasks[idx] = updated;
    saveMockTasks(tasks);
    return updated;
  },

  // Real: request<{ message: string }>(`/api/tasks/${id}`, { method: "DELETE" })
  async remove(id: string): Promise<void> {
    await delay(600);
    saveMockTasks(loadMockTasks().filter((t) => t._id !== id));
  },
};
