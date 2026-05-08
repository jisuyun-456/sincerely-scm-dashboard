import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface Props {
  data: { value: number }[];
  height?: number;
  className?: string;
}

export function Sparkline({ data, height = 32, className }: Props) {
  if (!data?.length) {
    return (
      <div
        className={cn("text-xs text-smoke/60", className)}
        style={{ height }}
        aria-hidden
      >
        ──────────
      </div>
    );
  }
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--accent))"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
