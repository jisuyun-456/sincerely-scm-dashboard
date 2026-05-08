import { cn } from "@/lib/utils";

type Variant = "critical" | "high" | "medium" | "low";

interface Props {
  count: number;
  max?: number;
  variant?: Variant;
  className?: string;
}

const VARIANT_BG: Record<Variant, string> = {
  critical: "bg-destructive",
  high: "bg-crail",
  medium: "bg-warning",
  low: "bg-smoke",
};

export function PriorityBar({
  count,
  max = 8,
  variant = "high",
  className,
}: Props) {
  const filled = Math.min(count, max);
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`${count} items`}
    >
      {Array.from({ length: filled }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn("h-2 w-2 rounded-sm", VARIANT_BG[variant])}
        />
      ))}
    </span>
  );
}
