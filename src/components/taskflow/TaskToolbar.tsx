import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function FilterSelect<T extends string>({
  value,
  onValueChange,
  label,
  options,
  disabled = false,
}: {
  value: T;
  onValueChange: (value: T) => void;
  label: string;
  options: readonly { value: T; label: string }[];
  disabled?: boolean | undefined;
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as T)} disabled={disabled}>
      <SelectTrigger
        aria-label={label}
        className="h-11 w-auto min-w-[148px] max-w-full rounded-xl px-3.5 text-sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={6}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const priorityOptions = [
  { value: "all", label: "All priorities" },
  ...TASK_PRIORITIES.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  })),
] as const;

const categoryOptions = [
  { value: "all", label: "All categories" },
  ...TASK_CATEGORIES.map((value) => ({ value, label: value })),
] as const;

const dueDateOptions = [
  { value: "all", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "no-date", label: "No due date" },
] as const;

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
    <div className="space-y-4">
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
          onKeyDown={(event) => {
            if (disabled) return;
            const index = FILTER_OPTIONS.findIndex((option) => option.value === status);
            let nextIndex: number;
            if (event.key === "ArrowRight" || event.key === "ArrowDown")
              nextIndex = (index + 1) % FILTER_OPTIONS.length;
            else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
              nextIndex = (index + FILTER_OPTIONS.length - 1) % FILTER_OPTIONS.length;
            else if (event.key === "Home") nextIndex = 0;
            else if (event.key === "End") nextIndex = FILTER_OPTIONS.length - 1;
            else return;
            event.preventDefault();
            const next = FILTER_OPTIONS[nextIndex];
            if (next) onStatusChange(next.value);
            event.currentTarget
              .querySelectorAll<HTMLButtonElement>('[role="radio"]')
              [nextIndex]?.focus();
          }}
          className="flex flex-wrap gap-1.5 pb-1 lg:rounded-xl lg:border lg:bg-card lg:p-1"
        >
          {FILTER_OPTIONS.map((option) => {
            const active = status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                disabled={disabled}
                onClick={() => onStatusChange(option.value)}
                className={cn(
                  "h-10 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:border-transparent lg:bg-transparent",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="mr-1 flex h-11 items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        <FilterSelect
          value={priority}
          onValueChange={onPriorityChange}
          label="Filter by priority"
          options={priorityOptions}
          disabled={disabled}
        />
        <FilterSelect
          value={category}
          onValueChange={onCategoryChange}
          label="Filter by category"
          options={categoryOptions}
          disabled={disabled}
        />
        <FilterSelect
          value={dueDate}
          onValueChange={onDueDateChange}
          label="Filter by due date"
          options={dueDateOptions}
          disabled={disabled}
        />
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
