export type Priority = "critical" | "high" | "medium" | "low" | "done";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  domain: string;
  status?: string;
  created_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface FeatureList {
  schema_version: number;
  updated_at: string;
  tasks: Task[];
}

export const PRIORITY_ORDER: Priority[] = [
  "critical",
  "high",
  "medium",
  "low",
  "done",
];
