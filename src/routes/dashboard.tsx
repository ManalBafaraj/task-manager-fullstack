import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/taskflow/AppShell";
import { DeleteTaskDialog } from "@/components/taskflow/DeleteTaskDialog";
import { SummaryCards } from "@/components/taskflow/SummaryCards";
import { TaskCard, TaskCardSkeleton, TaskGrid } from "@/components/taskflow/TaskCard";
import { TaskFormDialog } from "@/components/taskflow/TaskFormDialog";
import { EmptyState, ErrorState, NoResultsState } from "@/components/taskflow/TaskStates";
import { TaskToolbar } from "@/components/taskflow/TaskToolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi, session, tasksApi, type MockScenario, type User } from "@/lib/api";
import {
  countByStatus,
  filterTasks,
  type StatusFilter,
  type Task,
  type TaskInput,
} from "@/lib/tasks";

type DashboardSearch = { preview?: "error" | "empty" };

export const Route = createFileRoute("/dashboard")({
  // `?preview=empty` or `?preview=error` shows those states with mock data.
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    preview: search.preview === "error" || search.preview === "empty" ? search.preview : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Dashboard — TaskFlow" },
      { name: "description", content: "Your TaskFlow dashboard: track, search and manage tasks." },
      { property: "og:title", content: "Dashboard — TaskFlow" },
      {
        property: "og:description",
        content: "Your TaskFlow dashboard: track, search and manage tasks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const navigate = useNavigate();
  const { preview } = Route.useSearch();
  const queryClient = useQueryClient();
  const queryKey = ["tasks", preview ?? "default"] as const;

  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState("Hello");
  const [today, setToday] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  useEffect(() => {
    setUser(session.getUser());
    const now = new Date();
    setGreeting(greetingFor(now));
    setToday(
      now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    );
  }, []);

  const tasksQuery = useQuery({
    queryKey,
    queryFn: () => tasksApi.list(preview as MockScenario),
    retry: false,
  });

  const tasks = tasksQuery.data ?? [];
  const counts = useMemo(() => countByStatus(tasks), [tasks]);
  const visible = useMemo(() => filterTasks(tasks, query, status), [tasks, query, status]);
  const isLoading = tasksQuery.isPending;
  const isError = tasksQuery.isError;

  const setTasks = (updater: (prev: Task[]) => Task[]) =>
    queryClient.setQueryData<Task[]>(queryKey, (prev) => updater(prev ?? []));

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
        const updated = await tasksApi.update(editing._id, input);
        setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
        toast.success("Task updated", { description: "Your changes have been saved." });
      } else {
        const created = await tasksApi.create(input);
        setTasks((prev) => [created, ...prev]);
        toast.success("Task created", { description: `“${created.title}” was added.` });
      }
    } catch (err) {
      toast.error(editing ? "Couldn’t save changes" : "Couldn’t create task", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      throw err;
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await tasksApi.remove(task._id);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      toast.success("Task deleted");
    } catch (err) {
      toast.error("Couldn’t delete task", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      throw err;
    }
  };

  const handleRetry = () => {
    if (preview === "error") navigate({ to: "/dashboard", search: { preview: undefined } });
    else tasksQuery.refetch();
  };

  const handleLogout = () => {
    authApi.logout();
    toast.success("You’ve been logged out");
    navigate({ to: "/login" });
  };

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
  };

  const firstName = user?.name.split(" ")[0];
  const inProgress = counts["in-progress"];

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{today || "\u00A0"}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-[32px]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          {isLoading ? (
            <Skeleton className="mt-2 h-5 w-56 rounded-md" />
          ) : (
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              {isError
                ? "Let’s get your tasks back on screen."
                : tasks.length === 0
                  ? "A fresh start — what would you like to accomplish?"
                  : `You have ${inProgress} ${inProgress === 1 ? "task" : "tasks"} in progress.`}
            </p>
          )}
        </div>
        <Button size="lg" onClick={openCreate} className="w-full sm:w-auto">
          <Plus /> Add Task
        </Button>
      </header>

      <div className="mt-8">
        <SummaryCards counts={isError ? undefined : counts} loading={isLoading || isError} />
      </div>

      <section aria-labelledby="tasks-heading" className="mt-10">
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
          disabled={isLoading || isError || tasks.length === 0}
        />

        <div className="mt-5" aria-busy={isLoading}>
          {isLoading ? (
            <>
              <span className="sr-only" role="status">
                Loading tasks…
              </span>
              <TaskGrid>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TaskCardSkeleton key={i} />
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
                <TaskCard key={task._id} task={task} onEdit={openEdit} onDelete={setDeleting} />
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
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
