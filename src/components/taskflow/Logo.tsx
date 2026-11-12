import { cn } from "@/lib/utils";

export function LogoMark({
  className,
  inverted = false,
}: {
  className?: string | undefined;
  inverted?: boolean | undefined;
}) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
        inverted ? "bg-white/15 text-white" : "bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="h-9 w-9" fill="none">
        <path
          d="M14 19L34 19M14 29L28 29M14 39L22 39"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity=".65"
        />
        <path
          d="M29 39L36 46L50 23M41 23L50 23L50 32"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  inverted = false,
  iconOnly = false,
}: {
  className?: string | undefined;
  inverted?: boolean | undefined;
  iconOnly?: boolean | undefined;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label={iconOnly ? "TaskFlow" : undefined}
    >
      <LogoMark inverted={inverted} />
      {!iconOnly && (
        <span
          className={cn(
            "text-xl font-semibold tracking-[-0.045em]",
            inverted ? "text-primary-foreground" : "text-foreground",
          )}
        >
          Task<span className={inverted ? "opacity-80" : "text-primary"}>Flow</span>
        </span>
      )}
    </span>
  );
}
