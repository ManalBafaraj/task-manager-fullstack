// Task domain model + pure helpers. Status values match the REST API exactly.
export const TASK_STATUSES = ["pending", "in-progress", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type StatusFilter = "all" | TaskStatus;

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
};

export const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

export function filterTasks(tasks: Task[], query: string, status: StatusFilter): Task[] {
  const q = query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });
}

export function countByStatus(tasks: Task[]) {
  return {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };
}

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;

export type TaskErrors = Partial<Record<keyof TaskInput, string>>;

export function validateTask(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = "Please enter a task title.";
  else if (title.length < 3) errors.title = "Title must be at least 3 characters.";
  else if (title.length > TITLE_MAX) errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  if (input.description.trim().length > DESCRIPTION_MAX)
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  if (!isTaskStatus(input.status)) errors.status = "Please choose a valid status.";
  return errors;
}
