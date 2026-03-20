import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, pipelines } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";
import { validateRubricResponse } from "@/lib/pipeline/rubric-validation";
import type { RubricField } from "@/lib/pipeline/types";
import { resumeHook } from "workflow/api";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireAuth({ write: true });
  if ("error" in authResult) return authResult.error;

  // Look up the task with org verification
  const [task] = await db
    .select()
    .from(tasks)
    .innerJoin(pipelines, eq(tasks.pipelineId, pipelines.id))
    .where(
      and(
        eq(tasks.id, id),
        eq(pipelines.organizationId, authResult.organizationId),
      ),
    )
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 },
    );
  }

  // Validate the submission against the rubric
  const rubric = task.task.rubric as unknown as RubricField[];
  const errors = validateRubricResponse(rubric, body as Record<string, unknown>);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  // Atomic conditional update — only succeeds if task is still pending.
  // Eliminates the TOCTOU race between two concurrent submissions.
  const now = new Date();
  const [updated] = await db
    .update(tasks)
    .set({
      status: "completed",
      response: body as Record<string, unknown>,
      reviewedBy: authResult.userId,
      completedAt: now,
    })
    .where(and(eq(tasks.id, id), eq(tasks.status, "pending")))
    .returning({ id: tasks.id });

  if (!updated) {
    return NextResponse.json(
      { error: "Task already completed" },
      { status: 409 },
    );
  }

  // Resume the workflow hook with the reviewer's data
  await resumeHook(task.task.hookToken, {
    reviewerId: authResult.userId,
    reviewerIndex: task.task.reviewerIndex,
    scores: body as Record<string, unknown>,
  });

  return NextResponse.json({
    id: task.task.id,
    status: "completed",
    reviewedBy: authResult.userId,
    completedAt: now,
  });
}
