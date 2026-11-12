/**
 * API client for TaskFlow.
 *
 * All authentication and task requests pass through this file.
 */

import type { Task, TaskInput } from "./tasks";
import type { Preferences } from "../../shared/preferences";

// Always use the frontend origin, including on phones opening a LAN URL.
// A stale VITE_API_URL must never send requests to the phone's own localhost.
export const API_URL = "/api";

const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  preferences?: Preferences;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ---------------- Session storage ---------------- */

function storage(remember = true): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return remember ? window.localStorage : window.sessionStorage;
}

export const session = {
  getRawUser(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    } catch {
      return null;
    }
  },
  getToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  },

  getUser(): User | null {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);

    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },

  save(auth: AuthResponse, remember: boolean) {
    if (typeof window === "undefined") {
      return;
    }

    session.clear();

    const selectedStorage = storage(remember);

    selectedStorage?.setItem(TOKEN_KEY, auth.token);
    selectedStorage?.setItem(USER_KEY, JSON.stringify(auth.user));
    window.dispatchEvent(new Event("taskflow-session"));
  },

  updateUser(user: User, token?: string) {
    const selected = storage(
      typeof window !== "undefined" && Boolean(localStorage.getItem(TOKEN_KEY)),
    );
    selected?.setItem(USER_KEY, JSON.stringify(user));
    if (token) selected?.setItem(TOKEN_KEY, token);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("taskflow-session"));
  },

  clear() {
    if (typeof window === "undefined") {
      return;
    }

    for (const selectedStorage of [localStorage, sessionStorage]) {
      selectedStorage.removeItem(TOKEN_KEY);
      selectedStorage.removeItem(USER_KEY);
    }
    window.dispatchEvent(new Event("taskflow-session"));
  },
};

/* ---------------- Request helper ---------------- */

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = session.getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && token && session.getToken() === token) {
        session.clear();
        window.dispatchEvent(new Event("taskflow-auth-expired"));
      }
      throw new ApiError(body?.message ?? "Something went wrong.", response.status);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError("Unable to connect to the server. Please try again.", 503);
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------------- Authentication API ---------------- */

export const authApi = {
  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async register(input: { name: string; email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  logout() {
    session.clear();
  },
};

/* ---------------- Tasks API ---------------- */

export type MockScenario = "error" | "empty" | undefined;
export const accountApi = {
  get: () => request<User>("/auth/me"),
  update: (input: { name?: string; preferences?: Partial<Preferences> }) =>
    request<User>("/auth/me", { method: "PATCH", body: JSON.stringify(input) }),
  password: (input: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    request<AuthResponse>("/auth/password", { method: "PATCH", body: JSON.stringify(input) }),
  remove: (input: { currentPassword: string; confirmation: string }) =>
    request<{ message: string }>("/auth/account", {
      method: "DELETE",
      body: JSON.stringify(input),
    }),
};

export const tasksApi = {
  async list(scenario?: MockScenario): Promise<Task[]> {
    if (scenario === "error") {
      throw new ApiError("We couldn't load your tasks.", 503);
    }

    if (scenario === "empty") {
      return [];
    }

    return request<Task[]>("/tasks");
  },

  async create(input: TaskInput): Promise<Task> {
    return request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async update(id: string, input: Partial<TaskInput>): Promise<Task> {
    return request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async remove(id: string): Promise<void> {
    await request(`/tasks/${id}`, {
      method: "DELETE",
    });
  },
};
