import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Priority, Task } from "@/types/feature-list";

export type TaskTab = "all" | Priority;

const TAB_LABELS: Record<TaskTab, string> = {
  all: "All",
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  done: "Done",
};

const TAB_ORDER: TaskTab[] = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
  "done",
];

const PRIORITY_DOT: Record<Priority, string> = {
  critical: "bg-destructive",
  high: "bg-crail",
  medium: "bg-warning",
  low: "bg-smoke",
  done: "bg-success",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  done: "Done",
};

interface Props {
  tasks: Task[];
  activeTab: TaskTab;
  onTabChange: (tab: TaskTab) => void;
  onSelect?: (task: Task) => void;
  className?: string;
}

export function TaskDetail({
  tasks,
  activeTab,
  onTabChange,
  onSelect,
  className,
}: Props) {
  const counts = useMemo(() => {
    const c: Record<TaskTab, number> = {
      all: tasks.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      done: 0,
    };
    for (const t of tasks) {
      if (t.priority in c) {
        c[t.priority] = (c[t.priority] ?? 0) + 1;
      }
    }
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return tasks;
    return tasks.filter((t) => t.priority === activeTab);
  }, [tasks, activeTab]);

  return (
    <div className={cn("animate-fade-in", className)}>
      {/* Tab strip */}
      <div className="flex flex-wrap gap-1 border-b border-divider/70 px-6 py-3">
        {TAB_ORDER.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                active
                  ? "bg-crail text-white"
                  : "text-smoke hover:bg-divider/40 hover:text-ink",
              )}
            >
              {TAB_LABELS[tab]}{" "}
              <span
                className={cn(
                  "ml-1 tnum",
                  active ? "text-white/80" : "text-smoke/70",
                )}
              >
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <ul className="divide-y divide-divider/40">
        {filtered.length === 0 ? (
          <li className="px-6 py-6 text-center text-xs text-smoke">
            No tasks in this priority.
          </li>
        ) : (
          filtered.map((t) => (
            <li
              key={t.id}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onClick={() => onSelect?.(t)}
              onKeyDown={(e) => {
                if (onSelect && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(t);
                }
              }}
              className={cn(
                "grid grid-cols-[auto_72px_1fr_auto] items-baseline gap-3 px-6 py-3 hover:bg-divider/20",
                onSelect && "cursor-pointer",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full self-center",
                  PRIORITY_DOT[t.priority],
                )}
              />
              <span className="font-mono text-[11px] text-smoke">{t.id}</span>
              <span className="text-sm text-ink leading-snug">
                {t.title}
                {t.notes ? (
                  <span className="block text-xs text-smoke leading-snug mt-0.5">
                    {t.notes}
                  </span>
                ) : null}
              </span>
              <span className="text-[11px] text-smoke/80 uppercase tracking-editorial">
                {t.domain} · {PRIORITY_LABEL[t.priority]}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
