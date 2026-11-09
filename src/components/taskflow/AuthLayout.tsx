import type { ReactNode } from "react";
import { CheckCircle2, Circle, Loader } from "lucide-react";
import { Logo } from "./Logo";

function PreviewRow({
  icon,
  title,
  meta,
  done,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-primary-foreground/10 px-4 py-3 backdrop-blur-sm">
      {icon}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium text-primary-foreground ${done ? "line-through opacity-70" : ""}`}
        >
          {title}
        </p>
        <p className="text-xs text-primary-foreground/65">{meta}</p>
      </div>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-gradient-auth p-12 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 auth-grid" aria-hidden="true" />
        <Logo inverted className="relative" />

        <div className="relative my-auto max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-primary-foreground">
            Calm, focused task management for your everyday.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/75">
            Capture what matters, track progress and enjoy the satisfaction of checking things off.
          </p>

          <div className="mt-10 space-y-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-4 shadow-lift">
            <PreviewRow
              icon={<CheckCircle2 className="h-5 w-5 shrink-0 text-completed" />}
              title="Read “Deep Work” — chapter 4"
              meta="Completed"
              done
            />
            <PreviewRow
              icon={<Loader className="h-5 w-5 shrink-0 text-primary-foreground" />}
              title="Finalize portfolio case study"
              meta="In progress"
            />
            <PreviewRow
              icon={<Circle className="h-5 w-5 shrink-0 text-pending" />}
              title="Book dentist appointment"
              meta="Pending"
            />
          </div>
        </div>

        <p className="relative text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} TaskFlow
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px] animate-fade-up">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
