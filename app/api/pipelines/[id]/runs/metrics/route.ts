import { NextResponse } from "next/server";
import { asc, eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { extractRunMetrics } from "@/lib/pipeline/extract-run-metrics";

const TERMINAL_STATUSES = ["completed", "failed", "cancelled"] as const;

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const evalRunId = url.searchParams.get("evalRunId");
  const scope = url.searchParams.get("scope"); // "adhoc" | "all" — default "adhoc"

  // Only include terminal runs — pending/running runs have no meaningful metrics
  const terminalFilter = inArray(pipelineRuns.status, [...TERMINAL_STATUSES]);

  let where;
  if (evalRunId) {
    where = and(eq(pipelineRuns.pipelineId, id), eq(pipelineRuns.evalRunId, evalRunId), terminalFilter);
  } else if (scope === "all") {
    where = and(eq(pipelineRuns.pipelineId, id), terminalFilter);
  } else {
    // Default: ad-hoc runs only (consistent with GET /runs)
    where = and(eq(pipelineRuns.pipelineId, id), isNull(pipelineRuns.evalRunId), terminalFilter);
  }

  const { limit, offset } = parsePagination(url);

  const runs = await db.query.pipelineRuns.findMany({
    where,
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
    limit,
    offset,
  });

  const entries = extractRunMetrics(runs);

  return NextResponse.json({ runs: entries });
}
