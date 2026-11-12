import { useAccount } from "@/hooks/use-account";
import { requireSession } from "@/lib/auth-guard";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, CalendarClock, CheckCheck, Clock3, Repeat2 } from "lucide-react";

import { AppShell } from "@/components/taskflow/AppShell";
import {
  buildNotifications,
  type TaskNotification,
} from "@/components/taskflow/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi, session, tasksApi, type User } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      {
        title: "Notifications - TaskFlow",
      },
      {
        name: "description",
        content: "View and manage your TaskFlow notifications.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: NotificationsPage,
});

type NotificationFilter = "all" | "unread";

const LEVEL_STYLES: Record<TaskNotification["level"], string> = {
  overdue: "bg-rose-50 text-rose-600 ring-rose-100",
  today: "bg-amber-50 text-amber-600 ring-amber-100",
  tomorrow: "bg-blue-50 text-blue-600 ring-blue-100",
  soon: "bg-violet-50 text-violet-600 ring-violet-100",
  daily: "bg-emerald-50 text-emerald-600 ring-emerald-100",
};

function NotificationIcon({ level }: { level: TaskNotification["level"] }) {
  const className = "h-5 w-5";

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

function NotificationsPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<NotificationFilter>("all");

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.list(),
    enabled: Boolean(user),
    retry: false,
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const { preferences } = useAccount();
  const notifications = useMemo(
    () => buildNotifications(preferences.remindersEnabled ? tasks : []),
    [tasks, preferences.remindersEnabled],
  );

  const storageKey = `taskflow_read_notifications_${user?.email ?? "guest"}`;

  useEffect(() => {
    setUser(session.getUser());
  }, []);

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

  const visibleNotifications =
    filter === "unread"
      ? notifications.filter((notification) => !readIds.has(notification.id))
      : notifications;

  const handleLogout = () => {
    authApi.logout();

    navigate({
      to: "/",
    });
  };

  return (
    <AppShell user={user} tasks={tasks} onLogout={handleLogout}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Bell className="h-5 w-5" />
            </span>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[32px]">
                Notifications
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Stay updated on your task reminders.
              </p>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck />
            Mark all as read
          </Button>
        )}
      </header>

      <section className="mt-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-xl border bg-card p-1 shadow-soft">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "h-9 rounded-lg px-4 text-sm font-medium transition-colors",
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "h-9 rounded-lg px-4 text-sm font-medium transition-colors",
                filter === "unread"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {tasksQuery.isPending ? (
          <div className="space-y-3">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div key={index} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex gap-4">
                  <Skeleton className="h-11 w-11 rounded-xl" />

                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tasksQuery.isError ? (
          <div className="rounded-2xl border bg-card px-6 py-12 text-center shadow-soft">
            <p className="font-semibold text-foreground">Could not load notifications</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Please check your connection and try again.
            </p>

            <Button className="mt-5" onClick={() => tasksQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="rounded-3xl border bg-card px-6 py-16 text-center shadow-soft">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              {filter === "unread" ? (
                <CheckCheck className="h-6 w-6" />
              ) : (
                <Bell className="h-6 w-6" />
              )}
            </span>

            <h2 className="mt-4 text-base font-semibold text-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {filter === "unread"
                ? "You are all caught up."
                : "Enable a reminder on a task and notifications will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => {
              const isRead = readIds.has(notification.id);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "flex w-full gap-4 rounded-2xl border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift",
                    !isRead && "border-primary/20 bg-primary-soft/20",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1",
                      LEVEL_STYLES[notification.level],
                    )}
                  >
                    <NotificationIcon level={notification.level} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-3">
                      <span className="flex-1 text-sm font-semibold text-foreground sm:text-base">
                        {notification.title}
                      </span>

                      {!isRead && (
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </span>

                    <span className="mt-1 block text-sm text-muted-foreground">
                      {notification.message}
                    </span>

                    <span className="mt-2 block text-xs font-medium text-muted-foreground">
                      {notification.displayText}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
