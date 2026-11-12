import { Skeleton } from "@/components/ui/skeleton";

export function SummaryCards({
  counts,
  loading,
}: {
  counts?: Record<"all" | "pending" | "in-progress" | "completed", number>;
  loading?: boolean;
}) {
  if (loading || !counts)
    return (
      <section aria-label="Loading progress" className="border-y py-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-3 h-2 w-full" />
      </section>
    );
  const progress = counts.all ? Math.round((counts.completed / counts.all) * 100) : 0;
  return (
    <section
      aria-label="Today's progress"
      className="grid gap-4 border-y py-5 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div>
        <p className="eyebrow">
          TODAY'S PROGRESS{" "}
          <span className="ml-2 font-normal normal-case tracking-normal">
            Across your task list
          </span>
        </p>
        <p className="mt-2 text-lg font-semibold">
          {counts.all
            ? `${counts.completed} of ${counts.all} tasks completed`
            : "A clear page. A fresh start."}
        </p>
        <div
          role="progressbar"
          aria-label="Tasks completed"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-completed-strong"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <dl className="flex flex-wrap gap-y-3 text-xs sm:ml-6">
        <div className="pr-4">
          <dt className="text-pending-strong">Pending</dt>
          <dd className="mt-1 text-lg font-medium text-foreground">{counts.pending}</dd>
        </div>
        <div className="border-l px-4">
          <dt className="text-progress-strong">In progress</dt>
          <dd className="mt-1 text-lg font-medium text-foreground">{counts["in-progress"]}</dd>
        </div>
        <div className="border-l pl-4">
          <dt className="text-completed-strong">Completed</dt>
          <dd className="mt-1 text-lg font-medium text-foreground">{counts.completed}</dd>
        </div>
      </dl>
    </section>
  );
}
