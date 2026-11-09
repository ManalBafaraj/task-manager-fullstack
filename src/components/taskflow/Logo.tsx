import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M4 7.5h9M4 12h6M4 16.5h4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity=".55"
        />
        <path
          d="m12.5 14.5 2.6 2.6L20.5 11"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={inverted ? "bg-primary-foreground/15 shadow-none" : undefined} />
      <span
        className={cn(
          "text-xl font-bold tracking-tight",
          inverted ? "text-primary-foreground" : "text-foreground",
        )}
      >
        Task<span className={inverted ? "opacity-80" : "text-primary"}>Flow</span>
      </span>
    </span>
  );
}
