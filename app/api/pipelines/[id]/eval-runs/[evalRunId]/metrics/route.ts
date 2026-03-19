import { NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { evalRuns, pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import type { MetricRunEntry } from "@/lib/pipeline/types/metrics";

type RouteParams = { params: Promise<{ id: string; evalRunId: string }> };

interface SnapshotNode {
  id: string;
  type: string;
  label: string | null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id, evalRunId } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const evalRun = await db.query.evalRuns.findFirst({
    where: and(eq(evalRuns.id, evalRunId), eq(evalRuns.pipelineId, id)),
  });

  if (!evalRun) {
    return NextResponse.json(
      { error: "Eval run not found" },
      { status: 404 },
    );
  }

  const runs = await db.query.pipelineRuns.findMany({
    where: eq(pipelineRuns.evalRunId, evalRunId),
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

  // Compute aggregate: mean of each numeric metric across completed runs
  const aggregate: Record<string, number> = {};
  const metricSums: Record<string, { sum: number; count: number }> = {};

  for (const entry of entries) {
    if (entry.status !== "completed") continue;
    for (const [key, value] of Object.entries(entry.metrics)) {
      if (typeof value === "number") {
        if (!metricSums[key]) metricSums[key] = { sum: 0, count: 0 };
        metricSums[key].sum += value;
        metricSums[key].count++;
      }
    }
  }

  for (const [key, { sum, count }] of Object.entries(metricSums)) {
    aggregate[key] = sum / count;
  }

  return NextResponse.json({ runs: entries, aggregate });
}
