import type { ReactNode } from "react";
import { Plus, RotateCw, SearchX, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function StateFrame({
  art,
  title,
  body,
  action,
}: {
  art: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-14 text-center animate-fade-up sm:py-20">
      {art}
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

function EmptyIllustration() {
  return (
    <div className="relative h-32 w-40" aria-hidden="true">
      <div className="absolute inset-x-4 bottom-0 h-4 rounded-full bg-primary-soft blur-md" />
      <div className="absolute left-3 top-6 h-20 w-28 -rotate-6 rounded-2xl border bg-card shadow-card" />
      <div className="absolute left-9 top-2 flex h-24 w-28 rotate-3 flex-col gap-2.5 rounded-2xl border bg-card p-4 shadow-lift">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-md border-2 border-primary/50" />
          <span className="h-2 w-14 rounded-full bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-md border-2 border-primary/30" />
          <span className="h-2 w-10 rounded-full bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-md bg-primary" />
          <span className="h-2 w-12 rounded-full bg-primary-soft" />
        </div>
      </div>
      <span className="absolute -right-1 top-0 grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
        <Plus className="h-4 w-4" />
      </span>
    </div>
  );
}

function IconArt({ children, tone }: { children: ReactNode; tone: "muted" | "danger" }) {
  return (
    <div
      aria-hidden="true"
      className={
        tone === "danger"
          ? "grid h-20 w-20 place-items-center rounded-3xl bg-destructive-soft text-destructive"
          : "grid h-20 w-20 place-items-center rounded-3xl bg-primary-soft text-primary"
      }
    >
      {children}
    </div>
  );
}

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <StateFrame
      art={<EmptyIllustration />}
      title="No tasks yet"
      body="Your list is wonderfully clear. Add your first task and start making progress."
      action={
        <Button size="lg" onClick={onCreate}>
          <Plus /> Create your first task
        </Button>
      }
    />
  );
}

export function NoResultsState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <StateFrame
      art={
        <IconArt tone="muted">
          <SearchX className="h-9 w-9" />
        </IconArt>
      }
      title="No matching tasks"
      body={
        query
          ? `We couldn't find any tasks matching “${query}”. Try another keyword or change the filter.`
          : "There are no tasks with this status right now."
      }
      action={
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}

export function ErrorState({ onRetry, retrying }: { onRetry: () => void; retrying?: boolean }) {
  return (
    <div role="alert">
      <StateFrame
        art={
          <IconArt tone="danger">
            <WifiOff className="h-9 w-9" />
          </IconArt>
        }
        title="Something went wrong"
        body="We couldn't load your tasks. Please check your connection and try again."
        action={
          <Button onClick={onRetry} disabled={retrying}>
            <RotateCw className={retrying ? "animate-spin" : undefined} />
            {retrying ? "Retrying…" : "Try Again"}
          </Button>
        }
      />
    </div>
  );
}
