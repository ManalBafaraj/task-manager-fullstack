import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusSessionProvider } from "@/components/taskflow/FocusSession";
import { useFocusSession } from "@/hooks/use-focus-session";
import { tasksApi } from "@/lib/api";
import type { Task } from "@/lib/tasks";
import { newSprint } from "@/lib/planning";

const route = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (value: unknown) => unknown }) =>
    select({ location: route }),
}));
const first: Task = {
  _id: "a",
  title: "Write the outline",
  description: "",
  status: "pending",
  priority: "high",
  category: "Work",
  dueDate: null,
  checklist: [],
  reminderEnabled: false,
  reminderType: "daily",
  reminderTime: "09:00",
  createdAt: "2026-01-01",
};
const second: Task = { ...first, _id: "b", title: "Read a chapter", status: "in-progress" };
const done: Task = { ...first, _id: "done", title: "Already finished", status: "completed" };
function Controls() {
  const focus = useFocusSession();
  return (
    <>
      <button onClick={() => focus.startFocus(first)}>Focus first</button>
      <button onClick={() => focus.startFocus(second)}>Focus second</button>
      <button onClick={() => focus.startFocus(done)}>Focus completed</button>
      <button onClick={focus.chooseTask}>Choose task</button>
      <span>{focus.active ? "Active session" : "No active session"}</span>
    </>
  );
}
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  client.setQueryData(["tasks"], [first, second, done]);
  const tree = (
    <QueryClientProvider client={client}>
      <FocusSessionProvider>
        <Controls />
      </FocusSessionProvider>
    </QueryClientProvider>
  );
  return { ...render(tree), tree };
}
beforeEach(() => {
  localStorage.clear();
  route.pathname = "/dashboard";
  localStorage.setItem("taskflow_token", "qa-token");
  localStorage.setItem(
    "taskflow_user",
    JSON.stringify({ id: "qa", name: "QA", email: "qa@example.test" }),
  );
  vi.spyOn(tasksApi, "list").mockResolvedValue([first, second, done]);
  vi.spyOn(tasksApi, "update").mockImplementation(async (id, input) => ({
    ...first,
    ...input,
    _id: id,
  }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
describe("Focus Session", () => {
  it("starts a saved ready session and marks its pending task in progress", async () => {
    localStorage.setItem("taskflow_sprint_qa", JSON.stringify(newSprint("a")));
    setup();
    await screen.findByText("Active session");
    fireEvent.click(screen.getByRole("button", { name: "Expand Focus Session" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Focus Session" })).getByRole("button", {
        name: "Start",
      }),
    );
    await waitFor(() =>
      expect(tasksApi.update).toHaveBeenCalledWith(
        "a",
        expect.objectContaining({ status: "in-progress" }),
      ),
    );
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("taskflow_sprint_qa")!).deadline).toBeGreaterThan(
        Date.now(),
      ),
    );
  });
  it("marks pending work in progress, starts the clock, and survives navigation and refresh", async () => {
    const view = setup();
    fireEvent.click(screen.getByRole("button", { name: "Focus first" }));
    await screen.findByText("Active session");
    expect(tasksApi.update).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({ status: "in-progress" }),
    );
    const saved = JSON.parse(localStorage.getItem("taskflow_sprint_qa")!);
    expect(saved.taskId).toBe("a");
    expect(saved.deadline).toBeGreaterThan(Date.now());
    route.pathname = "/calendar";
    view.rerender(view.tree);
    expect(localStorage.getItem("taskflow_sprint_qa")).toContain('"taskId":"a"');
    view.unmount();
    setup();
    await screen.findByText("Active session");
    expect(JSON.parse(localStorage.getItem("taskflow_sprint_qa")!).deadline).toBe(saved.deadline);
    expect(tasksApi.update).toHaveBeenCalledTimes(1);
  });
  it("does not overwrite an active session until switching tasks is confirmed", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Focus first" }));
    await screen.findByText("Active session");
    // Close mobile details before selecting another task.
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Focus second" }));
    const chooser = await screen.findByRole("dialog", { name: "Choose a task to focus on" });
    expect(JSON.parse(localStorage.getItem("taskflow_sprint_qa")!).taskId).toBe("a");
    fireEvent.click(within(chooser).getByRole("button", { name: "Switch task and start" }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("taskflow_sprint_qa")!).taskId).toBe("b"),
    );
    expect(tasksApi.update).toHaveBeenCalledTimes(1); // In-progress tasks need no status patch.
  });
  it("excludes completed work, preserves state on a failed start, and removes ended sessions", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Focus completed" }));
    expect(tasksApi.update).not.toHaveBeenCalled();
    expect(localStorage.getItem("taskflow_sprint_qa")).toBeNull();
    vi.mocked(tasksApi.update).mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Focus first" }));
    await screen.findByRole("alert");
    expect(localStorage.getItem("taskflow_sprint_qa")).toBeNull();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Start 25-minute focus" }),
    );
    await screen.findByText("Active session");
    const details = screen.getByRole("dialog", { name: "Focus Session" });
    fireEvent.click(within(details).getByRole("button", { name: "Complete task" }));
    await waitFor(() =>
      expect(tasksApi.update).toHaveBeenLastCalledWith(
        "a",
        expect.objectContaining({ status: "completed" }),
      ),
    );
    expect(screen.getByText("Active session")).toBeInTheDocument();
    fireEvent.click(within(details).getByRole("button", { name: "End Session" }));
    await screen.findByText("No active session");
    expect(localStorage.getItem("taskflow_sprint_qa")).toBeNull();
  });
});
