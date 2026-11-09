import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground shadow-soft transition-all duration-200 placeholder:text-muted-foreground/80 hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
