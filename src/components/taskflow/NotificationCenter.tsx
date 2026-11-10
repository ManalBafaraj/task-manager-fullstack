import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarClock, CheckCheck, Clock3, Repeat2 } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

type NotificationLevel = "overdue" | "today" | "tomorrow" | "soon" | "daily";

export interface TaskNotification {
  id: string;
  taskId: string;
  title: string;
  message: string;
  level: NotificationLevel;
  displayText: string;
  sortDate: Date;
}

function parseDueDate(value: string | null) {
  if (!value) return null;

  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(value: string) {
  const [hourValue, minute = "00"] = value.split(":");

  const hour = Number(hourValue);

  if (Number.isNaN(hour)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;

  return `${formattedHour}:${minute} ${period}`;
}

function hasReachedReminderTime(reminderTime: string, now: Date) {
  const [hourValue, minuteValue] = reminderTime.split(":");

  const reminderHour = Number(hourValue);
  const reminderMinute = Number(minuteValue);

  if (Number.isNaN(reminderHour) || Number.isNaN(reminderMinute)) {
    return true;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const reminderMinutes = reminderHour * 60 + reminderMinute;

  return currentMinutes >= reminderMinutes;
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildNotifications(tasks: Task[]): TaskNotification[] {
  const now = new Date();
  const today = startOfDay(now);
  const currentDateKey = dateKey(now);
  const dayMilliseconds = 24 * 60 * 60 * 1000;

  return tasks
    .filter((task) => task.status !== "completed" && task.reminderEnabled === true)
    .flatMap<TaskNotification>((task): TaskNotification[] => {
      const reminderTime = task.reminderTime || "09:00";

      if (!hasReachedReminderTime(reminderTime, now)) {
        return [];
      }

      if (task.reminderType === "daily") {
        return [
          {
            id: `${task._id}-daily-${currentDateKey}`,
            taskId: task._id,
            title: task.title,
            message: "Daily reminder for this task.",
            level: "daily" as const,
            displayText: `Every day at ${formatTime(reminderTime)}`,
            sortDate: now,
          },
        ];
      }

      const dueDate = parseDueDate(task.dueDate);

      if (!dueDate) {
        return [];
      }

      const dueDay = startOfDay(dueDate);

      const difference = Math.round((dueDay.getTime() - today.getTime()) / dayMilliseconds);

      let level: "overdue" | "today" | "tomorrow" | "soon";

      let message: string;

      if (difference < 0) {
        const overdueDays = Math.abs(difference);

        level = "overdue";
        message = `Overdue by ${overdueDays} ${overdueDays === 1 ? "day" : "days"}.`;
      } else if (difference === 0) {
        level = "today";
        message = "This task is due today.";
      } else if (difference === 1) {
        level = "tomorrow";
        message = "This task is due tomorrow.";
      } else if (difference <= 3) {
        level = "soon";
        message = `This task is due in ${difference} days.`;
      } else {
        return [];
      }

      return [
        {
          id: `${task._id}-${level}`,
          taskId: task._id,
          title: task.title,
          message,
          level,
          displayText: `Due ${dueDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`,
          sortDate: dueDate,
        },
      ];
    })
    .sort((first, second) => first.sortDate.getTime() - second.sortDate.getTime());
}

const LEVEL_STYLES: Record<NotificationLevel, string> = {
  overdue: "bg-rose-50 text-rose-600 ring-rose-100",
  today: "bg-amber-50 text-amber-600 ring-amber-100",
  tomorrow: "bg-blue-50 text-blue-600 ring-blue-100",
  soon: "bg-violet-50 text-violet-600 ring-violet-100",
  daily: "bg-emerald-50 text-emerald-600 ring-emerald-100",
};

function NotificationIcon({ level }: { level: NotificationLevel }) {
  const className = "h-4 w-4";

  if (level === "overdue") {
    return <AlertTriangle className={className} />;
  }

  if (level === "today") {
    return <Clock3 className={className} />;
  }

  if (level === "daily") {
    return <Repeat2 className={className} />;
  }

  return <CalendarClock className={className} />;
}

export function NotificationCenter({
  tasks,
  userKey,
  mode = "icon",
}: {
  tasks: Task[];
  userKey: string;
  mode?: "icon" | "sidebar" | undefined;
}) {
  const notifications = useMemo(() => buildNotifications(tasks), [tasks]);

  const storageKey = `taskflow_read_notifications_${userKey}`;

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);

      const values = saved ? (JSON.parse(saved) as string[]) : [];

      setReadIds(new Set(values));
    } catch {
      setReadIds(new Set());
    }
  }, [storageKey]);

  const saveReadIds = (next: Set<string>) => {
    setReadIds(next);

    localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
  };

  const markAsRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(next);
  };

  const markAllAsRead = () => {
    const next = new Set(readIds);

    notifications.forEach((notification) => {
      next.add(notification.id);
    });

    saveReadIds(next);
  };

  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {mode === "sidebar" ? (
          <button
            type="button"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span className="relative">
              <Bell className="h-[18px] w-[18px]" />

              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>

            <span>Notifications</span>

            {unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount}
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-xl border bg-card text-muted-foreground shadow-soft transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell className="h-5 w-5" />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-card">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        side={mode === "sidebar" ? "right" : "bottom"}
        align={mode === "sidebar" ? "start" : "end"}
        sideOffset={10}
        className="w-[340px] overflow-hidden rounded-2xl border bg-card p-0 shadow-lift sm:w-[380px]"
      >
        <div className="flex items-center justify-between border-b px-4 py-3.5">
          <div>
            <h2 className="font-semibold text-foreground">Notifications</h2>

            <p className="text-xs text-muted-foreground">
              {unreadCount === 0
                ? "You are all caught up."
                : `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
                <Bell className="h-5 w-5" />
              </span>

              <p className="mt-3 text-sm font-semibold text-foreground">No notifications</p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Enable a reminder on a task to receive notifications.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const isRead = readIds.has(notification.id);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "flex w-full gap-3 border-b px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-accent/60",
                    !isRead && "bg-primary-soft/30",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1",
                      LEVEL_STYLES[notification.level],
                    )}
                  >
                    <NotificationIcon level={notification.level} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="line-clamp-1 flex-1 text-sm font-semibold text-foreground">
                        {notification.title}
                      </span>

                      {!isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </span>

                    <span className="mt-1 block text-xs text-muted-foreground">
                      {notification.message}
                    </span>

                    <span className="mt-1.5 block text-[11px] font-medium text-muted-foreground">
                      {notification.displayText}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
