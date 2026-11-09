import { useEffect, useState, type FormEvent } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Loader2, Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DESCRIPTION_MAX,
  STATUS_LABELS,
  TASK_STATUSES,
  TITLE_MAX,
  validateTask,
  type Task,
  type TaskErrors,
  type TaskInput,
  type TaskStatus,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Field, FieldError, FormAlert } from "./FormField";
import { StatusDot } from "./StatusBadge";

const EMPTY: TaskInput = { title: "", description: "", status: "pending" };

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in edit mode and pre-filled. */
  task?: Task | null;
  onSubmit: (input: TaskInput) => Promise<void>;
}) {
  const isEdit = Boolean(task);
  const [values, setValues] = useState<TaskInput>(EMPTY);
  const [errors, setErrors] = useState<TaskErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(
        task ? { title: task.title, description: task.description, status: task.status } : EMPTY,
      );
      setErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }, [open, task]);

  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validateTask(values);
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-0 bg-card p-0 shadow-lift sm:max-w-[520px] sm:rounded-3xl",
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
              {(p) => (
                <Input
                  {...p}
                  autoFocus
                  maxLength={TITLE_MAX}
                  placeholder="e.g. Prepare weekly report"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
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
              {(p) => (
                <Textarea
                  {...p}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="Add a few details (optional)"
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              )}
            </Field>

            <div>
              <p id="task-status-label" className="mb-2 text-sm font-medium text-foreground">
                Status
              </p>
              <RadioGroup.Root
                aria-labelledby="task-status-label"
                aria-describedby={errors.status ? "task-status-error" : undefined}
                value={values.status}
                onValueChange={(v) => set("status", v as TaskStatus)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {TASK_STATUSES.map((s) => (
                  <RadioGroup.Item
                    key={s}
                    value={s}
                    className="flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-input bg-card px-4 text-sm font-medium text-muted-foreground shadow-soft transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft data-[state=checked]:text-foreground"
                  >
                    <StatusDot status={s} className="h-2 w-2" />
                    {STATUS_LABELS[s]}
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>
              <FieldError id="task-status-error" message={errors.status} />
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
                  ? "Saving…"
                  : "Creating…"
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
