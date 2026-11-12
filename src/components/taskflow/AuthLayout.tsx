import { LegalLinks } from "./LegalLinks";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";
import { Logo } from "./Logo";

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
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-6">
        <Link to="/" aria-label="TaskFlow home">
          <Logo />
        </Link>
        <Link
          to="/"
          className="flex min-h-11 shrink-0 items-center gap-1 text-xs text-muted-foreground sm:text-sm"
        >
          Back to home <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>
      <main className="mx-auto grid max-w-5xl gap-12 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:py-8 lg:grid-cols-2 lg:gap-24 lg:py-16">
        <aside className="hidden py-8 lg:block">
          <p className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</p>
          <h2 className="mt-6 text-5xl font-semibold leading-[1.1] tracking-tight">
            Less on your mind.
            <br />
            More in motion.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
            A clear next step, a little focus, and room for everything else.
          </p>
          <div className="mt-10 border-y py-5">
            <p className="eyebrow text-primary-dark">YOUR NEXT MOVE</p>
            <p className="mt-4 text-lg font-semibold">Make a little space for your day.</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-completed-strong" /> One thing at a time is enough.
            </div>
          </div>
        </aside>
        <div className="w-full max-w-[420px] justify-self-center rounded-2xl border bg-card p-5 sm:p-8">
          <h1 className="text-[26px] font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <p className="mt-7 text-center text-sm text-muted-foreground">{footer}</p>
          <div className="mt-4 flex justify-center">
            <LegalLinks />
          </div>
        </div>
      </main>
    </div>
  );
}
