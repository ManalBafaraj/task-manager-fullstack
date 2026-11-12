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
    <div className="flex flex-col items-center rounded-xl border bg-card px-5 py-8 text-center animate-fade-up">
      {art}
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

function IconArt({ children, tone }: { children: ReactNode; tone: "muted" | "danger" }) {
  return (
    <div
      aria-hidden="true"
      className={
        tone === "danger"
          ? "grid h-12 w-12 place-items-center rounded-xl bg-destructive-soft text-destructive"
          : "grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary"
      }
    >
      {children}
    </div>
  );
}

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <StateFrame
      art={
        <IconArt tone="muted">
          <Plus className="h-5 w-5" />
        </IconArt>
      }
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
