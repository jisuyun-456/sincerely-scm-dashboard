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
  up: "↑",
  down: "↓",
  flat: "—",
};

const DELTA_COLOR: Record<Direction, string> = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-smoke",
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
      <div className="text-xs uppercase tracking-editorial text-smoke">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-medium tnum text-ink">
          {value}
        </span>
        {unit ? <span className="text-sm text-smoke">{unit}</span> : null}
        {delta ? (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 text-xs",
              DELTA_COLOR[delta.direction],
            )}
          >
            <span aria-hidden>{DELTA_GLYPH[delta.direction]}</span>
            <span>{delta.text}</span>
          </span>
        ) : null}
      </div>
      {footer ? <div className="text-xs text-smoke">{footer}</div> : null}
    </div>
  );
}
