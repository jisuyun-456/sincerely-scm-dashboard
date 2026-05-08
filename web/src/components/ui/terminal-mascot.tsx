import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Tiny "BoxBot" pixel character — a packaging-bot mascot for Sincerely SCM.
// 12x12 viewBox grid, each cell = 1 SVG unit. Render size set via width/height props.
//
// Color legend:
//   . transparent
//   o body fill (orange-warm)
//   O body outline (darker orange)
//   D dark detail (eyes, shadow)
//   H highlight (antenna ball)

const COLORS: Record<string, string> = {
  ".": "transparent",
  o: "#FF8C42", // orange-warm
  O: "#A85928", // darker outline
  D: "#0a0a0a", // dark
  H: "#FFB880", // antenna highlight
};

// 4-frame eye animation cycle: forward → right → forward → left → forward → blink
const FRAMES: string[][] = [
  // 0: look forward
  [
    "......H.....",
    "......o.....",
    "......o.....",
    ".OOOOOOOOOO.",
    ".OooooooooO.",
    ".OooDooDooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OOOOOOOOOO.",
    ".O........O.",
    ".O........O.",
  ],
  // 1: look right
  [
    "......H.....",
    "......o.....",
    "......o.....",
    ".OOOOOOOOOO.",
    ".OooooooooO.",
    ".OoooDooDoO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OOOOOOOOOO.",
    ".O........O.",
    ".O........O.",
  ],
  // 2: look forward
  [
    "......H.....",
    "......o.....",
    "......o.....",
    ".OOOOOOOOOO.",
    ".OooooooooO.",
    ".OooDooDooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OOOOOOOOOO.",
    ".O........O.",
    ".O........O.",
  ],
  // 3: look left
  [
    "......H.....",
    "......o.....",
    "......o.....",
    ".OOOOOOOOOO.",
    ".OooooooooO.",
    ".OoDooDoooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OOOOOOOOOO.",
    ".O........O.",
    ".O........O.",
  ],
  // 4: look forward
  [
    "......H.....",
    "......o.....",
    "......o.....",
    ".OOOOOOOOOO.",
    ".OooooooooO.",
    ".OooDooDooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OOOOOOOOOO.",
    ".O........O.",
    ".O........O.",
  ],
  // 5: blink
  [
    "......H.....",
    "......o.....",
    "......o.....",
    ".OOOOOOOOOO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OooooooooO.",
    ".OOOOOOOOOO.",
    ".O........O.",
    ".O........O.",
  ],
];

const FRAME_MS = 520;

interface Props {
  className?: string;
  size?: number;
}

export function TerminalMascot({ className, size = 28 }: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setI((prev) => (prev + 1) % FRAMES.length);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, []);

  const rects = useMemo(() => {
    const frame = FRAMES[i];
    const out: { key: string; x: number; y: number; fill: string }[] = [];
    frame.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = COLORS[row[x]];
        if (color && color !== "transparent") {
          out.push({ key: `${x}-${y}`, x, y, fill: color });
        }
      }
    });
    return out;
  }, [i]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      className={cn("animate-hop", className)}
      role="img"
      aria-label="sincerely scm box-bot mascot"
    >
      {rects.map((r) => (
        <rect
          key={r.key}
          x={r.x}
          y={r.y}
          width="1"
          height="1"
          fill={r.fill}
        />
      ))}
    </svg>
  );
}
