import { useAccount } from "@/hooks/use-account";
import { useTaskActions } from "@/hooks/use-task-actions";
import { dashboardPhrase } from "@/lib/dashboard-copy";
import { dateKey } from "@/lib/planning";
import { requireSession } from "@/lib/auth-guard";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/taskflow/AppShell";
import { DeleteTaskDialog } from "@/components/taskflow/DeleteTaskDialog";
import { SummaryCards } from "@/components/taskflow/SummaryCards";
import { NextMove } from "@/components/taskflow/NextMove";
import { useFocusSession } from "@/hooks/use-focus-session";
import { TaskCard, TaskCardSkeleton, TaskGrid } from "@/components/taskflow/TaskCard";
import { TaskFormDialog } from "@/components/taskflow/TaskFormDialog";
import { EmptyState, ErrorState, NoResultsState } from "@/components/taskflow/TaskStates";
import {
  TaskToolbar,
  type CategoryFilter,
  type DueDateFilter,
  type PriorityFilter,
} from "@/components/taskflow/TaskToolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { authApi, session, tasksApi, type User } from "@/lib/api";
import {
  countByStatus,
  filterTasks,
  type StatusFilter,
  type Task,
  type TaskInput,
} from "@/lib/tasks";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      {
        title: "Dashboard - TaskFlow",
      },
      {
        name: "description",
        content: "Track, search and manage your TaskFlow tasks.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: DashboardPage,
});

