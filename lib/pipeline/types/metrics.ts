export interface MetricRunEntry {
  id: string;
  status: string;
  createdAt: string;
  durationMs: number | null;
  metrics: Record<string, unknown>;
  steps: { label: string; durationMs: number | null }[];
  evalRunId: string | null;
}

export interface MetricsResponse {
  runs: MetricRunEntry[];
}
