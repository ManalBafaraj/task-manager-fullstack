import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CalendarDays, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/api";
import type { Task } from "@/lib/tasks";
import { Logo } from "./Logo";
import { NotificationCenter } from "./NotificationCenter";

function initials(name?: string) {
  if (!name) return "TF";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function NavContent({
  user,
  tasks,
  onLogout,
  onNavigate,
}: {
  user: User | null;
  tasks: Task[];
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-8 pt-7">
        <Logo />
      </div>

      <nav aria-label="Main" className="flex-1 px-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Menu
        </p>

        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          activeProps={{
            className: "bg-accent text-accent-foreground",
            "aria-current": "page",
          }}
        >
          <LayoutDashboard className="h-[18px] w-[18px]" aria-hidden="true" />
          Dashboard
        </Link>
        <Link
          to="/calendar"
          onClick={onNavigate}
          className="mt-1 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          activeProps={{
            className: "bg-accent text-accent-foreground",
            "aria-current": "page",
          }}
        >
          <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />
          Calendar
        </Link>
        <Link
          to="/notifications"
          onClick={onNavigate}
          className="mt-1 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          activeProps={{
            className: "bg-accent text-accent-foreground",
            "aria-current": "page",
          }}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          Notifications
        </Link>
      </nav>

      <div className="space-y-2 border-t p-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark"
            aria-hidden="true"
          >
            {initials(user?.name)}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.name ?? "Guest"}
            </p>

            <p className="truncate text-xs text-muted-foreground">
              {user?.email ?? "Preview mode"}
            </p>
          </div>
        </div>

        <Button
          variant="ghost-danger"
          className="w-full justify-start px-3 font-medium"
          onClick={onLogout}
        >
          <LogOut aria-hidden="true" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  tasks = [],
  onLogout,
  children,
}: {
  user: User | null;
  tasks?: Task[] | undefined;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-sidebar lg:block">
        <NavContent user={user} tasks={tasks} onLogout={onLogout} />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/85 px-4 backdrop-blur-md lg:hidden">
        <Logo />

        <div className="flex items-center gap-2">
          <NotificationCenter tasks={tasks} userKey={user?.email ?? "guest"} />

          <Button
            variant="outline"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu />
          </Button>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[85%] max-w-xs bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          <SheetDescription className="sr-only">Main navigation and account</SheetDescription>

          <NavContent
            user={user}
            tasks={tasks}
            onNavigate={() => setOpen(false)}
            onLogout={() => {
              setOpen(false);
              onLogout();
            }}
          />
        </SheetContent>
      </Sheet>

      <main id="main" className="lg:pl-64">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
