import { createContext, useContext } from "react";
import type { Task } from "@/lib/tasks";

export interface FocusSessionActions {
  active: boolean;
  startFocus: (task: Task) => void;
  chooseTask: () => void;
}
export const FocusSessionContext = createContext<FocusSessionActions | null>(null);
export function useFocusSession() {
  const value = useContext(FocusSessionContext);
  if (!value) throw new Error("Focus Session requires its provider.");
  return value;
}
