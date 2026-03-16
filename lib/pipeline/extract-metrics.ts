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
    .map((sr) => ({
      name: (sr.output?.metric as string) ?? sr.nodeId,
      value: sr.output?.value,
    }));
}
