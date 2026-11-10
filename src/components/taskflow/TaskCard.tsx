import { useState } from "react";
import { format, isBefore, isValid, startOfDay } from "date-fns";
import {
  AlertCircle,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  Folder,
  ListChecks,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task, TaskPriority } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-rose-50 text-rose-700 ring-rose-200",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function getDueDate(value: string | null) {
  if (!value) return null;

  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  return isValid(date) ? date : null;
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleChecklist,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleChecklist: (task: Task, itemIndex: number) => Promise<void>;
}) {
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<number | null>(null);

  const done = task.status === "completed";
  const dueDate = getDueDate(task.dueDate);

  const overdue =
    Boolean(dueDate) && !done && isBefore(startOfDay(dueDate as Date), startOfDay(new Date()));

  const checklist = task.checklist ?? [];

  const completedChecklistItems = checklist.filter((item) => item.completed).length;

  const checklistProgress =
    checklist.length > 0 ? Math.round((completedChecklistItems / checklist.length) * 100) : 0;

  const handleChecklistToggle = async (itemIndex: number) => {
    if (updatingItem !== null) return;

    setUpdatingItem(itemIndex);

    try {
      await onToggleChecklist(task, itemIndex);
    } finally {
      setUpdatingItem(null);
    }
  };

  return (
    <article
      className={cn(
        "group card-surface card-lift flex h-full flex-col p-5 animate-fade-up",
        "hover:border-primary/20",
        overdue && "border-rose-200 bg-rose-50/20",
      )}
      aria-labelledby={`task-${task._id}-title`}
    >
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={task.status} />

        <div className="-mr-1.5 -mt-1.5 flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(task)}
            aria-label={`Edit task: ${task.title}`}
            title="Edit"
          >
            <Pencil />
          </Button>

          <Button
            variant="ghost-danger"
            size="icon-sm"
            onClick={() => onDelete(task)}
            aria-label={`Delete task: ${task.title}`}
            title="Delete"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <h3
        id={`task-${task._id}-title`}
        className={cn(
          "mt-4 text-base font-semibold leading-snug text-foreground",
          done && "text-muted-foreground line-through decoration-muted-foreground/50",
        )}
      >
        {task.title}
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {task.description || <span className="italic opacity-70">No description</span>}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1",
            "text-xs font-medium capitalize ring-1 ring-inset",
            PRIORITY_STYLES[task.priority],
          )}
        >
          {PRIORITY_LABELS[task.priority]} priority
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <Folder className="h-3 w-3" aria-hidden="true" />
          {task.category}
        </span>

        {task.reminderEnabled && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
            <BellRing className="h-3 w-3" aria-hidden="true" />
            {task.reminderType === "daily"
              ? `Daily at ${task.reminderTime}`
              : `Reminder at ${task.reminderTime}`}
          </span>
        )}

        {overdue && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            Overdue
          </span>
        )}
      </div>

      {checklist.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl bg-muted/50">
          <button
            type="button"
            onClick={() => setChecklistOpen((open) => !open)}
            className="w-full cursor-pointer p-3 text-left"
            aria-expanded={checklistOpen}
            aria-controls={`checklist-${task._id}`}
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ListChecks className="h-3.5 w-3.5 text-primary" />
                Checklist
              </span>

              <span className="flex items-center gap-2 text-muted-foreground">
                {completedChecklistItems}/{checklist.length} completed
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    checklistOpen && "rotate-180",
                  )}
                />
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${checklistProgress}%`,
                }}
              />
            </div>
          </button>

          {checklistOpen && (
            <div id={`checklist-${task._id}`} className="space-y-2 border-t px-3 py-3">
              {checklist.map((item, itemIndex) => {
                const updating = updatingItem === itemIndex;

                return (
                  <button
                    key={item._id ?? `${task._id}-${itemIndex}`}
                    type="button"
                    onClick={() => handleChecklistToggle(itemIndex)}
                    disabled={updatingItem !== null}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left",
                      "transition-colors hover:bg-card",
                      "disabled:cursor-wait disabled:opacity-70",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                        "transition-colors",
                        item.completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-card text-transparent",
                      )}
                    >
                      {updating ? (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </span>

                    <span
                      className={cn(
                        "text-sm text-foreground",
                        item.completed && "text-muted-foreground line-through",
                      )}
                    >
                      {item.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 space-y-2 border-t pt-4 text-xs text-muted-foreground">
        {dueDate && (
          <div className={cn("flex items-center gap-2", overdue && "font-medium text-rose-600")}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Due <time dateTime={task.dueDate ?? undefined}>{format(dueDate, "MMM d, yyyy")}</time>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Created{" "}
            <time dateTime={task.createdAt}>{format(new Date(task.createdAt), "MMM d, yyyy")}</time>
          </span>
        </div>
      </div>
    </article>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="card-surface flex flex-col p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-full" />

        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      <Skeleton className="mt-5 h-5 w-4/5 rounded-md" />
      <Skeleton className="mt-3 h-3.5 w-full rounded-md" />
      <Skeleton className="mt-2 h-3.5 w-3/4 rounded-md" />

      <div className="mt-5 flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="mt-6 space-y-2 border-t pt-4">
        <Skeleton className="h-3.5 w-32 rounded-md" />
        <Skeleton className="h-3.5 w-36 rounded-md" />
      </div>
    </div>
  );
}

export function TaskGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
