import { useTaskActions } from "@/hooks/use-task-actions";
import { requireSession } from "@/lib/auth-guard";
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameMonth, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/taskflow/AppShell";
import { TaskFormDialog } from "@/components/taskflow/TaskFormDialog";
import { ErrorState } from "@/components/taskflow/TaskStates";
import { StatusBadge } from "@/components/taskflow/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authApi, session, tasksApi, type User } from "@/lib/api";
import { dateKey, groupTasksByDate, monthDays, moveCalendar, weekDays } from "@/lib/planning";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  STATUS_LABELS,
  type Task,
  type TaskInput,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Calendar - TaskFlow" },
      { name: "description", content: "Make room for your day with the TaskFlow agenda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const navigate = useNavigate();
  const updateTask = useTaskActions();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState(new Date());
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [monthOpen, setMonthOpen] = useState(false);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  useEffect(() => setUser(session.getUser()), []);
  const query = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.list(),
    enabled: Boolean(user),
    retry: false,
  });
  const tasks = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (status === "all" || t.status === status) &&
          (priority === "all" || t.priority === priority) &&
          (category === "all" || t.category === category),
      ),
    [tasks, status, priority, category],
  );
  const grouped = useMemo(() => groupTasksByDate(filtered), [filtered]);
  const selectedTasks = [...(grouped.get(dateKey(selected)) ?? [])].sort((a, b) =>
    (a.reminderEnabled ? a.reminderTime : "99").localeCompare(
      b.reminderEnabled ? b.reminderTime : "99",
    ),
  );
  const choose = (date: Date) => {
    setSelected(date);
    setMonth(startOfMonth(date));
  };
  const shift = (amount: number, view: "week" | "month") => {
    const next = moveCalendar(view === "week" ? selected : month, amount, view);
    choose(next);
  };
  const addTask = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const edit = (task: Task) => {
    setEditing(task);
    setFormOpen(true);
  };
  const submit = async (input: TaskInput) => {
    const saved = editing ? await updateTask(editing, input) : await tasksApi.create(input);
    queryClient.setQueryData<Task[]>(["tasks"], (previous) =>
      editing
        ? (previous ?? []).map((t) => (t._id === saved._id ? saved : t))
        : [saved, ...(previous ?? [])],
    );
  };
  const filters = [
    {
      label: "Status",
      value: status,
      change: setStatus,
      options: TASK_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
    },
    {
      label: "Priority",
      value: priority,
      change: setPriority,
      options: TASK_PRIORITIES.map((value) => ({
        value,
        label: `${value[0]?.toUpperCase()}${value.slice(1)} priority`,
      })),
    },
    {
      label: "Category",
      value: category,
      change: setCategory,
      options: TASK_CATEGORIES.map((value) => ({ value, label: value })),
    },
  ];
  const compactMonth = (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          onClick={() => setMonth(moveCalendar(month, -1, "month"))}
        >
          <ChevronLeft />
        </Button>
        <span dir="auto" className="text-sm font-semibold">
          {format(month, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next month"
          onClick={() => setMonth(moveCalendar(month, 1, "month"))}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="py-2 text-muted-foreground">
            {d}
          </span>
        ))}
        {monthDays(month).map((day) => (
          <button
            type="button"
            key={dateKey(day)}
            aria-label={format(day, "MMMM d, yyyy")}
            aria-pressed={dateKey(day) === dateKey(selected)}
            className={cn(
              "min-h-11 rounded-lg text-sm",
              !isSameMonth(day, month) && "text-muted-foreground",
              dateKey(day) === dateKey(selected) && "bg-primary text-white",
            )}
            onClick={() => {
              choose(day);
              setMonthOpen(false);
            }}
          >
            {format(day, "d")}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <AppShell
      user={user}
      tasks={tasks}
      onLogout={() => {
        authApi.logout();
        void navigate({ to: "/" });
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">A LITTLE STRUCTURE, MORE SPACE</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your calendar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Deadlines in view. A day you can work with.
          </p>
        </div>
        <Button onClick={addTask}>
          <Plus /> Add task
        </Button>
      </header>
      <div className="my-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {filters.map((f, index) => (
          <div key={f.label} className={index === 2 ? "col-span-2 min-w-0" : "min-w-0"}>
            <Select value={f.value} onValueChange={f.change}>
              <SelectTrigger
                aria-label={`Filter by ${f.label.toLowerCase()}`}
                className="h-11 w-full min-w-0 sm:w-auto sm:min-w-[130px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">
                  All{" "}
                  {f.label.toLowerCase() === "status"
                    ? "statuses"
                    : f.label.toLowerCase() === "category"
                      ? "categories"
                      : "priorities"}
                </SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {(status !== "all" || priority !== "all" || category !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatus("all");
              setPriority("all");
              setCategory("all");
            }}
          >
            Reset
          </Button>
        )}
      </div>
      {query.isPending ? (
        <div role="status" aria-label="Loading calendar">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{format(month, "MMMM yyyy")}</h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" onClick={() => choose(new Date())}>
                Today
              </Button>
              <div className="hidden md:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => shift(-1, "month")}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => shift(1, "month")}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="md:hidden">
                <Popover open={monthOpen} onOpenChange={setMonthOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarDays /> Month
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    collisionPadding={12}
                    className="w-[min(22rem,calc(100vw-1.5rem))] p-2"
                  >
                    {compactMonth}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="calendar-layout grid items-start gap-6">
            <section
              aria-label="Month calendar"
              className="hidden min-w-0 overflow-hidden rounded-xl border bg-card md:block"
            >
              <div className="grid grid-cols-7 border-b">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <p key={d} className="py-3 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDays(month).map((day) => {
                  const key = dateKey(day);
                  const entries = grouped.get(key) ?? [];
                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-[112px] min-w-0 border-b border-r p-1.5",
                        !isSameMonth(day, month) && "bg-muted/40",
                        key === dateKey(selected) && "bg-primary-soft/50",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={`Select ${format(day, "MMMM d, yyyy")}`}
                        aria-pressed={key === dateKey(selected)}
                        onClick={() => choose(day)}
                        className={cn(
                          "mb-1 grid h-11 w-11 place-items-center rounded-lg text-xs",
                          key === dateKey(new Date()) &&
                            "font-bold text-primary-dark ring-1 ring-inset ring-primary",
                          key === dateKey(selected) && "bg-primary text-white ring-0",
                        )}
                      >
                        {format(day, "d")}
                      </button>
                      {entries.slice(0, 2).map((t) => (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => edit(t)}
                          className={cn(
                            "mb-1 block min-h-7 w-full truncate rounded border-l-2 px-1.5 py-1 text-left text-[11px]",
                            t.status === "completed"
                              ? "border-completed-strong bg-completed-soft text-completed-strong"
                              : t.priority === "high"
                                ? "border-rose-600 bg-rose-50 text-rose-800"
                                : t.status === "in-progress"
                                  ? "border-progress-strong bg-progress-soft text-progress-strong"
                                  : "border-pending-strong bg-pending-soft text-pending-strong",
                          )}
                          title={`${t.title} - ${STATUS_LABELS[t.status]} - ${t.priority} priority`}
                        >
                          {t.title}
                        </button>
                      ))}
                      {entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => choose(day)}
                          className="min-h-8 px-1 text-xs text-muted-foreground"
                        >
                          +{entries.length - 2} more
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            <section
              aria-label="Week calendar"
              className="md:hidden"
              onTouchStart={(e) => {
                touchStart.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                const end = e.changedTouches[0]?.clientX;
                if (
                  touchStart.current !== null &&
                  end !== undefined &&
                  Math.abs(end - touchStart.current) > 50
                )
                  shift(end < touchStart.current ? 1 : -1, "week");
                touchStart.current = null;
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous week"
                  onClick={() => shift(-1, "week")}
                >
                  <ChevronLeft />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Week of {format(weekDays(selected)[0]!, "MMM d")}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next week"
                  onClick={() => shift(1, "week")}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays(selected).map((day) => {
                  const key = dateKey(day);
                  return (
                    <button
                      type="button"
                      key={key}
                      aria-label={format(day, "EEEE, MMMM d")}
                      aria-pressed={key === dateKey(selected)}
                      onClick={() => choose(day)}
                      className={cn(
                        "min-h-[76px] min-w-0 rounded-xl py-2 text-center",
                        key === dateKey(selected) ? "bg-primary text-white" : "bg-card",
                        key === dateKey(new Date()) &&
                          key !== dateKey(selected) &&
                          "ring-1 ring-inset ring-primary",
                      )}
                    >
                      <span className="block text-[10px]">{format(day, "EEEEE")}</span>
                      <span className="my-1 block text-lg font-medium">{format(day, "d")}</span>
                      <span className="block text-[10px]">
                        {grouped.get(key)?.length ?? 0} tasks
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section aria-labelledby="agenda-heading" className="min-w-0">
              <div className="mb-4 flex items-center justify-between border-b pb-4">
                <div>
                  <p className="eyebrow">THE DAY AHEAD</p>
                  <h2 id="agenda-heading" className="mt-1 text-lg font-semibold">
                    {format(selected, "EEE, MMM d")}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Add task on selected date"
                  onClick={addTask}
                >
                  <Plus />
                </Button>
              </div>
              {selectedTasks.length ? (
                <div className="space-y-1">
                  {selectedTasks.map((t) => (
                    <button
                      type="button"
                      key={t._id}
                      onClick={() => edit(t)}
                      className="flex w-full gap-3 rounded-lg py-4 pr-2 text-left hover:bg-muted"
                    >
                      <div className="w-14 shrink-0 border-r pr-2 text-xs tabular-nums text-muted-foreground">
                        {t.reminderEnabled ? (
                          <>
                            <span className="block">
                              {format(new Date(`2000-01-01T${t.reminderTime}`), "h:mm a")}
                            </span>
                            <span className="mt-1 block text-[10px]">Reminder</span>
                          </>
                        ) : (
                          "Any time"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">{t.title}</p>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {t.priority} priority · {t.category}
                        </p>
                        <div className="mt-2">
                          <StatusBadge status={t.status} />
                        </div>
                        {t.checklist.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t.checklist.filter((i) => i.completed).length}/{t.checklist.length}{" "}
                            steps complete
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border-l-2 py-6 pl-4">
                  <p className="font-medium">A little breathing room.</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    No tasks scheduled for this date.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={addTask}>
                    <Plus /> Plan something
                  </Button>
                </div>
              )}
            </section>
          </div>
          {filtered.some((t) => !t.dueDate) && (
            <section className="mt-8 border-t pt-5">
              <h2 dir="auto" className="text-sm font-semibold">
                Not scheduled yet
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {filtered
                  .filter((t) => !t.dueDate)
                  .map((t) => (
                    <Button
                      key={t._id}
                      variant="outline"
                      className="max-w-full"
                      onClick={() => edit(t)}
                    >
                      <span className="truncate">{t.title}</span>
                    </Button>
                  ))}
              </div>
            </section>
          )}
        </>
      )}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        initialDueDate={dateKey(selected)}
        onSubmit={submit}
      />
    </AppShell>
  );
}