function greetingFor(date: Date) {
  const hour = date.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function parseDueDate(value: string | null) {
  if (!value) return null;

  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function matchesDueDate(task: Task, filter: DueDateFilter) {
  if (filter === "all") {
    return true;
  }

  const dueDate = parseDueDate(task.dueDate);

  if (filter === "no-date") {
    return dueDate === null;
  }

  if (!dueDate) {
    return false;
  }

  const today = startOfLocalDay(new Date());
  const taskDate = startOfLocalDay(dueDate);

  if (filter === "today") {
    return taskDate.getTime() === today.getTime();
  }

  if (filter === "overdue") {
    return task.status !== "completed" && taskDate.getTime() < today.getTime();
  }

  if (filter === "upcoming") {
    return taskDate.getTime() > today.getTime();
  }

  return true;
}

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queryKey = ["tasks"] as const;

  const { user } = useAccount();
  const updateTask = useTaskActions();
  const [localDate, setLocalDate] = useState("");
  const [greeting, setGreeting] = useState("Hello");
  const [today, setToday] = useState("");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [dueDate, setDueDate] = useState<DueDateFilter>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const { startFocus, chooseTask } = useFocusSession();

  useEffect(() => {
    const now = new Date();
    setLocalDate(dateKey(now));

    setGreeting(greetingFor(now));

    setToday(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  const tasksQuery = useQuery({
    queryKey,
    queryFn: () => tasksApi.list(),
    enabled: Boolean(user),
    retry: false,
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const counts = useMemo(() => countByStatus(tasks), [tasks]);

  const visible = useMemo(() => {
    const searchedTasks = filterTasks(tasks, query, status);

    return searchedTasks.filter((task) => {
      const matchesPriority = priority === "all" || task.priority === priority;

      const matchesCategory = category === "all" || task.category === category;

      const matchesDate = matchesDueDate(task, dueDate);

      return matchesPriority && matchesCategory && matchesDate;
    });
  }, [tasks, query, status, priority, category, dueDate]);

  const isLoading = tasksQuery.isPending;
  const isError = tasksQuery.isError;

  const setTasks = (updater: (previous: Task[]) => Task[]) => {
    queryClient.setQueryData<Task[]>(queryKey, (previous) => updater(previous ?? []));
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setFormOpen(true);
  };

  const handleSubmit = async (input: TaskInput) => {
    try {
      if (editing) {
        const updated = await updateTask(editing, input);

        setTasks((previous) => previous.map((task) => (task._id === updated._id ? updated : task)));

        if (
          editing.status === input.status ||
          (input.status !== "completed" &&
            !(editing.status === "completed" && input.status === "pending"))
        )
          toast.success("Task updated", {
            description: "Your changes have been saved.",
          });
      } else {
        const created = await tasksApi.create(input);

        setTasks((previous) => [created, ...previous]);

        toast.success("Task created", {
          description: `${created.title} was added.`,
        });
      }
    } catch (error) {
      toast.error(editing ? "Could not update task" : "Could not create task", {
        description: error instanceof Error ? error.message : "Please try again.",
      });

      throw error;
    }
  };
  const handleToggleChecklist = async (task: Task, itemIndex: number) => {
    const checklist = (task.checklist ?? []).map((item, index) =>
      index === itemIndex
        ? {
            ...item,
            completed: !item.completed,
          }
        : item,
    );

    try {
      const updated = await updateTask(task, { checklist });

      setTasks((previous) => previous.map((item) => (item._id === updated._id ? updated : item)));
    } catch (error) {
      toast.error("Could not update checklist", {
        description: error instanceof Error ? error.message : "Please try again.",
      });

      throw error;
    }
  };
  const handleDelete = async (task: Task) => {
    try {
      await tasksApi.remove(task._id);

      setTasks((previous) => previous.filter((item) => item._id !== task._id));

      toast.success("Task deleted");
    } catch (error) {
      toast.error("Could not delete task", {
        description: error instanceof Error ? error.message : "Please try again.",
      });

      throw error;
    }
  };

  const handleRetry = () => {
    tasksQuery.refetch();
  };

  const handleQuickUpdate = updateTask;

  const handleLogout = () => {
    authApi.logout();

    toast.success("You have been logged out");

    navigate({
      to: "/",
    });
  };

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setPriority("all");
    setCategory("all");
    setDueDate("all");
  };

  const firstName = user?.name.split(" ")[0];

  const contextCopy = dashboardPhrase(counts, user?.id ?? "guest", localDate);

  return (
    <AppShell user={user} tasks={tasks} onLogout={handleLogout}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <time dateTime={localDate}>{today || "\u00A0"}</time>
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-[32px]">
            {greeting}
            {firstName && (
              <>
                ,{" "}
                <span className="text-primary" dir="auto">
                  {firstName}
                </span>
              </>
            )}
          </h1>

          {isLoading ? (
            <Skeleton className="mt-2 h-5 w-56 rounded-md" />
          ) : (
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              {isError ? "Let us get your tasks back on screen." : contextCopy}
            </p>
          )}
        </div>

        <Button size="lg" onClick={openCreate} className="h-[54px] w-full sm:h-12 sm:w-auto">
          <Plus />
          Add Task
        </Button>
      </header>

      <div className="mt-6">{!isError && <SummaryCards counts={counts} loading={isLoading} />}</div>

      {!isLoading && !isError && (
        <NextMove
          tasks={tasks}
          onOpen={openEdit}
          onFocus={startFocus}
          onChooseFocus={chooseTask}
          onUpdate={(task, changes) => handleQuickUpdate(task, changes).then(() => {})}
        />
      )}

      <section aria-labelledby="tasks-heading" className="mt-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="tasks-heading" className="text-lg font-bold tracking-tight text-foreground">
            My tasks
          </h2>

          {!isLoading && !isError && tasks.length > 0 && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Showing {visible.length} of {tasks.length}
            </p>
          )}
        </div>

        <TaskToolbar
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
          category={category}
          onCategoryChange={setCategory}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          onClear={clearFilters}
          disabled={isLoading || isError || tasks.length === 0}
        />

        <div className="mt-5" aria-busy={isLoading}>
          {isLoading ? (
            <>
              <span className="sr-only" role="status">
                Loading tasks...
              </span>

              <TaskGrid>
                {Array.from({
                  length: 6,
                }).map((_, index) => (
                  <TaskCardSkeleton key={index} />
                ))}
              </TaskGrid>
            </>
          ) : isError ? (
            <ErrorState onRetry={handleRetry} retrying={tasksQuery.isFetching} />
          ) : tasks.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : visible.length === 0 ? (
            <NoResultsState query={query.trim()} onClear={clearFilters} />
          ) : (
            <TaskGrid>
              {visible.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                  onFocus={startFocus}
                  onStatusChange={(task, status) => updateTask(task, { status }).then(() => {})}
                  onToggleChecklist={handleToggleChecklist}
                />
              ))}
            </TaskGrid>
          )}
        </div>
      </section>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        onSubmit={handleSubmit}
      />

      <DeleteTaskDialog
        task={deleting}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
