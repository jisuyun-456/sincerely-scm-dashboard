import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "flat";

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { direction: Direction; text: string };
  footer?: ReactNode;
  className?: string;
}

const DELTA_GLYPH: Record<Direction, string> = {
  up: "▲",
  down: "▼",
  flat: "─",
};

const DELTA_COLOR: Record<Direction, string> = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-zinc-500",
};

export function KpiStat({
  label,
  value,
  unit,
  delta,
  footer,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-[11px] uppercase tracking-[0.05em] text-zinc-500">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-medium tabular-nums text-zinc-50">
          {value}
        </span>
        {unit ? (
          <span className="text-sm text-zinc-400">{unit}</span>
        ) : null}
        {delta ? (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 text-xs font-mono",
              DELTA_COLOR[delta.direction],
            )}
          >
            <span aria-hidden>{DELTA_GLYPH[delta.direction]}</span>
            <span>{delta.text}</span>
          </span>
        ) : null}
      </div>
      {footer ? (
        <div className="text-[10px] uppercase tracking-wide text-zinc-600">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
