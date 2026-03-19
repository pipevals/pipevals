import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, pipelines } from "@/lib/db/pipeline-schema";
import { user } from "@/lib/db/auth-schema";
import { requireAuth } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const [row] = await db
    .select({
      id: tasks.id,
      pipelineId: tasks.pipelineId,
      runId: tasks.runId,
      nodeId: tasks.nodeId,
      hookToken: tasks.hookToken,
      status: tasks.status,
      rubric: tasks.rubric,
      displayData: tasks.displayData,
      response: tasks.response,
      reviewerIndex: tasks.reviewerIndex,
      reviewedBy: tasks.reviewedBy,
      createdAt: tasks.createdAt,
      completedAt: tasks.completedAt,
      reviewerName: user.name,
    })
    .from(tasks)
    .innerJoin(pipelines, eq(tasks.pipelineId, pipelines.id))
    .leftJoin(user, eq(tasks.reviewedBy, user.id))
    .where(
      and(
        eq(tasks.id, id),
        eq(pipelines.organizationId, authResult.organizationId),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Strip hookToken from the response — it's internal
  const { hookToken: _, ...task } = row;
  return NextResponse.json(task);
}
