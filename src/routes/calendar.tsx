import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Folder, ListTodo } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/taskflow/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi, session, tasksApi, type User } from "@/lib/api";
import type { Task, TaskPriority, TaskStatus } from "@/lib/tasks";
import { cn } from "@/lib/utils";

type CalendarStatusFilter = "all" | TaskStatus;
type CalendarPriorityFilter = "all" | TaskPriority;

const STATUS_OPTIONS: {
  value: CalendarStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS: {
  value: CalendarPriorityFilter;
  label: string;
}[] = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low priority" },
  { value: "medium", label: "Medium priority" },
  { value: "high", label: "High priority" },
];

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const STATUS_DOT_STYLES: Record<TaskStatus, string> = {
  pending: "bg-amber-500",
  "in-progress": "bg-blue-500",
  completed: "bg-emerald-500",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "text-emerald-700",
  medium: "text-amber-700",
  high: "text-rose-700",
};

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      {
        title: "Calendar - TaskFlow",
      },
      {
        name: "description",
        content: "View and organize your tasks by due date.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: CalendarPage,
});

function parseDueDate(value: string | null) {
  if (!value) return null;

  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function taskDateKey(task: Task) {
  const date = parseDueDate(task.dueDate);

  return date ? format(date, "yyyy-MM-dd") : null;
}

function CalendarPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [status, setStatus] = useState<CalendarStatusFilter>("all");
  const [priority, setPriority] = useState<CalendarPriorityFilter>("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    setUser(session.getUser());
  }, []);

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.list(),
    retry: false,
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(tasks.map((task) => task.category).filter((value) => Boolean(value))),
    ).sort((first, second) => first.localeCompare(second));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = status === "all" || task.status === status;

      const matchesPriority = priority === "all" || task.priority === priority;

      const matchesCategory = category === "all" || task.category === category;

      return matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tasks, status, priority, category]);

  const calendarDays = useMemo(() => {
    const firstDay = startOfWeek(startOfMonth(currentMonth));
    const lastDay = endOfWeek(endOfMonth(currentMonth));

    return eachDayOfInterval({
      start: firstDay,
      end: lastDay,
    });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    filteredTasks.forEach((task) => {
      const key = taskDateKey(task);

      if (!key) return;

      const existing = map.get(key) ?? [];

      map.set(key, [...existing, task]);
    });

    return map;
  }, [filteredTasks]);

  const selectedTasks = useMemo(() => {
    const key = format(selectedDate, "yyyy-MM-dd");

    return tasksByDate.get(key) ?? [];
  }, [tasksByDate, selectedDate]);

  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter((task) => taskDateKey(task) === null);
  }, [filteredTasks]);

  const goToPreviousMonth = () => {
    const previousMonth = subMonths(currentMonth, 1);

    setCurrentMonth(previousMonth);
    setSelectedDate(startOfMonth(previousMonth));
  };

  const goToNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);

    setCurrentMonth(nextMonth);
    setSelectedDate(startOfMonth(nextMonth));
  };

  const goToToday = () => {
    const today = new Date();

    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
  };

  const handleLogout = () => {
    authApi.logout();

    toast.success("You have been logged out");

    navigate({
      to: "/login",
    });
  };

  return (
    <AppShell user={user} tasks={tasks} onLogout={handleLogout}>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <CalendarDays className="h-5 w-5" />
          </span>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[32px]">
              Calendar
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Plan your tasks and keep track of deadlines.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-7 flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as CalendarStatusFilter)}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          aria-label="Filter calendar by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as CalendarPriorityFilter)}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          aria-label="Filter calendar by priority"
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          aria-label="Filter calendar by category"
        >
          <option value="all">All categories</option>

          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {(status !== "all" || priority !== "all" || category !== "all") && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStatus("all");
              setPriority("all");
              setCategory("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {tasksQuery.isPending ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[620px] rounded-3xl" />
          <Skeleton className="h-[360px] rounded-3xl" />
        </div>
      ) : tasksQuery.isError ? (
        <div className="mt-6 rounded-3xl border bg-card px-6 py-16 text-center shadow-soft">
          <p className="font-semibold text-foreground">Could not load your calendar</p>

          <p className="mt-2 text-sm text-muted-foreground">
            Please check the connection and try again.
          </p>

          <Button className="mt-5" onClick={() => tasksQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section
              className="overflow-hidden rounded-3xl border bg-card shadow-soft"
              aria-label="Monthly calendar"
            >
              <div className="flex flex-col gap-4 border-b px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {format(currentMonth, "MMMM yyyy")}
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Select a day to view its tasks.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={goToPreviousMonth}
                    aria-label="Previous month"
                  >
                    <ChevronLeft />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={goToNextMonth}
                    aria-label="Next month"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b bg-muted/40">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayTasks = tasksByDate.get(key) ?? [];
                  const selected = isSameDay(day, selectedDate);
                  const today = isSameDay(day, new Date());
                  const current = isSameMonth(day, currentMonth);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day);

                        if (!isSameMonth(day, currentMonth)) {
                          setCurrentMonth(startOfMonth(day));
                        }
                      }}
                      className={cn(
                        "relative min-h-[76px] border-b border-r p-2 text-left transition-colors",
                        "sm:min-h-[112px] sm:p-3",
                        "hover:bg-accent/60",
                        !current && "bg-muted/25 text-muted-foreground opacity-60",
                        selected && "z-10 bg-primary-soft ring-2 ring-inset ring-primary",
                      )}
                      aria-label={`${format(day, "MMMM d, yyyy")}, ${dayTasks.length} tasks`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            "grid h-7 w-7 place-items-center rounded-full text-xs font-semibold",
                            today && "bg-primary text-primary-foreground",
                            selected && !today && "text-primary",
                          )}
                        >
                          {format(day, "d")}
                        </span>

                        {dayTasks.length > 0 && (
                          <span className="text-[10px] font-semibold text-primary sm:text-xs">
                            {dayTasks.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 hidden space-y-1 sm:block">
                        {dayTasks.slice(0, 2).map((task) => (
                          <div
                            key={task._id}
                            className="flex items-center gap-1.5 rounded-md bg-muted/70 px-1.5 py-1"
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                STATUS_DOT_STYLES[task.status],
                              )}
                            />

                            <span className="truncate text-[10px] font-medium text-foreground">
                              {task.title}
                            </span>
                          </div>
                        ))}

                        {dayTasks.length > 2 && (
                          <p className="px-1 text-[10px] text-muted-foreground">
                            +{dayTasks.length - 2} more
                          </p>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
                        {dayTasks.slice(0, 3).map((task) => (
                          <span
                            key={task._id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              STATUS_DOT_STYLES[task.status],
                            )}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-3xl border bg-card p-5 shadow-soft xl:sticky xl:top-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Selected day
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-foreground">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </h2>
                </div>

                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                  {selectedTasks.length}
                </span>
              </div>

              {selectedTasks.length === 0 ? (
                <div className="py-14 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                    <CalendarDays className="h-5 w-5" />
                  </span>

                  <p className="mt-4 text-sm font-semibold text-foreground">No tasks on this day</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Select another date to view its tasks.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {selectedTasks.map((task) => (
                    <div key={task._id} className="rounded-2xl border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-semibold",
                            STATUS_STYLES[task.status],
                          )}
                        >
                          {task.status === "in-progress"
                            ? "In Progress"
                            : task.status === "pending"
                              ? "Pending"
                              : "Completed"}
                        </span>

                        <span
                          className={cn(
                            "text-xs font-semibold capitalize",
                            PRIORITY_STYLES[task.priority],
                          )}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-foreground">{task.title}</h3>

                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Folder className="h-3.5 w-3.5" />
                        {task.category}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>

          <section className="mt-8 rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Clock3 className="h-4 w-4" />
              </span>

              <div>
                <h2 className="font-bold text-foreground">Unscheduled tasks</h2>

                <p className="text-xs text-muted-foreground">
                  Tasks that do not have a due date yet.
                </p>
              </div>

              <span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {unscheduledTasks.length}
              </span>
            </div>

            {unscheduledTasks.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                All filtered tasks have a due date.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {unscheduledTasks.map((task) => (
                  <div key={task._id} className="rounded-2xl border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                        <ListTodo className="h-4 w-4" />
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {task.title}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {task.category} · {task.priority} priority
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
