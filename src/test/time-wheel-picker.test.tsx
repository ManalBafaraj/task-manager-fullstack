import { useState } from "react";
import { cleanup, fireEvent, render, screen, act, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeWheelPicker } from "@/components/taskflow/TimeWheelPicker";

function Picker({ initial = "00:00" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <TimeWheelPicker aria-label="Reminder time" value={value} onChange={setValue} />;
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
});

describe("Reminder time wheel", () => {
  it.each([
    ["00:00", "12:00 AM"],
    ["12:00", "12:00 PM"],
    ["23:59", "11:59 PM"],
  ])("displays %s as %s", (initial, label) => {
    render(<Picker initial={initial} />);
    expect(screen.getByRole("button", { name: "Reminder time" })).toHaveTextContent(label);
  });

  it("supports keyboard selection across midnight and noon", () => {
    const onChange = vi.fn();
    render(<TimeWheelPicker value="00:00" onChange={onChange} aria-label="Reminder time" />);
    fireEvent.click(screen.getByRole("button", { name: "Reminder time" }));
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Period" }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("12:00");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Hour" }), { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("13:00");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Minute" }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("13:59");
  });

  it("preserves the latest hour when another wheel finishes scrolling", () => {
    render(<Picker initial="09:00" />);
    fireEvent.click(screen.getByRole("button", { name: "Reminder time" }));
    const minutes = screen.getByRole("listbox", { name: "Minute" });
    fireEvent.scroll(minutes, { target: { scrollTop: 30 * 44 } });
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Hour" }), { key: "ArrowDown" });
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole("button", { name: "Reminder time" })).toHaveTextContent("10:30 AM");
  });
  it("keeps keyboard focus on a column and supports click, Home, End, and Done", () => {
    render(<Picker initial="09:00" />);
    fireEvent.click(screen.getByRole("button", { name: "Reminder time" }));
    fireEvent.click(
      within(screen.getByRole("listbox", { name: "Hour" })).getByRole("option", { name: "10" }),
    );
    expect(screen.getByRole("listbox", { name: "Hour" })).toHaveFocus();
    expect(screen.getAllByRole("option", { selected: true })).toHaveLength(3);
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Hour" }), { key: "End" });
    expect(screen.getByRole("button", { name: "Reminder time" })).toHaveTextContent("12:00 AM");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Period" }), { key: "End" });
    expect(screen.getByRole("button", { name: "Reminder time" })).toHaveTextContent("12:00 PM");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Period" }), { key: "Home" });
    expect(screen.getByRole("button", { name: "Reminder time" })).toHaveTextContent("12:00 AM");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  it("commits a pending scroll when Done is pressed immediately", () => {
    render(<Picker initial="09:00" />);
    fireEvent.click(screen.getByRole("button", { name: "Reminder time" }));
    fireEvent.scroll(screen.getByRole("listbox", { name: "Minute" }), {
      target: { scrollTop: 45 * 44 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("button", { name: "Reminder time" })).toHaveTextContent("09:45 AM");
  });
});
