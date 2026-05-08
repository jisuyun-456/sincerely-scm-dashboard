import { cn } from "@/lib/utils";

type Variant = "ok" | "failed" | "pending" | "live" | "warning" | "running";

const GLYPH: Record<Variant, string> = {
  ok: "●",
  failed: "✗",
  pending: "○",
  live: "◉",
  warning: "▲",
  running: "●",
};

const COLOR: Record<Variant, string> = {
  ok: "text-success",
  failed: "text-destructive",
  pending: "text-zinc-600",
  live: "text-orange-warm animate-pulse-soft",
  warning: "text-warning",
  running: "text-orange-warm animate-pulse-soft",
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
        "inline-flex items-center gap-1.5 text-xs uppercase tracking-wide",
        className,
      )}
    >
      <span className={cn("font-bold", COLOR[variant])} aria-hidden>
        {GLYPH[variant]}
      </span>
      {label ? <span className="text-zinc-300">{label}</span> : null}
    </span>
  );
}
