import { NextResponse } from "next/server";
import { asc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import type { MetricRunEntry } from "@/lib/pipeline/types/metrics";

type RouteParams = { params: Promise<{ id: string }> };

interface SnapshotNode {
  id: string;
  type: string;
  label: string | null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const evalRunId = url.searchParams.get("evalRunId");

  const where = evalRunId
    ? and(eq(pipelineRuns.pipelineId, id), eq(pipelineRuns.evalRunId, evalRunId))
    : eq(pipelineRuns.pipelineId, id);

  // TODO: Add limit (default 200) + optional ?limit=N query param.
  // Loading all runs with step results will be slow for large pipelines.
  const runs = await db.query.pipelineRuns.findMany({
    where,
    orderBy: asc(pipelineRuns.createdAt),
    with: { stepResults: true },
  });

  const entries: MetricRunEntry[] = runs.map((run) => {
    const snapshot = run.graphSnapshot as { nodes?: unknown } | null;
    const snapshotNodes: SnapshotNode[] = Array.isArray(snapshot?.nodes)
      ? (snapshot.nodes as SnapshotNode[])
      : [];

    const metricNodeIds = new Set(
      snapshotNodes
        .filter((n) => n.type === "metric_capture")
        .map((n) => n.id),
    );

    // Metrics from multiple metric_capture nodes are merged; last-wins on key collisions.
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
    };
  });

  return NextResponse.json({ runs: entries });
}
