import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock3, ListTodo, Loader } from "lucide-react";
import { cva } from "class-variance-authority";
import { Skeleton } from "@/components/ui/skeleton";

const iconWrap = cva("grid h-11 w-11 place-items-center rounded-xl", {
  variants: {
    tone: {
      all: "bg-primary-soft text-primary",
      pending: "bg-pending-soft text-pending-strong",
      progress: "bg-progress-soft text-progress-strong",
      completed: "bg-completed-soft text-completed-strong",
    },
  },
});

type Tone = "all" | "pending" | "progress" | "completed";

const CARDS: { key: "all" | "pending" | "in-progress" | "completed"; label: string; icon: LucideIcon; tone: Tone }[] = [
  { key: "all", label: "All Tasks", icon: ListTodo, tone: "all" },
  { key: "pending", label: "Pending", icon: Clock3, tone: "pending" },
  { key: "in-progress", label: "In Progress", icon: Loader, tone: "progress" },
  { key: "completed", label: "Completed", icon: CheckCircle2, tone: "completed" },
];

export function SummaryCards({
  counts,
  loading,
}: {
  counts?: Record<"all" | "pending" | "in-progress" | "completed", number>;
  loading?: boolean;
}) {
  return (
    <section aria-label="Task summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon, tone }) => (
        <div key={key} className="card-surface card-lift p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <span className={iconWrap({ tone })} aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
          </div>
          {loading || !counts ? (
            <Skeleton className="mt-3 h-9 w-14 rounded-lg" />
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-[34px]">
              {counts[key]}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
