import { NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { evalRuns, pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { extractRunMetrics } from "@/lib/pipeline/extract-run-metrics";

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
    where: eq(pipelineRuns.evalRunId, evalRunId),
    orderBy: asc(pipelineRuns.createdAt),
    with: { stepResults: true },
  });

  const entries = extractRunMetrics(runs);

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
