import type { StepResultStatus } from "@/lib/stores/run-viewer";

export interface CapturedMetric {
  name: string;
  value: unknown;
}

export function extractMetrics(run: {
  graphSnapshot: { nodes: { id: string; type: string }[] };
  stepResults: {
    nodeId: string;
    status: StepResultStatus;
    output: Record<string, unknown> | null;
  }[];
}): CapturedMetric[] {
  const metricNodeIds = new Set(
    run.graphSnapshot.nodes
      .filter((n) => n.type === "metric_capture")
      .map((n) => n.id),
  );

  return run.stepResults
    .filter((sr) => metricNodeIds.has(sr.nodeId) && sr.status === "completed")
    .flatMap((sr) =>
      Object.entries(
        (sr.output?.metrics as Record<string, unknown>) ?? {},
      ).map(([name, value]) => ({ name, value })),
    );
}
