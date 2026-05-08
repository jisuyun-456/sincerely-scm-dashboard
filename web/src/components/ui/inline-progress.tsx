import { cn } from "@/lib/utils";

interface Props {
  value: number;        // 0..100
  total?: number;       // optional denominator label
  current?: number;     // optional numerator label
  label?: string;       // override label, e.g. "DONE"
  segments?: number;    // total bar segments (default 20)
  className?: string;
}

export function InlineProgress({
  value,
  total,
  current,
  label = "DONE",
  segments = 20,
  className,
}: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const filled = Math.round((pct / 100) * segments);
  const empty = segments - filled;
  const fractionLabel =
    typeof total === "number" && typeof current === "number"
      ? ` (${current}/${total})`
      : "";

  return (
    <div
      className={cn(
        "flex items-center gap-3 font-mono text-xs text-zinc-400",
        className,
      )}
    >
      <span aria-hidden className="tracking-tighter">
        <span className="text-orange-warm">{"█".repeat(filled)}</span>
        <span className="text-zinc-800">{"░".repeat(empty)}</span>
      </span>
      <span className="text-zinc-500">
        {pct}% {label}
        {fractionLabel}
      </span>
    </div>
  );
}
