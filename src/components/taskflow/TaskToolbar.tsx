import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FILTER_OPTIONS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  type StatusFilter,
  type TaskCategory,
  type TaskPriority,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

export type PriorityFilter = "all" | TaskPriority;
export type CategoryFilter = "all" | TaskCategory;
export type DueDateFilter = "all" | "overdue" | "today" | "upcoming" | "no-date";

interface TaskToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  priority: PriorityFilter;
  onPriorityChange: (value: PriorityFilter) => void;
  category: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  dueDate: DueDateFilter;
  onDueDateChange: (value: DueDateFilter) => void;
  onClear: () => void;
  disabled?: boolean | undefined;
}

const selectClassName =
  "h-10 min-w-[135px] cursor-pointer rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-soft outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50";

export function TaskToolbar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  category,
  onCategoryChange,
  dueDate,
  onDueDateChange,
  onClear,
  disabled,
}: TaskToolbarProps) {
  const hasFilters =
    Boolean(query) ||
    status !== "all" ||
    priority !== "all" ||
    category !== "all" ||
    dueDate !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
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
            onChange={(event) => onQueryChange(event.target.value)}
            disabled={disabled}
            className="pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden"
          />

          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Filter by status"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:rounded-xl lg:border lg:bg-card lg:p-1 lg:shadow-soft"
        >
          {FILTER_OPTIONS.map((option) => {
            const active = status === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onStatusChange(option.value)}
                className={cn(
                  "h-10 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:border-transparent lg:bg-transparent",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>

        <label className="sr-only" htmlFor="priority-filter">
          Filter by priority
        </label>
        <select
          id="priority-filter"
          value={priority}
          disabled={disabled}
          onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)}
          className={selectClassName}
        >
          <option value="all">All priorities</option>
          {TASK_PRIORITIES.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="category-filter">
          Filter by category
        </label>
        <select
          id="category-filter"
          value={category}
          disabled={disabled}
          onChange={(event) => onCategoryChange(event.target.value as CategoryFilter)}
          className={selectClassName}
        >
          <option value="all">All categories</option>
          {TASK_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="due-date-filter">
          Filter by due date
        </label>
        <select
          id="due-date-filter"
          value={dueDate}
          disabled={disabled}
          onChange={(event) => onDueDateChange(event.target.value as DueDateFilter)}
          className={selectClassName}
        >
          <option value="all">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="upcoming">Upcoming</option>
          <option value="no-date">No due date</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
