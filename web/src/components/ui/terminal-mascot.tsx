import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// 8-frame loop. Mostly steady "alive" face, with occasional blinks
// and a subtle look-around. Designed to feel present, not chatty.
const FRAMES = [
  "[◉‿◉]",
  "[◉‿◉]",
  "[◐‿◑]",
  "[◑‿◐]",
  "[◉‿◉]",
  "[◉_◉]", // blink
  "[◉‿◉]",
  "[◉‿◉]",
];

const FRAME_MS = 480;

interface Props {
  className?: string;
}

export function TerminalMascot({ className }: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setI((prev) => (prev + 1) % FRAMES.length);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={cn(
        "inline-block font-mono text-orange-warm tabular-nums select-none",
        className,
      )}
      aria-label="agentic os mascot"
      role="img"
    >
      {FRAMES[i]}
    </span>
  );
}
