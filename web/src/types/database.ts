// Hand-rolled Supabase Database type for sincerely-scm-dashboard.
// Run `supabase gen types typescript` later if schema grows complex.

export type Database = {
  public: {
    Tables: {
      tms_kpi: {
        Row: {
          snapshot_date: string;
          active_shipments: number;
          otif_pct: number | null;
          pending_pods: number;
          carrier_breakdown: Record<string, number>;
          created_at: string;
        };
        Insert: {
          snapshot_date: string;
          active_shipments?: number;
          otif_pct?: number | null;
          pending_pods?: number;
          carrier_breakdown?: Record<string, number>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tms_kpi"]["Insert"]>;
      };
      autoresearch_trend: {
        Row: {
          period_key: string;
          domain: string;
          report_mode: string | null;
          period_start: string | null;
          period_end: string | null;
          period_label: string | null;
          kpis: Record<string, number | null>;
          generated_at: string | null;
          created_at: string;
        };
        Insert: {
          period_key: string;
          domain: string;
          report_mode?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          period_label?: string | null;
          kpis?: Record<string, number | null>;
          generated_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["autoresearch_trend"]["Insert"]
        >;
      };
      project_tasks: {
        Row: {
          snapshot_date: string;
          critical: number;
          high: number;
          medium: number;
          low: number;
          done: number;
          created_at: string;
        };
        Insert: {
          snapshot_date: string;
          critical?: number;
          high?: number;
          medium?: number;
          low?: number;
          done?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_tasks"]["Insert"]
        >;
      };
      agent_events: {
        Row: {
          id: number;
          event_at: string;
          agent_name: string | null;
          status: string;
          tool_name: string | null;
          duration_ms: number | null;
          session_id: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          event_at?: string;
          agent_name?: string | null;
          status: string;
          tool_name?: string | null;
          duration_ms?: number | null;
          session_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["agent_events"]["Insert"]>;
      };
      autoresearch_log: {
        Row: {
          log_date: string;
          entry_type: string;
          title: string;
          status: string | null;
          output_link: string | null;
          raw_content: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["autoresearch_log"]["Row"],
          "created_at"
        > & { created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["autoresearch_log"]["Insert"]
        >;
      };
      sync_runs: {
        Row: {
          id: number;
          job_name: string;
          started_at: string;
          finished_at: string | null;
          status: string;
          rows_written: number | null;
          error_message: string | null;
          github_run_id: string | null;
        };
        Insert: {
          job_name: string;
          started_at: string;
          finished_at?: string | null;
          status: string;
          rows_written?: number | null;
          error_message?: string | null;
          github_run_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["sync_runs"]["Insert"]>;
      };
      calendar_events: {
        Row: {
          id: number;
          event_date: string;
          title: string;
          event_type: string;
          created_at: string;
        };
        Insert: {
          event_date: string;
          title: string;
          event_type?: string;
          created_at?: string;
        };
        Update: {
          event_date?: string;
          title?: string;
          event_type?: string;
          created_at?: string;
        };
      };
    };
  };
};
