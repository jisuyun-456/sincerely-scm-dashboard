import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse-soft rounded-sm bg-zinc-800/60",
        className,
      )}
      {...props}
    />
  );
}
