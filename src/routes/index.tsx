import { LegalLinks } from "@/components/taskflow/LegalLinks";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, Play, Timer } from "lucide-react";
import { Logo } from "@/components/taskflow/Logo";
import { Button } from "@/components/ui/button";
import { session } from "@/lib/api";
import { MobileWelcome } from "@/components/taskflow/MobileWelcome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskFlow - Know what to do next." },
      {
        name: "description",
        content:
          "Turn a list of tasks into a clear daily plan. Find your next move, make time to focus, and see the shape of your week.",
      },
      { property: "og:title", content: "TaskFlow - Know what to do next." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [signedIn, setSignedIn] = useState(false);
  const [preview, setPreview] = useState<"next" | "focus" | "agenda">("next");
  useEffect(() => setSignedIn(Boolean(session.getToken())), []);
  const destination = signedIn ? "/dashboard" : "/register";
  return (
    <>
      <MobileWelcome destination={destination} />
      <div className="landing-page hidden md:block">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link to="/" aria-label="TaskFlow home">
            <Logo />
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-2 sm:gap-5">
            <a
              href="#how-it-works"
              className="hidden min-h-11 items-center text-sm text-muted-foreground sm:flex"
            >
              A clearer day
            </a>
            <Button variant="ghost" className="px-2 sm:px-5" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button className="px-3 sm:px-5" asChild>
              <Link to={destination}>
                <span className="sm:hidden">{signedIn ? "Planner" : "Start"}</span>
                <span className="hidden sm:inline">
                  {signedIn ? "Open planner" : "Get started"}
                </span>
                <ArrowUpRight />
              </Link>
            </Button>
          </nav>
        </header>
        <main>
          <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:pb-24">
            <div>
              <p className="eyebrow">LESS JUGGLING. MORE DOING.</p>
              <h1 className="mt-5 max-w-lg text-[clamp(2.7rem,5.5vw,4.5rem)] font-semibold leading-[1.06] tracking-[-0.055em]">
                Know what
                <br />
                to do <span className="text-primary-dark">next.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Your tasks, a clear daily plan. TaskFlow helps you find a starting point, make room
                to focus, and move forward one thing at a time.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to={destination}>
                    {signedIn ? "Go to dashboard" : "Start planning"}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                A practical place for work. And everything around it.
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
              <div className="flex items-center justify-between border-b pb-4">
                <p className="text-sm font-semibold">A day with a little direction</p>
                <span className="ml-2 text-[10px] text-muted-foreground">PRODUCT PREVIEW</span>
              </div>
              <div
                role="tablist"
                aria-label="Explore TaskFlow"
                className="my-4 flex gap-1 border-b"
              >
                {(
                  [
                    ["next", "Next Move"],
                    ["focus", "Focus Session"],
                    ["agenda", "Agenda"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    id={`preview-tab-${key}`}
                    aria-controls={`preview-panel-${key}`}
                    tabIndex={preview === key ? 0 : -1}
                    aria-selected={preview === key}
                    onClick={() => setPreview(key)}
                    onKeyDown={(e) => {
                      const keys = ["next", "focus", "agenda"] as const;
                      const index = keys.indexOf(key);
                      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        const next = keys[(index + (e.key === "ArrowRight" ? 1 : 2)) % 3]!;
                        setPreview(next);
                        document.getElementById(`preview-tab-${next}`)?.focus();
                      }
                    }}
                    className={`min-h-11 flex-1 border-b-2 px-1 text-xs sm:text-sm ${preview === key ? "border-primary font-semibold text-primary-dark" : "border-transparent text-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`preview-panel-${preview}`}
                aria-labelledby={`preview-tab-${preview}`}
                className="min-h-[280px]"
              >
                {preview === "next" ? (
                  <>
                    <p className="eyebrow mt-5 text-primary-dark">
                      YOUR NEXT MOVE <ArrowUpRight className="ml-1 inline h-3 w-3" />
                    </p>
                    <p className="mt-5 text-xs text-pending-strong">Due today · High priority</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight">
                      Give your idea a first draft.
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      It doesn't have to be perfect. Start with the outline and let the details
                      follow.
                    </p>
                    <div className="my-5 flex items-center gap-2 border-y py-3 text-sm">
                      <Check className="h-4 w-4 text-completed-strong" />
                      <span className="text-muted-foreground line-through">Gather your notes</span>
                      <span className="ml-auto text-xs text-muted-foreground">1 / 3</span>
                    </div>
                    <Button variant="outline" onClick={() => setPreview("focus")}>
                      <Timer /> Try the focus preview
                    </Button>
                  </>
                ) : preview === "focus" ? (
                  <div className="py-4 text-center">
                    <p className="eyebrow">ONE THING AT A TIME</p>
                    <h2 className="mt-3 text-base font-medium">Give your idea a first draft.</h2>
                    <p className="my-6 text-6xl font-medium tracking-tight tabular-nums">
                      25<span className="text-muted-foreground">:</span>00
                    </p>
                    <Button asChild>
                      <Link to={destination}>
                        <Play /> Make time for your work
                      </Link>
                    </Button>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Start, pause, and pick up where you left off.
                    </p>
                  </div>
                ) : (
                  <div className="py-3">
                    <p className="eyebrow">A LITTLE SPACE FOR EVERYTHING</p>
                    <div className="my-4 grid grid-cols-7 gap-1">
                      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                        <div
                          key={i}
                          className={`rounded-lg py-2 text-center ${i === 2 ? "bg-primary-soft text-primary-dark" : "text-muted-foreground"}`}
                        >
                          <p className="text-[10px]">{d}</p>
                          <p className="mt-2 text-sm font-semibold">{12 + i}</p>
                        </div>
                      ))}
                    </div>
                    {[
                      ["9:00 AM", "First draft", "High priority"],
                      ["2:30 PM", "A walk outside", "Personal"],
                    ].map(([time, title, meta]) => (
                      <div key={title} className="flex gap-3 border-t py-4">
                        <span className="w-14 shrink-0 text-xs text-muted-foreground">{time}</span>
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-5 border-t pt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>A little progress adds up.</span>
                  <span>1 of 3 complete</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-muted">
                  <div className="h-1 w-1/3 rounded-full bg-completed-strong" />
                </div>
              </div>
            </div>
          </section>
          <section id="how-it-works" className="border-y bg-card">
            <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
              <div className="mb-10 grid gap-3 md:grid-cols-2">
                <p className="eyebrow">A PLAN YOU CAN ACTUALLY USE</p>
                <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight">
                  A task list is a start.
                  <br />A next step is better.
                </h2>
              </div>
              <div className="grid gap-8 md:grid-cols-3">
                {[
                  {
                    icon: ArrowUpRight,
                    title: "Next Move",
                    copy: "Skip the daily reshuffle. Deadlines, priorities, and work already in motion point you toward one useful next step.",
                  },
                  {
                    icon: CalendarDays,
                    title: "Visual Calendar",
                    copy: "See the shape of your month, then narrow in on today. Your agenda stays readable, even on the smallest screen.",
                  },
                  {
                    icon: Bell,
                    title: "Thoughtful Reminders",
                    copy: "A daily nudge or a reminder before a deadline. Set the hour that works for you, and leave the rest to your plan.",
                  },
                ].map(({ icon: Icon, title, copy }, i) => (
                  <article key={title} className="border-t pt-5">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-primary-dark" />
                      <span className="text-xs text-muted-foreground">0{i + 1}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
          <section className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14 sm:px-8">
            <div>
              <p className="eyebrow">START SMALL. KEEP GOING.</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Make room for your next move.
              </h2>
            </div>
            <Button size="lg" asChild>
              <Link to={destination}>
                Start planning
                <ArrowRight />
              </Link>
            </Button>
          </section>
        </main>
        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t px-5 py-6 text-xs text-muted-foreground sm:px-8">
          <Logo />
          <p>TaskFlow. A clearer day, one task at a time.</p>
          <LegalLinks />
          <Link to="/login" className="flex min-h-11 items-center hover:text-foreground">
            Your workspace <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </footer>
      </div>
    </>
  );
}
