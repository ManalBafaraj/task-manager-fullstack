import { cva } from "class-variance-authority";
import { STATUS_LABELS, type TaskStatus } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        pending: "bg-pending-soft text-pending-strong",
        "in-progress": "bg-progress-soft text-progress-strong",
        completed: "bg-completed-soft text-completed-strong",
      },
    },
  },
);

const dot = cva("h-1.5 w-1.5 rounded-full", {
  variants: {
    status: {
      pending: "bg-pending",
      "in-progress": "bg-progress",
      completed: "bg-completed",
    },
  },
});

export function StatusDot({ status, className }: { status: TaskStatus; className?: string }) {
  return <span className={cn(dot({ status }), className)} aria-hidden="true" />;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={badge({ status })}>
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </span>
  );
}
