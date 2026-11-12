import { Link } from "@tanstack/react-router";
export function LegalLinks() {
  return (
    <nav
      aria-label="Legal"
      className="flex flex-wrap items-center justify-center gap-x-4 text-xs text-muted-foreground"
    >
      <Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-foreground">
        Privacy
      </Link>
      <Link to="/terms" className="inline-flex min-h-11 items-center hover:text-foreground">
        Terms
      </Link>
    </nav>
  );
}
