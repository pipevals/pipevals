import { NextResponse } from "next/server";
import { eq, and, asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { evalRuns, pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { extractRunMetrics } from "@/lib/pipeline/extract-run-metrics";
import { aggregateMetrics } from "@/lib/pipeline/types/metrics";

type RouteParams = { params: Promise<{ id: string; evalRunId: string }> };

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
    where: and(
      eq(pipelineRuns.evalRunId, evalRunId),
      inArray(pipelineRuns.status, ["completed", "failed", "cancelled"]),
    ),
    columns: {
      id: true,
      status: true,
      graphSnapshot: true,
      evalRunId: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: asc(pipelineRuns.createdAt),
    with: {
      stepResults: {
        columns: { nodeId: true, status: true, output: true, durationMs: true },
      },
    },
  });

  const entries = extractRunMetrics(runs);
  const aggregate = aggregateMetrics(entries);

  return NextResponse.json({ runs: entries, aggregate });
}
