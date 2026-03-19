import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/pipeline-schema";
import { user } from "@/lib/db/auth-schema";
import { requirePipeline } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const rows = await db
    .select({
      id: tasks.id,
      runId: tasks.runId,
      nodeId: tasks.nodeId,
      status: tasks.status,
      reviewerIndex: tasks.reviewerIndex,
      reviewedBy: tasks.reviewedBy,
      createdAt: tasks.createdAt,
      completedAt: tasks.completedAt,
      reviewerName: user.name,
    })
    .from(tasks)
    .leftJoin(user, eq(tasks.reviewedBy, user.id))
    .where(eq(tasks.pipelineId, id))
    .orderBy(desc(tasks.createdAt));

  return NextResponse.json(rows);
}
