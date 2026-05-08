import { cn } from "@/lib/utils";

interface Props {
  value: number; // 0..100
  total?: number;
  current?: number;
  label?: string;
  className?: string;
}

export function InlineProgress({
  value,
  total,
  current,
  label = "Done",
  className,
}: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const fractionLabel =
    typeof total === "number" && typeof current === "number"
      ? ` (${current}/${total})`
      : "";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-divider/60">
        <div
          className="h-full rounded-full bg-crail transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-smoke">
        <span>
          {pct}% {label}
        </span>
        <span className="tnum">{fractionLabel.trim().slice(1, -1)}</span>
      </div>
    </div>
  );
}
