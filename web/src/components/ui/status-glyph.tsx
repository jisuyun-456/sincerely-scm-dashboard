import { cn } from "@/lib/utils";

type Variant = "ok" | "failed" | "pending" | "live" | "warning" | "running";

const COLOR: Record<Variant, string> = {
  ok: "bg-success",
  failed: "bg-destructive",
  pending: "bg-divider",
  live: "bg-crail",
  warning: "bg-warning",
  running: "bg-crail",
};

const PULSE: Record<Variant, boolean> = {
  ok: false,
  failed: false,
  pending: false,
  live: true,
  warning: false,
  running: true,
};

interface Props {
  variant: Variant;
  label?: string;
  className?: string;
}

export function StatusGlyph({ variant, label, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs text-smoke",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          COLOR[variant],
          PULSE[variant] && "animate-pulse-soft",
        )}
      />
      {label ? <span className="text-ink">{label}</span> : null}
    </span>
  );
}
