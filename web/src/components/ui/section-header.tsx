import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  meta?: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export function SectionHeader({
  title,
  meta,
  className,
  onClick,
  active,
}: Props) {
  const interactive = Boolean(onClick);
  const Wrapper = interactive ? "button" : "div";
  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-baseline justify-between gap-3 border-b border-divider/70 px-6 py-4 text-left",
        interactive &&
          "transition-colors hover:bg-divider/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:bg-divider/40",
        className,
      )}
      aria-expanded={interactive ? active : undefined}
    >
      <h2 className="font-display text-lg font-medium text-ink leading-tight">
        {title}
      </h2>
      {meta ? (
        <span className="text-xs text-smoke whitespace-nowrap">{meta}</span>
      ) : null}
    </Wrapper>
  );
}
