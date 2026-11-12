import { useAccount } from "@/hooks/use-account";
import { useTaskActions } from "@/hooks/use-task-actions";
import { prepareCompletionAudio, announceCompletion } from "@/lib/completion-alert";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { Check, ChevronUp, Pause, Play, Square, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FocusSessionContext } from "@/hooks/use-focus-session";
import { session, tasksApi, type User } from "@/lib/api";
import {
  claimCompletion,
  newSprint,
  pauseSprint,
  readSprint,
  remainingTime,
  saveSprint,
  startSprint,
  type SprintState,
} from "@/lib/planning";
import type { Task, TaskInput } from "@/lib/tasks";

export function FocusSessionProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isPrivate = ["/dashboard", "/calendar", "/notifications", "/settings"].includes(pathname);
  const { preferences } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const updateTask = useTaskActions();
  const [, tick] = useReducer((value) => value + 1, 0);
  const titleRestore = useRef<(() => void) | null>(null);
  const [record, setRecord] = useState<{ owner: string; state: SprintState } | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    setUser(session.getToken() ? session.getUser() : null);
  }, [pathname]);
  const owner = user?.id ?? user?._id ?? user?.email ?? null;
  const key = `taskflow_sprint_${owner}`; // Preserve existing saved sessions.
  const state = record?.owner === owner ? record.state : null;
  const query = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.list(),
    enabled: Boolean(owner) && isPrivate,
    retry: false,
  });
  const tasks = useMemo(() => query.data ?? [], [query.data]);
  const eligible = tasks.filter((task) => task.status !== "completed");
  const task = tasks.find((task) => task._id === state?.taskId);
  useEffect(() => {
    setRecord(
      owner
        ? (() => {
            const saved = readSprint(localStorage, key);
            return saved ? { owner, state: saved } : null;
          })()
        : null,
    );
    setExpanded(false);
    setChooserOpen(false);
    setError("");
  }, [owner, key]);

  const persist = useCallback(
    (next: SprintState | null) => {
      if (!owner) return;
      setRecord(next ? { owner, state: next } : null);
      setStorageError(!saveSprint(localStorage, key, next));
    },
    [owner, key],
  );

  const begin = useCallback(
    async (candidate: Task) => {
      if (!owner || candidate.status === "completed" || locked.current) return;
      if (preferences.completionSound) void prepareCompletionAudio();
      locked.current = true;
      setBusy(true);
      setError("");
      try {
        // Do not start the clock or replace an existing session until saving succeeds.
        if (candidate.status === "pending") await updateTask(candidate, { status: "in-progress" });
        persist(startSprint(newSprint(candidate._id, preferences.focusMinutes), Date.now()));
        setChooserOpen(false);
        setExpanded(true);
      } catch {
        setError("Could not start focus. Your previous session is preserved. Please try again.");
        setSelectedId(candidate._id);
        setChooserOpen(true);
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [owner, persist, updateTask, preferences.focusMinutes, preferences.completionSound],
  );
  const startFocus = useCallback(
    (candidate: Task) => {
      if (candidate.status === "completed") return;
      if (state?.taskId === candidate._id && remainingTime(state, Date.now()) > 0) {
        setExpanded(true);
        return;
      }
      if (state && remainingTime(state, Date.now()) > 0) {
        setSelectedId(candidate._id);
        setChooserOpen(true);
        setError("");
        return;
      }
      void begin(candidate);
    },
    [begin, state],
  );
  const chooseTask = useCallback(() => {
    setSelectedId(state?.taskId ?? tasks.find((item) => item.status !== "completed")?._id ?? "");
    setError("");
    setChooserOpen(true);
  }, [state, tasks]);
  const actions = useMemo(
    () => ({ active: Boolean(state) && isPrivate, startFocus, chooseTask }),
    [state, isPrivate, startFocus, chooseTask],
  );
  const end = () => {
    persist(null);
    setExpanded(false);
    setError("");
  };
  const changeTask = async (changes: Partial<TaskInput>) => {
    if (!task || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await updateTask(task, changes);
      if (changes.status === "completed" && state) persist(pauseSprint(state, Date.now()));
    } catch {
      setError("Your changes could not be saved. Please try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const toggleSession = async () => {
    if (!state || !task || locked.current) return;
    if (state.deadline) {
      persist(pauseSprint(state, Date.now()));
      return;
    }
    if (preferences.completionSound) void prepareCompletionAudio();
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      // Also migrate a saved, not-yet-started session from the previous UI.
      if (task.status === "pending") await updateTask(task, { status: "in-progress" });
      persist(startSprint(state, Date.now()));
    } catch {
      setError("Could not resume focus. Please try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const remaining = state ? remainingTime(state, Date.now()) : 0;
  useEffect(() => {
    if (!state) return;
    const pulse = () => tick();
    const timer = state.deadline ? setInterval(pulse, 1000) : null;
    window.addEventListener("focus", pulse);
    document.addEventListener("visibilitychange", pulse);
    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", pulse);
      document.removeEventListener("visibilitychange", pulse);
    };
  }, [state]);
  useEffect(() => {
    tick();
  }, [pathname]);
  useEffect(() => () => titleRestore.current?.(), []);
  useEffect(() => {
    if (!state || !owner || !state.started || remaining > 0 || state.alertedAt !== null) return;
    const completed = claimCompletion(localStorage, key, state, Date.now());
    if (completed) {
      persist(completed);
      setExpanded(false);
      setChooserOpen(false);
      titleRestore.current?.();
      titleRestore.current = announceCompletion(task?.title ?? "Your task", completed.sessionId, {
        sound: preferences.completionSound,
        soundId: preferences.completionSoundId,
        notifications: preferences.browserNotifications,
      });
    } else {
      const saved = readSprint(localStorage, key);
      if (saved?.sessionId === state.sessionId && saved.alertedAt !== null) persist(saved);
    }
  }, [
    state,
    owner,
    remaining,
    key,
    persist,
    task?.title,
    preferences.completionSound,
    preferences.completionSoundId,
    preferences.browserNotifications,
  ]);

  return (
    <FocusSessionContext.Provider value={actions}>
      {children}
      {owner && state && state.alertedAt !== null && !state.completionDismissed && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) persist({ ...state, completionDismissed: true });
          }}
        >
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card sm:max-w-md">
            <DialogTitle>Focus session complete</DialogTitle>
            <DialogDescription>
              A little steady attention adds up. Take a breath before the next step.
            </DialogDescription>
            <p dir="auto" className="break-words text-lg font-semibold">
              {task?.title ?? "Your task"}
            </p>
            {task && task.status !== "completed" && (
              <Button disabled={busy} onClick={() => void changeTask({ status: "completed" })}>
                <Check /> Complete task
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                end();
                chooseTask();
              }}
            >
              Start another session
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => persist({ ...state, completionDismissed: true })}
            >
              Dismiss
            </Button>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}
      {isPrivate && owner && (
        <>
          <Dialog
            open={chooserOpen}
            onOpenChange={(open) => {
              if (!busy) setChooserOpen(open);
            }}
          >
            <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card sm:max-w-md">
              <DialogTitle className="pr-6">Choose a task to focus on</DialogTitle>
              <DialogDescription>
                {state
                  ? `Switching tasks ends the current timer and starts a new ${preferences.focusMinutes}-minute Focus Session.`
                  : "Pick any pending or in-progress task. One useful step is enough."}
              </DialogDescription>
              {eligible.length ? (
                <>
                  <label htmlFor="focus-task" className="text-sm font-medium">
                    Your task
                  </label>
                  <Select
                    value={eligible.some((item) => item._id === selectedId) ? selectedId : ""}
                    onValueChange={setSelectedId}
                    disabled={busy}
                  >
                    <SelectTrigger id="focus-task">
                      <SelectValue placeholder="Choose a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligible.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          <span dir="auto">{item.title}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={busy || !eligible.some((item) => item._id === selectedId)}
                    onClick={() => {
                      const selected = eligible.find((item) => item._id === selectedId);
                      if (!selected) return;
                      if (state?.taskId === selected._id && remainingTime(state, Date.now()) > 0) {
                        setChooserOpen(false);
                        setExpanded(true);
                      } else void begin(selected);
                    }}
                  >
                    <Timer />
                    {busy
                      ? "Starting focus…"
                      : state?.taskId === selectedId && remainingTime(state, Date.now()) > 0
                        ? "Back to session"
                        : state
                          ? "Switch task and start"
                          : `Start ${preferences.focusMinutes}-minute focus`}
                  </Button>
                </>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  No incomplete tasks right now. Add a task in your dashboard to begin.
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </DialogContent>
          </Dialog>
          {state && (
            <SessionSurface
              state={state}
              task={task}
              busy={busy}
              error={error}
              storageError={storageError}
              expanded={expanded}
              setExpanded={setExpanded}
              onEnd={end}
              onToggle={() => void toggleSession()}
              onChoose={chooseTask}
              onUpdate={changeTask}
            />
          )}
        </>
      )}
    </FocusSessionContext.Provider>
  );
}

function SessionSurface({
  state,
  task,
  busy,
  error,
  storageError,
  expanded,
  setExpanded,
  onEnd,
  onToggle,
  onChoose,
  onUpdate,
}: {
  state: SprintState;
  task: Task | undefined;
  busy: boolean;
  error: string;
  storageError: boolean;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  onEnd: () => void;
  onToggle: () => void;
  onChoose: () => void;
  onUpdate: (changes: Partial<TaskInput>) => Promise<void>;
}) {
  const [, tick] = useReducer((value) => value + 1, 0);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!state.deadline) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state.deadline]);
  const remaining = remainingTime(state, Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const details = (
    <>
      <h3 dir="auto" className="mt-4 break-words text-xl font-semibold leading-snug">
        {task?.title ?? "Your saved task"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {task?.status === "completed"
          ? "Task complete. End your session when you’re ready."
          : remaining === 0
            ? "Time to breathe. Finish up, or take a break."
            : "One task. A little uninterrupted time."}
      </p>
      <p
        role="timer"
        aria-label="Time remaining"
        className="my-6 text-center text-5xl font-medium tracking-tight tabular-nums"
      >
        {clock}
      </p>
      <div className="flex flex-wrap gap-2">
        {remaining > 0 && task?.status !== "completed" && (
          <Button disabled={busy} onClick={onToggle}>
            {state.deadline ? <Pause /> : <Play />}
            {state.deadline ? "Pause" : state.started ? "Resume" : "Start"}
          </Button>
        )}
        <Button variant="outline" disabled={busy} onClick={onEnd}>
          <Square /> End Session
        </Button>
      </div>
      {task?.checklist.length ? (
        <div className="mt-5 border-t pt-3">
          <p className="eyebrow mb-2">ONE SMALL STEP AT A TIME</p>
          {task.checklist.map((item, index) => (
            <label
              key={item._id ?? index}
              className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={item.completed}
                disabled={busy}
                className="h-5 w-5 shrink-0 accent-primary"
                onChange={() =>
                  void onUpdate({
                    checklist: task.checklist.map((entry, i) =>
                      i === index ? { ...entry, completed: !entry.completed } : entry,
                    ),
                  })
                }
              />
              <span
                className={
                  item.completed ? "break-words text-muted-foreground line-through" : "break-words"
                }
              >
                {item.text}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          {task
            ? "Make space for the work that matters."
            : "This task is no longer available. You can end the session or choose another."}
        </p>
      )}
      {task && task.status !== "completed" && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          disabled={busy}
          onClick={() => void onUpdate({ status: "completed" })}
        >
          <Check /> Complete task
        </Button>
      )}
      <Button
        variant="ghost"
        className="mt-2 w-full"
        disabled={busy}
        onClick={() => {
          setExpanded(false);
          onChoose();
        }}
      >
        Choose another task
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {storageError && (
        <p role="status" className="mt-3 text-sm text-destructive">
          Browser storage is unavailable. Keep this page open to preserve the session.
        </p>
      )}
    </>
  );
  return (
    <>
      <aside
        aria-label="Focus Session"
        className="fixed inset-y-0 right-0 z-20 hidden w-[300px] overflow-y-auto border-l bg-card p-5 lg:block"
      >
        <h2 className="eyebrow flex items-center gap-2 text-primary-dark">
          <Timer className="h-4 w-4" /> FOCUS SESSION
        </h2>
        {details}
      </aside>
      <div className="focus-session-bar fixed inset-x-0 bottom-0 z-40 border-t bg-card px-3 pt-2 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left"
            aria-label="Expand Focus Session"
          >
            <span className="text-lg font-semibold tabular-nums">{clock}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold text-primary-dark">
                FOCUS SESSION
              </span>
              <span className="block truncate text-xs">{task?.title ?? "Saved task"}</span>
            </span>
            <ChevronUp className="h-4 w-4 shrink-0" />
          </button>
          {remaining > 0 && task?.status !== "completed" && (
            <Button
              size="icon"
              variant="ghost"
              disabled={busy}
              aria-label={state.deadline ? "Pause focus" : "Resume focus"}
              onClick={onToggle}
            >
              {state.deadline ? <Pause /> : <Play />}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            disabled={busy}
            aria-label="End Session"
            onClick={onEnd}
          >
            <Square />
          </Button>
        </div>
      </div>
      <Dialog open={expanded && !desktop} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card sm:max-w-md">
          <DialogTitle>Focus Session</DialogTitle>
          <DialogDescription className="sr-only">
            Your timer, task checklist, and session controls.
          </DialogDescription>
          {details}
        </DialogContent>
      </Dialog>
    </>
  );
}
