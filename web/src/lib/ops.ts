import { supabase } from "@/lib/supabase";

export type OpsEvent = {
  id: string;
  created_at: string;
  source: "harness" | "hook";
  agent_id: string;
  domain: string | null;
  session_id: string | null;
  week: string | null;
  status: "started" | "completed" | "failed";
  duration_ms: number | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
};

export type AgentStat = {
  agent_id: string;
  count: number;
  last_run: string;
};

export async function fetchRecentEvents(opts?: {
  agentId?: string;
  limit?: number;
}): Promise<OpsEvent[]> {
  let q = supabase
    .from("ops_event")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 40);

  if (opts?.agentId) {
    q = q.eq("agent_id", opts.agentId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as OpsEvent[];
}

export async function fetchAgentStats(): Promise<AgentStat[]> {
  const { data, error } = await supabase
    .from("ops_event")
    .select("agent_id, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  const map = new Map<string, AgentStat>();
  for (const row of data as { agent_id: string; created_at: string }[]) {
    const existing = map.get(row.agent_id);
    if (!existing) {
      map.set(row.agent_id, {
        agent_id: row.agent_id,
        count: 1,
        last_run: row.created_at,
      });
    } else {
      existing.count += 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
