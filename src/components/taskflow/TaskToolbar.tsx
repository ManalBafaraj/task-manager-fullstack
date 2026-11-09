import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FILTER_OPTIONS, type StatusFilter } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export function TaskToolbar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  disabled,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-sm">
        <label htmlFor="task-search" className="sr-only">
          Search tasks
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="task-search"
          type="search"
          placeholder="Search tasks..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          disabled={disabled}
          className="pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Filter by status"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:rounded-xl md:border md:bg-card md:p-1 md:shadow-soft"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onStatusChange(opt.value)}
              className={cn(
                "h-10 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground md:border-transparent md:bg-transparent",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
