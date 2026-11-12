import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateTask } from "@/lib/task-mutations";
import type { Task, TaskInput } from "@/lib/tasks";
export function useTaskActions() {
  const client = useQueryClient();
  return useCallback(
    (task: Task, changes: Partial<TaskInput>) => updateTask(client, task, changes),
    [client],
  );
}
