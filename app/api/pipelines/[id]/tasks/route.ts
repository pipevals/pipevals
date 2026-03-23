import { NextResponse } from "next/server";
import { desc, eq, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/pipeline-schema";
import { user } from "@/lib/db/auth-schema";
import { requirePipeline } from "@/lib/api/auth";
import { parsePagination, paginatedResponse } from "@/lib/api/pagination";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  const { limit, offset } = parsePagination(url);

  const conditions = [eq(tasks.pipelineId, id)];
  if (statusFilter === "pending" || statusFilter === "completed") {
    conditions.push(eq(tasks.status, statusFilter));
  }

  const where = and(...conditions);

  const [rows, [{ totalCount }]] = await Promise.all([
    db
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
      .where(where)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ totalCount: count() })
      .from(tasks)
      .where(where),
  ]);

  return paginatedResponse(rows, totalCount);
}
