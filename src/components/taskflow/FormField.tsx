import { useState, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      className="mt-1.5 flex animate-fade-up items-center gap-1.5 text-sm text-destructive"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: ReactNode | undefined;
  labelAside?: ReactNode | undefined;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string | undefined;
  }) => ReactNode;
}

export function Field({ id, label, error, hint, labelAside, children }: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>

        {labelAside}
      </div>

      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
      })}

      {error ? (
        <FieldError id={errorId} message={error} />
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type PasswordInputProps = React.ComponentProps<typeof Input>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", className)} />

      <button
        type="button"
        onClick={() => setVisible((currentVisible) => !currentVisible)}
        className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function FormAlert({ message }: { message?: string | null | undefined }) {
  return (
    <div aria-live="assertive">
      {message ? (
        <div
          role="alert"
          className="flex animate-fade-up items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
