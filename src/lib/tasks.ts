// Task domain model and validation helpers.

export const TASK_STATUSES = ["pending", "in-progress", "completed"] as const;

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export const TASK_CATEGORIES = ["General", "Work", "Personal", "Study", "Health"] as const;

export const REMINDER_TYPES = ["daily", "before-due"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export type ReminderType = (typeof REMINDER_TYPES)[number];

export type StatusFilter = "all" | TaskStatus;
export interface ChecklistItem {
  _id?: string | undefined;
  text: string;
  completed: boolean;
}
export interface Task {
  _id: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string | null;
  reminderEnabled: boolean;
  reminderType: ReminderType;
  reminderTime: string;
  createdAt: string;
  updatedAt?: string | undefined;
}

export interface TaskInput {
  title: string;
  description: string;
  checklist: ChecklistItem[];
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string | null;
  reminderEnabled: boolean;
  reminderType: ReminderType;
  reminderTime: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const REMINDER_LABELS: Record<ReminderType, string> = {
  daily: "Daily",
  "before-due": "Before due date",
};

export const FILTER_OPTIONS: {
  value: StatusFilter;
  label: string;
}[] = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "in-progress",
    label: "In Progress",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && (TASK_PRIORITIES as readonly string[]).includes(value);
}

export function isTaskCategory(value: unknown): value is TaskCategory {
  return typeof value === "string" && (TASK_CATEGORIES as readonly string[]).includes(value);
}

export function isReminderType(value: unknown): value is ReminderType {
  return typeof value === "string" && (REMINDER_TYPES as readonly string[]).includes(value);
}

export function filterTasks(tasks: Task[], query: string, status: StatusFilter): Task[] {
  const normalizedQuery = query.trim().toLowerCase();

  return tasks.filter((task) => {
    if (status !== "all" && task.status !== status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      task.title.toLowerCase().includes(normalizedQuery) ||
      task.description.toLowerCase().includes(normalizedQuery) ||
      (task.category ?? "").toLowerCase().includes(normalizedQuery) ||
      (task.priority ?? "").toLowerCase().includes(normalizedQuery)
    );
  });
}

export function countByStatus(tasks: Task[]) {
  return {
    all: tasks.length,
    pending: tasks.filter((task) => task.status === "pending").length,
    "in-progress": tasks.filter((task) => task.status === "in-progress").length,
    completed: tasks.filter((task) => task.status === "completed").length,
  };
}

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;

export type TaskErrors = Partial<Record<keyof TaskInput, string>>;

export function validateTask(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  const title = input.title.trim();

  if (!title) {
    errors.title = "Please enter a task title.";
  } else if (title.length < 3) {
    errors.title = "Title must be at least 3 characters.";
  } else if (title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  }

  if (input.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }

  if (!isTaskStatus(input.status)) {
    errors.status = "Please choose a valid status.";
  }

  if (!isTaskPriority(input.priority)) {
    errors.priority = "Please choose a valid priority.";
  }

  if (!isTaskCategory(input.category)) {
    errors.category = "Please choose a valid category.";
  }

  if (input.reminderEnabled && !isReminderType(input.reminderType)) {
    errors.reminderType = "Please choose a reminder type.";
  }

  if (input.reminderEnabled && input.reminderType === "before-due" && !input.dueDate) {
    errors.dueDate = "Choose a due date for this reminder.";
  }

  if (input.reminderEnabled && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(input.reminderTime)) {
    errors.reminderTime = "Please choose a valid reminder time.";
  }
  const checklist = input.checklist ?? [];

  if (checklist.length > 20) {
    errors.checklist = "A task can have up to 20 checklist items.";
  } else if (checklist.some((item) => !item.text.trim())) {
    errors.checklist = "Checklist items cannot be empty.";
  } else if (checklist.some((item) => item.text.trim().length > 120)) {
    errors.checklist = "Each checklist item must be 120 characters or fewer.";
  }
  return errors;
}
