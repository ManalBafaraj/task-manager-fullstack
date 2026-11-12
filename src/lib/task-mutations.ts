import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { session, tasksApi } from "./api";
import type { Task, TaskInput, TaskStatus } from "./tasks";

const locks = new WeakMap<QueryClient, Set<string>>();
export async function updateTask(
  client: QueryClient,
  previous: Task,
  changes: Partial<TaskInput>,
  notify = true,
): Promise<Task> {
  let pending = locks.get(client);
  if (!pending) {
    pending = new Set();
    locks.set(client, pending);
  }
  if (pending.has(previous._id)) throw new Error("This task is being saved. Please wait.");
  pending.add(previous._id);
  const token = session.getToken();
  const original =
    client.getQueryData<Task[]>(["tasks"])?.find((task) => task._id === previous._id) ?? previous;
  try {
    await client.cancelQueries({ queryKey: ["tasks"] });
    const saved = await tasksApi.update(previous._id, changes);
    if (session.getToken() !== token) return saved;
    client.setQueryData<Task[]>(["tasks"], (tasks) =>
      (tasks ?? []).map((task) => (task._id === saved._id ? saved : task)),
    );
    if (notify && original.status !== "completed" && saved.status === "completed") {
      toast.success("Task completed", {
        duration: 9000,
        action: {
          label: "Undo",
          onClick: () => {
            void undoCompletion(client, saved._id, original.status);
          },
        },
      });
    } else if (notify && original.status === "completed" && saved.status === "pending")
      toast.success("Task reopened");
    return saved;
  } finally {
    pending.delete(previous._id);
  }
}
export async function undoCompletion(client: QueryClient, id: string, status: TaskStatus) {
  const current = client.getQueryData<Task[]>(["tasks"])?.find((task) => task._id === id);
  if (!current || current.status !== "completed") {
    toast.error("This task has changed since completion.");
    return;
  }
  try {
    await updateTask(client, current, { status }, false);
    toast.success("Completion undone");
  } catch {
    toast.error("Could not undo completion. Please try again.");
  }
}
