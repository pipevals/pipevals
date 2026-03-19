import { NextResponse } from "next/server";
import { asc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { extractRunMetrics } from "@/lib/pipeline/extract-run-metrics";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const evalRunId = url.searchParams.get("evalRunId");

  const where = evalRunId
    ? and(eq(pipelineRuns.pipelineId, id), eq(pipelineRuns.evalRunId, evalRunId))
    : eq(pipelineRuns.pipelineId, id);

  const { limit, offset } = parsePagination(url);

  const runs = await db.query.pipelineRuns.findMany({
    where,
    orderBy: asc(pipelineRuns.createdAt),
    with: { stepResults: true },
    limit,
    offset,
  });

  const entries = extractRunMetrics(runs);

  return NextResponse.json({ runs: entries });
}
