"use client";

import * as React from "react";
import { Check, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 44;
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const PERIODS = ["AM", "PM"] as const;

type Period = (typeof PERIODS)[number];

function parseTime(value: string) {
  const [rawHour = "9", rawMinute = "0"] = (
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "09:00"
  ).split(":");
  const hour24 = Number(rawHour);
  const minute = Number(rawMinute);

  return {
    hour: hour24 % 12 || 12,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
    period: (hour24 >= 12 ? "PM" : "AM") as Period,
  };
}

function to24Hour(hour: number, period: Period) {
  if (period === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function formatValue(hour: number, minute: number, period: Period) {
  return `${String(to24Hour(hour, period)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatLabel(value: string) {
  const { hour, minute, period } = parseTime(value);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

function WheelColumn<T extends string | number>({
  label,
  values,
  value,
  format = String,
  onChange,
  flushers,
}: {
  label: string;
  values: readonly T[];
  value: T;
  format?: (value: T) => string;
  onChange: (value: T) => void;
  flushers: React.RefObject<Map<string, () => void>>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = React.useId();
  const latest = React.useRef({ value, onChange });
  React.useLayoutEffect(() => {
    latest.current = { value, onChange };
  }, [value, onChange]);
  const selectedIndex = Math.max(0, values.indexOf(value));

  React.useEffect(() => {
    ref.current?.scrollTo({ top: selectedIndex * ITEM_HEIGHT });
  }, [selectedIndex]);

  React.useLayoutEffect(() => {
    const callbacks = flushers.current;
    callbacks.set(label, () => {
      if (!timer.current || !ref.current) return;
      clearTimeout(timer.current);
      timer.current = null;
      const index = Math.max(
        0,
        Math.min(values.length - 1, Math.round(ref.current.scrollTop / ITEM_HEIGHT)),
      );
      const next = values[index];
      if (next !== undefined && next !== latest.current.value) latest.current.onChange(next);
    });
    return () => {
      callbacks.delete(label);
    };
  }, [flushers, label, values]);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="relative min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-1/2 z-0 h-11 -translate-y-1/2 rounded-xl bg-primary-soft ring-1 ring-primary/15"
      />
      <div
        ref={ref}
        role="listbox"
        data-time-wheel
        aria-label={label}
        aria-activedescendant={`${id}-${selectedIndex}`}
        tabIndex={0}
        onKeyDown={(event) => {
          let index = selectedIndex;
          switch (event.key) {
            case "ArrowDown":
              index++;
              break;
            case "ArrowUp":
              index--;
              break;
            case "Home":
              index = 0;
              break;
            case "End":
              index = values.length - 1;
              break;
            case "PageDown":
              index += 5;
              break;
            case "PageUp":
              index -= 5;
              break;
            default:
              return;
          }
          event.preventDefault();
          if (timer.current) clearTimeout(timer.current);
          const next = values[Math.max(0, Math.min(values.length - 1, index))];
          if (next !== undefined) onChange(next);
        }}
        onScroll={(event) => {
          if (timer.current) clearTimeout(timer.current);
          const target = event.currentTarget;
          timer.current = setTimeout(() => {
            timer.current = null;
            const index = Math.min(
              values.length - 1,
              Math.max(0, Math.round(target.scrollTop / ITEM_HEIGHT)),
            );
            const nextValue = values[index];
            if (nextValue !== undefined && nextValue !== latest.current.value)
              latest.current.onChange(nextValue);
            target.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
          }, 90);
        }}
        className="relative z-10 h-[220px] snap-y snap-mandatory overflow-y-auto overscroll-contain py-[88px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {values.map((item) => {
          const selected = item === value;
          return (
            <button
              key={String(item)}
              type="button"
              role="option"
              id={`${id}-${values.indexOf(item)}`}
              tabIndex={-1}
              aria-selected={selected}
              onClick={() => {
                if (timer.current) clearTimeout(timer.current);
                ref.current?.focus();
                const index = values.indexOf(item);
                onChange(item);
                ref.current?.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
              }}
              className={cn(
                "flex h-11 w-full snap-center focus-visible:outline-none items-center justify-center rounded-xl text-sm tabular-nums transition-[color,opacity]",
                selected
                  ? "font-semibold text-primary-dark"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {format(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimeWheelPicker({
  value,
  onChange,
  disabled,
  className,
  ...triggerProps
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onChange">) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseTime(value);
  const currentValue = React.useRef(parsed);
  const flushers = React.useRef(new Map<string, () => void>());
  React.useLayoutEffect(() => {
    currentValue.current = parseTime(value);
  }, [value]);

  const update = (next: Partial<typeof parsed>) => {
    const merged = { ...currentValue.current, ...next };
    currentValue.current = merged;
    onChange(formatValue(merged.hour, merged.minute, merged.period));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-4 text-left text-sm font-medium text-foreground shadow-soft transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...triggerProps}
        >
          <span className="tabular-nums">{formatLabel(value)}</span>
          <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        aria-label="Choose reminder time"
        className="max-h-[var(--radix-popover-content-available-height)] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-4 shadow-lift"
      >
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">Choose reminder time</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Scroll each column to set the time.
          </p>
        </div>

        <div className="relative grid grid-cols-[1fr_1fr_0.9fr] gap-1 overflow-hidden rounded-2xl border bg-muted/30 px-2">
          <WheelColumn
            label="Hour"
            flushers={flushers}
            values={HOURS}
            value={parsed.hour}
            onChange={(hour) => update({ hour })}
            format={(hour) => String(hour).padStart(2, "0")}
          />
          <WheelColumn
            label="Minute"
            flushers={flushers}
            values={MINUTES}
            value={parsed.minute}
            onChange={(minute) => update({ minute })}
            format={(minute) => String(minute).padStart(2, "0")}
          />
          <WheelColumn
            label="Period"
            flushers={flushers}
            values={PERIODS}
            value={parsed.period}
            onChange={(period) => update({ period })}
          />
        </div>

        <Button
          type="button"
          size="sm"
          className="mt-4 w-full"
          onClick={() => {
            flushers.current.forEach((flush) => flush());
            setOpen(false);
          }}
        >
          <Check className="h-4 w-4" />
          Done
        </Button>
      </PopoverContent>
    </Popover>
  );
}
