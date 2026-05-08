import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  meta?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, meta, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-zinc-800 px-4 py-2.5",
        className,
      )}
    >
      <h2 className="text-[11px] font-medium uppercase tracking-terminal text-orange-warm">
        {title}
      </h2>
      {meta ? (
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
