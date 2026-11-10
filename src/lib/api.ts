/**
 * API client for TaskFlow.
 *
 * All authentication and task requests pass through this file.
 */

import type { Task, TaskInput } from "./tasks";

export const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3000";

const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";

export interface User {
  id: string;
  _id?: string;
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
  },

  clear() {
    if (typeof window === "undefined") {
      return;
    }

    for (const selectedStorage of [localStorage, sessionStorage]) {
      selectedStorage.removeItem(TOKEN_KEY);
      selectedStorage.removeItem(USER_KEY);
    }
  },
};

/* ---------------- Request helper ---------------- */

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = session.getToken();

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(body?.message ?? "Something went wrong.", response.status);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError("Unable to connect to the server. Please try again.", 503);
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

  async update(id: string, input: TaskInput): Promise<Task> {
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
