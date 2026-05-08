import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Priority, Task } from "@/types/feature-list";

const PRIORITY_CHIP: Record<Priority, string> = {
  critical: "bg-destructive text-white",
  high: "bg-crail text-white",
  medium: "bg-warning text-white",
  low: "bg-smoke/30 text-ink",
  done: "bg-success text-white",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  done: "Done",
};

interface Props {
  task: Task;
  onClose: () => void;
}

export function TaskModal({ task, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-xl border border-divider/70 bg-card shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-smoke">{task.id}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                PRIORITY_CHIP[task.priority],
              )}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
            <span className="rounded-full border border-divider/70 px-2.5 py-0.5 text-[11px] text-smoke uppercase tracking-editorial">
              {task.domain}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex-shrink-0 text-smoke hover:text-ink transition-colors text-base leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pb-3">
          <h2 className="font-display text-[1.1rem] font-medium text-ink leading-snug">
            {task.title}
          </h2>
        </div>

        {/* Notes */}
        {task.notes ? (
          <div className="mx-6 border-t border-divider/40 py-3">
            <p className="text-sm text-smoke leading-relaxed whitespace-pre-wrap">
              {task.notes}
            </p>
          </div>
        ) : null}

        {/* Metadata footer */}
        {(task.status ?? task.created_at ?? task.completed_at) ? (
          <div className="mx-6 border-t border-divider/40 py-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-smoke/70">
            {task.status && (
              <span>
                Status · <span className="text-smoke">{task.status}</span>
              </span>
            )}
            {task.created_at && (
              <span>
                Created · <span className="text-smoke">{task.created_at}</span>
              </span>
            )}
            {task.completed_at && (
              <span>
                Completed ·{" "}
                <span className="text-smoke">{task.completed_at}</span>
              </span>
            )}
          </div>
        ) : null}

        <div className="h-5" />
      </div>
    </div>
  );
}
