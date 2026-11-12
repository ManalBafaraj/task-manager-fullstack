import { useState } from "react";
import { ArrowUpRight, Check, Play, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nextMove, nextMoveReason } from "@/lib/planning";
import type { Task, TaskInput } from "@/lib/tasks";
import { useAccount } from "@/hooks/use-account";

export function NextMove({
  tasks,
  onOpen,
  onFocus,
  onChooseFocus,
  onUpdate,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onFocus: (task: Task) => void;
  onChooseFocus: () => void;
  onUpdate: (task: Task, changes: Partial<TaskInput>) => Promise<void>;
}) {
  const task = nextMove(tasks);
  const { preferences } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = async (status: Task["status"]) => {
    if (!task || busy) return;
    setBusy(true);
    setError("");
    try {
      await onUpdate(task, { status });
    } catch {
      setError("Could not save this change. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-labelledby="next-move-title"
      className="next-move mt-6 border-l-[3px] border-l-primary bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="next-move-title" className="eyebrow text-primary-dark">
          YOUR NEXT MOVE
        </h2>
        <span className="text-xs text-muted-foreground">A little direction for your day</span>
      </div>
      {task ? (
        <>
          <p className="mt-3 text-xs font-medium text-muted-foreground">{nextMoveReason(task)}</p>
          <button
            type="button"
            className="mt-2 flex min-h-11 max-w-full items-start gap-2 text-left text-xl font-semibold leading-snug break-words hover:text-primary-dark"
            onClick={() => onOpen(task)}
          >
            <span dir="auto" className="min-w-0 flex-1 break-words">
              {task.title}
            </span>
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0" />
          </button>
          {task.description && (
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button className="col-span-2 min-h-11" onClick={() => onFocus(task)}>
              <Timer /> Start {preferences.focusMinutes}-minute focus
            </Button>
            <Button
              variant="outline"
              className="whitespace-normal px-2 text-xs sm:px-4 sm:text-sm"
              onClick={onChooseFocus}
            >
              Choose another task
            </Button>
            {task.status !== "in-progress" && (
              <Button
                variant="outline"
                className="whitespace-normal px-2 text-xs sm:px-4 sm:text-sm"
                disabled={busy}
                onClick={() => void update("in-progress")}
              >
                <Play /> Mark in progress
              </Button>
            )}
            <Button variant="ghost" disabled={busy} onClick={() => void update("completed")}>
              <Check /> Complete
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="py-4">
          <p className="text-xl font-semibold">Room for what comes next.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {tasks.length
              ? "Everything is complete. Enjoy the breathing room."
              : "Add a task and we’ll help you find a place to begin."}
          </p>
        </div>
      )}
    </section>
  );
}
