import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAccount } from "@/hooks/use-account";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Bell, ListChecks, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DESCRIPTION_MAX,
  PRIORITY_LABELS,
  REMINDER_LABELS,
  REMINDER_TYPES,
  STATUS_LABELS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TITLE_MAX,
  validateTask,
  type ReminderType,
  type Task,
  type TaskCategory,
  type TaskErrors,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Field, FieldError, FormAlert } from "./FormField";
import { StatusDot } from "./StatusBadge";
import { TimeWheelPicker } from "./TimeWheelPicker";

const EMPTY: TaskInput = {
  title: "",
  description: "",
  checklist: [],
  status: "pending",
  priority: "medium",
  category: "General",
  dueDate: null,
  reminderEnabled: false,
  reminderType: "before-due",
  reminderTime: "09:00",
};

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  initialDueDate,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null | undefined;
  initialDueDate?: string | undefined;
  onSubmit: (input: TaskInput) => Promise<void>;
}) {
  const isEdit = Boolean(task);
  const { preferences } = useAccount();
  const defaultTime = useRef(preferences.defaultReminderTime);
  useEffect(() => {
    defaultTime.current = preferences.defaultReminderTime;
  }, [preferences.defaultReminderTime]);

  const [values, setValues] = useState<TaskInput>(EMPTY);

  const [errors, setErrors] = useState<TaskErrors>({});

  const [formError, setFormError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setValues(
      task
        ? {
            title: task.title,
            description: task.description,
            checklist: (task.checklist ?? []).map((item) => ({
              _id: item._id,
              text: item.text,
              completed: item.completed,
            })),
            status: task.status,
            priority: task.priority ?? "medium",
            category: task.category ?? "General",
            dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
            reminderEnabled: task.reminderEnabled ?? false,
            reminderType: task.reminderType ?? "before-due",
            reminderTime: task.reminderTime ?? "09:00",
          }
        : { ...EMPTY, dueDate: initialDueDate ?? null, reminderTime: defaultTime.current },
    );

    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, task, initialDueDate]);

  const set = <Key extends keyof TaskInput>(key: Key, value: TaskInput[Key]) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));

    if (errors[key]) {
      setErrors((current) => ({
        ...current,
        [key]: undefined,
      }));
    }
  };

  const addChecklistItem = () => {
    if (values.checklist.length >= 20) return;

    set("checklist", [
      ...values.checklist,
      {
        text: "",
        completed: false,
      },
    ]);
  };

  const updateChecklistItem = (index: number, text: string) => {
    set(
      "checklist",
      values.checklist.map((item, itemIndex) => (itemIndex === index ? { ...item, text } : item)),
    );
  };

  const toggleChecklistItem = (index: number) => {
    set(
      "checklist",
      values.checklist.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              completed: !item.completed,
            }
          : item,
      ),
    );
  };

  const removeChecklistItem = (index: number) => {
    set(
      "checklist",
      values.checklist.filter((_, itemIndex) => itemIndex !== index),
    );
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const nextErrors = validateTask(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[92vh] flex-col gap-0 overflow-hidden border-0 bg-card p-0 shadow-lift sm:max-w-[560px] sm:rounded-3xl",
          "max-sm:inset-3 max-sm:w-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-3xl",
        )}
      >
        <DialogHeader className="space-y-0 border-b px-6 pb-5 pt-6 text-left">
          <span
            className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"
            aria-hidden="true"
          >
            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </span>

          <DialogTitle className="text-xl font-bold tracking-tight">
            {isEdit ? "Edit task" : "Add new task"}
          </DialogTitle>

          <DialogDescription className="mt-1.5">
            {isEdit
              ? "Update the details of your task below."
              : "Fill in the details to add a task to your list."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <FormAlert message={formError} />

            <Field
              id="task-title"
              label="Title"
              error={errors.title}
              labelAside={
                <span className="text-xs text-muted-foreground">
                  {values.title.length}/{TITLE_MAX}
                </span>
              }
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  autoFocus
                  maxLength={TITLE_MAX}
                  placeholder="e.g. Prepare weekly report"
                  value={values.title}
                  onChange={(event) => set("title", event.target.value)}
                />
              )}
            </Field>

            <Field
              id="task-description"
              label="Description"
              error={errors.description}
              labelAside={
                <span className="text-xs text-muted-foreground">
                  {values.description.length}/{DESCRIPTION_MAX}
                </span>
              }
            >
              {(fieldProps) => (
                <Textarea
                  {...fieldProps}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="Add a few details (optional)"
                  value={values.description}
                  onChange={(event) => set("description", event.target.value)}
                />
              )}
            </Field>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <ListChecks className="h-4 w-4" />
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-foreground">Checklist</p>
                    <p className="text-xs text-muted-foreground">
                      {values.checklist.length}/20 items
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChecklistItem}
                  disabled={values.checklist.length >= 20}
                >
                  <Plus className="h-4 w-4" />
                  Add item
                </Button>
              </div>

              {values.checklist.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
                  Break this task into smaller steps.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {values.checklist.map((item, index) => (
                    <div key={item._id ?? index} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(index)}
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors",
                          item.completed
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-card text-muted-foreground hover:border-primary/40",
                        )}
                        aria-label={
                          item.completed
                            ? "Mark checklist item incomplete"
                            : "Mark checklist item complete"
                        }
                      >
                        {item.completed ? "✓" : index + 1}
                      </button>

                      <Input
                        maxLength={120}
                        placeholder={`Checklist item ${index + 1}`}
                        value={item.text}
                        onChange={(event) => updateChecklistItem(index, event.target.value)}
                        className={cn(item.completed && "line-through opacity-65")}
                      />

                      <Button
                        type="button"
                        variant="ghost-danger"
                        size="icon-sm"
                        onClick={() => removeChecklistItem(index)}
                        aria-label={`Remove checklist item ${index + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <FieldError id="task-checklist-error" message={errors.checklist} />
            </div>
            <div>
              <p id="task-status-label" className="mb-2 text-sm font-medium text-foreground">
                Status
              </p>

              <RadioGroup.Root
                aria-labelledby="task-status-label"
                value={values.status}
                onValueChange={(value) => set("status", value as TaskStatus)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {TASK_STATUSES.map((status) => (
                  <RadioGroup.Item
                    key={status}
                    value={status}
                    className="flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-input bg-card px-4 text-sm font-medium text-muted-foreground shadow-soft transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft data-[state=checked]:text-foreground"
                  >
                    <StatusDot status={status} className="h-2 w-2" />
                    {STATUS_LABELS[status]}
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>

              <FieldError id="task-status-error" message={errors.status} />
              {task?.status === "completed" && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  disabled={submitting}
                  onClick={() => set("status", "pending")}
                >
                  Reopen task
                </Button>
              )}
            </div>

            <div>
              <p id="task-priority-label" className="mb-2 text-sm font-medium text-foreground">
                Priority
              </p>

              <RadioGroup.Root
                aria-labelledby="task-priority-label"
                value={values.priority}
                onValueChange={(value) => set("priority", value as TaskPriority)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {TASK_PRIORITIES.map((priority) => (
                  <RadioGroup.Item
                    key={priority}
                    value={priority}
                    className="flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-input bg-card px-4 text-sm font-medium text-muted-foreground shadow-soft transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft data-[state=checked]:text-foreground"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        priority === "low" && "bg-emerald-500",
                        priority === "medium" && "bg-amber-500",
                        priority === "high" && "bg-rose-500",
                      )}
                    />
                    {PRIORITY_LABELS[priority]}
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>

              <FieldError id="task-priority-error" message={errors.priority} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="task-category" label="Category" error={errors.category}>
                {(fieldProps) => (
                  <Select
                    value={values.category}
                    onValueChange={(value) => set("category", value as TaskCategory)}
                  >
                    <SelectTrigger {...fieldProps}>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" sideOffset={6}>
                      {TASK_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field id="task-due-date" label="Due date" error={errors.dueDate}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="date"
                    value={values.dueDate ?? ""}
                    onChange={(event) => set("dueDate", event.target.value || null)}
                  />
                )}
              </Field>
            </div>

            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Bell className="h-4 w-4" />
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-foreground">Enable reminder</p>

                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Get notified about this task.
                    </p>
                  </div>
                </div>

                <Switch
                  checked={values.reminderEnabled}
                  onCheckedChange={(checked) => set("reminderEnabled", checked)}
                  aria-label="Enable reminder"
                />
              </div>

              {values.reminderEnabled && (
                <div className="mt-5 space-y-4 border-t pt-4">
                  <div>
                    <p
                      id="reminder-type-label"
                      className="mb-2 text-sm font-medium text-foreground"
                    >
                      Reminder type
                    </p>

                    <RadioGroup.Root
                      aria-labelledby="reminder-type-label"
                      value={values.reminderType}
                      onValueChange={(value) => set("reminderType", value as ReminderType)}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {REMINDER_TYPES.map((reminderType) => (
                        <RadioGroup.Item
                          key={reminderType}
                          value={reminderType}
                          className="flex min-h-12 cursor-pointer items-center rounded-xl border border-input bg-card px-4 text-left text-sm font-medium text-muted-foreground shadow-soft transition-all hover:border-primary/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft data-[state=checked]:text-foreground"
                        >
                          {REMINDER_LABELS[reminderType]}
                        </RadioGroup.Item>
                      ))}
                    </RadioGroup.Root>

                    <FieldError id="reminder-type-error" message={errors.reminderType} />

                    <p className="mt-2 text-xs text-muted-foreground">
                      {values.reminderType === "daily"
                        ? "A new reminder appears every day until the task is completed."
                        : "We will notify you when the deadline is approaching."}
                    </p>
                  </div>

                  <Field id="task-reminder-time" label="Reminder time" error={errors.reminderTime}>
                    {(fieldProps) => (
                      <TimeWheelPicker
                        {...fieldProps}
                        value={values.reminderTime}
                        onChange={(time) => set("reminderTime", time)}
                      />
                    )}
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t bg-muted/60 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={submitting} className="sm:min-w-[140px]">
              {submitting && <Loader2 className="animate-spin" />}

              {submitting
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
