import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { pipelines } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { organizationId } = authResult;

  const result = await db.query.pipelines.findMany({
    where: eq(pipelines.organizationId, organizationId),
    orderBy: desc(pipelines.updatedAt),
  });

  return NextResponse.json(result);
}

const createPipelineSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { userId, organizationId } = authResult;

  const parsed = createPipelineSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const { name, description } = parsed.data;

  const existing = await db.query.pipelines.findFirst({
    where: and(
      eq(pipelines.name, name.trim()),
      eq(pipelines.organizationId, organizationId),
    ),
  });

  if (existing) {
    return NextResponse.json(
      { error: `Pipeline "${name}" already exists in this organization` },
      { status: 409 },
    );
  }

  const [pipeline] = await db
    .insert(pipelines)
    .values({
      name: name.trim(),
      description: description ?? null,
      organizationId,
      createdBy: userId,
    })
    .returning();

  return NextResponse.json(pipeline, { status: 201 });
}
