import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns, stepResults } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

interface SnapshotNode {
  id: string;
  type: string;
  label: string | null;
}

interface MetricRunEntry {
  id: string;
  status: string;
  createdAt: string;
  durationMs: number | null;
  metrics: Record<string, unknown>;
  steps: { label: string; durationMs: number | null }[];
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const runs = await db.query.pipelineRuns.findMany({
    where: eq(pipelineRuns.pipelineId, id),
    orderBy: asc(pipelineRuns.createdAt),
    with: { stepResults: true },
  });

  const entries: MetricRunEntry[] = runs.map((run) => {
    const snapshotNodes = (
      run.graphSnapshot as { nodes: SnapshotNode[] }
    ).nodes;

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

  return NextResponse.json({ runs: entries });
}
