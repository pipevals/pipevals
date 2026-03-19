import type { MetricRunEntry } from "@/lib/pipeline/types/metrics";

interface SnapshotNode {
  id: string;
  type: string;
  label: string | null;
}

interface RunWithStepResults {
  id: string;
  status: string;
  graphSnapshot: unknown;
  evalRunId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  stepResults: {
    nodeId: string;
    status: string;
    output: Record<string, unknown> | null;
    durationMs: number | null;
  }[];
}

export function extractRunMetrics(runs: RunWithStepResults[]): MetricRunEntry[] {
  return runs.map((run) => {
    const snapshot = run.graphSnapshot as { nodes?: unknown } | null;
    const snapshotNodes: SnapshotNode[] = Array.isArray(snapshot?.nodes)
      ? (snapshot.nodes as SnapshotNode[])
      : [];

    const metricNodeIds = new Set(
      snapshotNodes
        .filter((n) => n.type === "metric_capture")
        .map((n) => n.id),
    );

    const metrics: Record<string, unknown> = {};
    for (const sr of run.stepResults) {
      if (metricNodeIds.has(sr.nodeId) && sr.status === "completed") {
        const captured = (sr.output?.metrics ?? {}) as Record<string, unknown>;
        Object.assign(metrics, captured);
      }
    }

    const nodeLabelMap = new Map(
      snapshotNodes.map((n) => [n.id, n.label ?? n.type]),
    );

    const steps = run.stepResults
      .filter((sr) => sr.status === "completed")
      .map((sr) => ({
        label: nodeLabelMap.get(sr.nodeId) ?? sr.nodeId,
        durationMs: sr.durationMs,
      }));

    let durationMs: number | null = null;
    if (run.startedAt && run.completedAt) {
      durationMs =
        new Date(run.completedAt).getTime() -
        new Date(run.startedAt).getTime();
    }

    return {
      id: run.id,
      status: run.status,
      createdAt: run.createdAt.toISOString(),
      durationMs,
      metrics,
      steps,
      evalRunId: run.evalRunId,
    };
  });
}
