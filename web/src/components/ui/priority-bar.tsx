import { cn } from "@/lib/utils";

interface Props {
  count: number;
  max?: number;
  variant?: "critical" | "high" | "medium" | "low";
  className?: string;
}

const VARIANT_COLOR: Record<NonNullable<Props["variant"]>, string> = {
  critical: "text-destructive",
  high: "text-orange-warm",
  medium: "text-warning",
  low: "text-zinc-500",
};

export function PriorityBar({
  count,
  max = 10,
  variant = "high",
  className,
}: Props) {
  const filled = Math.min(count, max);
  return (
    <span
      className={cn(
        "font-mono text-xs tracking-tighter",
        VARIANT_COLOR[variant],
        className,
      )}
      aria-label={`${count} items`}
    >
      {"▮".repeat(filled)}
    </span>
  );
}
