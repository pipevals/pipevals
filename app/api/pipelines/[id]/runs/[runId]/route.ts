import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelines, pipelineRuns } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string; runId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { organizationId } = authResult;

  const { id, runId } = await params;

  const pipeline = await db.query.pipelines.findFirst({
    where: and(
      eq(pipelines.id, id),
      eq(pipelines.organizationId, organizationId),
    ),
  });

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  const run = await db.query.pipelineRuns.findFirst({
    where: and(
      eq(pipelineRuns.id, runId),
      eq(pipelineRuns.pipelineId, id),
    ),
    with: {
      stepResults: true,
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
