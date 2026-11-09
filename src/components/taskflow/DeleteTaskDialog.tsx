import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export function DeleteTaskDialog({
  task,
  onOpenChange,
  onConfirm,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (task: Task) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      await onConfirm(task);
      onOpenChange(false);
    } catch {
      // toast handled by caller
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={Boolean(task)} onOpenChange={(o) => !deleting && onOpenChange(o)}>
      <AlertDialogContent className="w-[calc(100%-2rem)] gap-0 rounded-3xl border-0 bg-card p-6 shadow-lift sm:max-w-[420px] sm:rounded-3xl">
        <AlertDialogHeader className="items-center text-center sm:items-start sm:text-left">
          <span
            className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-destructive-soft text-destructive"
            aria-hidden="true"
          >
            <Trash2 className="h-5 w-5" />
          </span>
          <AlertDialogTitle className="text-lg font-bold">
            Are you sure you want to delete this task?
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {task ? (
              <>
                <span className="font-medium text-foreground">“{task.title}”</span> will be
                permanently removed. This action cannot be undone.
              </>
            ) : (
              "This action cannot be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-7 gap-2 sm:space-x-0">
          <AlertDialogCancel
            disabled={deleting}
            className={cn(buttonVariants({ variant: "outline" }), "mt-0")}
          >
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
