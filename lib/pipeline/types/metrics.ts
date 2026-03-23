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

/**
 * Compute the mean of each numeric metric across a set of metric entries.
 * Only entries with status "completed" are included.
 */
export function aggregateMetrics(
  entries: Pick<MetricRunEntry, "status" | "metrics">[],
): Record<string, number> {
  const sums: Record<string, { sum: number; count: number }> = {};

  for (const entry of entries) {
    if (entry.status !== "completed") continue;
    for (const [key, value] of Object.entries(entry.metrics)) {
      if (typeof value === "number") {
        if (!sums[key]) sums[key] = { sum: 0, count: 0 };
        sums[key].sum += value;
        sums[key].count++;
      }
    }
  }

  const result: Record<string, number> = {};
  for (const [key, { sum, count }] of Object.entries(sums)) {
    result[key] = sum / count;
  }
  return result;
}
