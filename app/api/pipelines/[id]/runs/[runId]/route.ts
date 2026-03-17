import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string; runId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id, runId } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const run = await db.query.pipelineRuns.findFirst({
    where: and(
      eq(pipelineRuns.id, runId),
      eq(pipelineRuns.pipelineId, id),
    ),
    with: {
      stepResults: true,
      pipeline: { columns: { triggerSchema: true } },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const { pipeline, ...runData } = run;

  return NextResponse.json({
    ...runData,
    triggerSchema: pipeline?.triggerSchema ?? [],
  });
}
