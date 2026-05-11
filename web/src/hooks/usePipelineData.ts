import { useState, useEffect } from "react";
import {
  PipelineData,
  PipelinePeriodMeta,
  fetchLatestPipeline,
  fetchPipelineHistory,
  fetchPipelinePeriod,
} from "@/lib/pipeline";

interface UsePipelineDataResult {
  latest: PipelineData | null;
  history: PipelineData[];
  historyMeta: PipelinePeriodMeta[];
  loading: boolean;
  error: string | null;
}

export function usePipelineData(historyCount = 6): UsePipelineDataResult {
  const [latest, setLatest] = useState<PipelineData | null>(null);
  const [history, setHistory] = useState<PipelineData[]>([]);
  const [historyMeta, setHistoryMeta] = useState<PipelinePeriodMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [latestData, allMeta] = await Promise.all([
          fetchLatestPipeline(),
          fetchPipelineHistory(),
        ]);
        if (cancelled) return;

        const weeklyMeta = allMeta
          .filter((m) => m.mode === "weekly_review")
          .sort((a, b) => b.key.localeCompare(a.key))
          .slice(0, historyCount);

        const historyData = await Promise.all(
          weeklyMeta.map((m) => fetchPipelinePeriod(m.key))
        );
        if (cancelled) return;

        setLatest(latestData);
        setHistoryMeta(weeklyMeta);
        setHistory(historyData);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyCount]);

  return { latest, history, historyMeta, loading, error };
}
