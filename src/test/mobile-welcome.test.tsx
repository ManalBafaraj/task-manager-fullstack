import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileWelcome } from "@/components/taskflow/MobileWelcome";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
describe("mobile welcome carousel", () => {
  it("introduces the three steps with next/back, progress, and final registration", () => {
    render(<MobileWelcome destination="/register" />);
    expect(screen.getByRole("heading", { name: "Welcome to TaskFlow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Skip/ })).toHaveAttribute("href", "/login");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/25-minute Focus Session/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Welcome to TaskFlow" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to step 3" }));
    expect(screen.getByRole("button", { name: "Go to step 3" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByText(/Visual Calendar puts your week/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
  });
  it("supports bounded keyboard and directional swipe navigation", () => {
    render(<MobileWelcome destination="/dashboard" />);
    const carousel = screen.getByRole("region");
    fireEvent.keyDown(carousel, { key: "End" });
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/dashboard");
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByRole("group", { name: "Step 3 of 3" })).toBeInTheDocument();
    fireEvent.keyDown(carousel, { key: "Home" });
    fireEvent.touchStart(carousel, { touches: [{ clientX: 250, clientY: 100 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 80, clientY: 110 }] });
    expect(screen.getByRole("group", { name: "Step 2 of 3" })).toBeInTheDocument();
    fireEvent.touchStart(carousel, { touches: [{ clientX: 80, clientY: 100 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 250, clientY: 105 }] });
    expect(screen.getByRole("group", { name: "Step 1 of 3" })).toBeInTheDocument();
  });
});
