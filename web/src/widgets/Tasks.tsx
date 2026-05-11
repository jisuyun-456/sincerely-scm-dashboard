import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { PriorityBar } from "@/components/ui/priority-bar";
import { InlineProgress } from "@/components/ui/inline-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { TaskDetail, type TaskTab } from "@/widgets/TaskDetail";
import { TaskModal } from "@/widgets/TaskModal";
import type { FeatureList, Task } from "@/types/feature-list";

type Row = {
  snapshot_date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  done: number;
};

const ROWS: { key: "critical" | "high" | "medium" | "low"; label: string }[] = [
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

const FEATURE_LIST_URL =
  "https://raw.githubusercontent.com/jisuyun-456/sincerely-scm-pipeline/main/.claude/feature_list.json";

export function Tasks() {
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Detail state
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<TaskTab>("all");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("snapshot_date, critical, high, medium, low, done")
        .order("snapshot_date", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) setError(error.message);
      else setRow((data?.[0] as Row | undefined) ?? null);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const open = row ? row.critical + row.high + row.medium + row.low : 0;
  const done = row?.done ?? 0;
  const total = open + done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const meta = row ? `${total} total` : "Loading";

  const handleToggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      // Lazy fetch task detail on first expand
      if (next && tasks === null && tasksError === null) {
        fetch(FEATURE_LIST_URL)
          .then((r) => {
            if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
            return r.json() as Promise<FeatureList>;
          })
          .then((data) => setTasks(data.tasks ?? []))
          .catch((e: unknown) =>
            setTasksError(e instanceof Error ? e.message : String(e)),
          );
      }
      return next;
    });
  };

  return (
    <>
    <Card>
      <SectionHeader
        title="Tasks · Open"
        meta={
          <span className="inline-flex items-center gap-2">
            <span>{meta}</span>
            <span aria-hidden className="text-smoke/60">
              {expanded ? "▴" : "▾"}
            </span>
          </span>
        }
        onClick={handleToggle}
        active={expanded}
      />

      <div className="px-6 py-5 text-sm">
        {!loaded ? (
          <div className="space-y-3">
            {ROWS.map((r) => (
              <div
                key={r.key}
                className="grid grid-cols-[80px_1fr_auto] items-center gap-3"
              >
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-xs text-destructive">⚠ {error}</div>
        ) : !row ? (
          <div className="space-y-1 text-smoke">
            <div className="text-sm">No snapshot yet</div>
            <div className="text-xs text-smoke/70">
              Trigger sync.yml to populate.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {ROWS.map((r) => (
              <div
                key={r.key}
                className="grid grid-cols-[80px_1fr_auto] items-center gap-3"
              >
                <span className="text-smoke">{r.label}</span>
                <PriorityBar count={row[r.key]} variant={r.key} />
                <span className="text-right tnum text-ink">{row[r.key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {row ? (
        <div className="border-t border-divider/70 px-6 py-4">
          <InlineProgress value={pct} current={done} total={total} />
        </div>
      ) : null}

      {expanded ? (
        tasks === null && tasksError === null ? (
          <div className="border-t border-divider/70 px-6 py-4 text-xs text-smoke">
            Loading task list…
          </div>
        ) : tasksError ? (
          <div className="border-t border-divider/70 px-6 py-4 text-xs text-destructive">
            ⚠ {tasksError}
          </div>
        ) : (
          <div className="border-t border-divider/70 max-h-[440px] overflow-y-auto">
            <TaskDetail
              tasks={tasks ?? []}
              activeTab={tab}
              onTabChange={setTab}
              onSelect={setSelectedTask}
            />
          </div>
        )
      ) : null}
    </Card>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </>
  );
}
