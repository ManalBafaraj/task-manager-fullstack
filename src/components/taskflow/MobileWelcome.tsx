import { LegalLinks } from "./LegalLinks";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

const steps = [
  {
    title: "Welcome to TaskFlow",
    headline: "Know what to do next.",
    copy: "A little clarity for your day. Meet the planner that helps you turn a task list into a next step.",
  },
  {
    title: "A clear next step",
    headline: "Find your Next Move.",
    copy: "Next Move suggests one task based on deadlines and priority. Choose it, or another task, and begin a 25-minute Focus Session.",
  },
  {
    title: "Make room for your day",
    headline: "See the plan. Keep the rhythm.",
    copy: "Visual Calendar puts your week in view. Daily or before-due Reminders help you return to what matters, at a time you choose.",
  },
] as const;

export function MobileWelcome({ destination }: { destination: "/register" | "/dashboard" }) {
  const [step, setStep] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = steps[step]!;
  const move = (next: number) => setStep(Math.max(0, Math.min(steps.length - 1, next)));
  return (
    <section
      className="mobile-welcome md:hidden"
      role="region"
      aria-roledescription="carousel"
      aria-label="Welcome to TaskFlow introduction"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(step + 1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(step - 1);
        }
        if (event.key === "Home") {
          event.preventDefault();
          move(0);
        }
        if (event.key === "End") {
          event.preventDefault();
          move(2);
        }
      }}
      onTouchStart={(event) => {
        const t = event.touches[0];
        touch.current = t ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0];
        if (touch.current && end) {
          const dx = end.clientX - touch.current.x;
          const dy = end.clientY - touch.current.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(step + (dx < 0 ? 1 : -1));
        }
        touch.current = null;
      }}
    >
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <Link
          to="/login"
          className="flex min-h-11 items-center text-xs font-medium text-muted-foreground"
        >
          Skip / Log in <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </header>
      <div
        className="welcome-slide"
        role="group"
        aria-roledescription="slide"
        aria-label={`Step ${step + 1} of 3`}
      >
        <p className="eyebrow">AN INTRODUCTION TO A CLEARER DAY</p>
        <h1 className="mt-3 text-base font-medium text-muted-foreground">{current.title}</h1>
        <h2 className="mt-2 text-[clamp(1.75rem,7.8vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.045em]">
          {current.headline}
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {current.copy}
        </p>
        <div
          className="welcome-visual mt-6 w-full max-w-sm"
          aria-label="Illustrative product preview"
        >
          {step === 0 ? (
            <div className="rounded-2xl border bg-card p-5">
              <p className="eyebrow">SMALL STEPS. A LITTLE MOMENTUM.</p>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-completed-strong" />
                <span className="text-muted-foreground line-through">
                  Get everything out of your head
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm font-medium">
                <ArrowRight className="h-4 w-4 text-primary" /> Make space for one next step
              </div>
              <div className="mt-5 h-1 rounded-full bg-muted">
                <div className="h-1 w-1/2 rounded-full bg-completed-strong" />
              </div>
            </div>
          ) : step === 1 ? (
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-primary-dark">NEXT MOVE</p>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-sm font-semibold">Give your idea a first draft.</p>
              <p className="mt-1 text-xs text-muted-foreground">Due today · High priority</p>
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="flex items-center gap-2 text-xs font-medium">
                  <Timer className="h-4 w-4 text-primary" /> Focus Session
                </span>
                <span className="text-3xl font-medium tracking-tight tabular-nums">25:00</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" /> Your week, in view
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, index) => (
                  <div
                    key={index}
                    className={`rounded-lg py-2 text-center text-xs ${index === 2 ? "bg-primary-soft font-semibold text-primary-dark" : "text-muted-foreground"}`}
                  >
                    <span>{d}</span>
                    <span className="mt-2 block">{12 + index}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                <Bell className="h-4 w-4 text-primary" /> A thoughtful reminder, on your terms.
              </div>
            </div>
          )}
        </div>
      </div>
      <footer>
        <div className="flex items-center justify-between gap-2">
          <LegalLinks />
          <div className="flex" role="group" aria-label="Introduction progress">
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => move(index)}
                aria-label={`Go to step ${index + 1}`}
                aria-current={index === step ? "step" : undefined}
                className="grid h-11 w-11 place-items-center"
              >
                <span
                  className={`h-1.5 rounded-full transition-[width] ${index === step ? "w-5 bg-primary" : "w-1.5 bg-input"}`}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => move(step - 1)}
            disabled={step === 0}
            className="px-2"
          >
            <ArrowLeft /> Back
          </Button>

          {step < 2 ? (
            <Button onClick={() => move(step + 1)} className="px-4">
              Next <ArrowRight />
            </Button>
          ) : (
            <Button asChild className="px-4">
              <Link to={destination}>
                Get started <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
        <p
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 text-center text-[11px] text-muted-foreground"
        >
          {step + 1} of 3 · Your clearer day starts here.
        </p>
      </footer>
    </section>
  );
}
