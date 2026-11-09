import { format } from "date-fns";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function TaskCard({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  const done = task.status === "completed";
  return (
    <article
      className="group card-surface card-lift flex h-full flex-col p-5 animate-fade-up hover:border-primary/20"
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

      <div className="mt-5 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          Created{" "}
          <time dateTime={task.createdAt}>{format(new Date(task.createdAt), "MMM d, yyyy")}</time>
        </span>
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
      <div className="mt-6 border-t pt-4">
        <Skeleton className="h-3.5 w-32 rounded-md" />
      </div>
    </div>
  );
}

export function TaskGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
