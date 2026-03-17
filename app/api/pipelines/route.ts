import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { pipelines } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";
import { getPipelinesForOrg } from "@/lib/api/pipelines";
import { eq, and } from "drizzle-orm";
import { slugify } from "@/lib/slugify";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const result = await getPipelinesForOrg(authResult.organizationId);
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
  const baseSlug = slugify(name);

  try {
    const [pipeline] = await db
      .insert(pipelines)
      .values({
        name: name.trim(),
        slug: baseSlug,
        description: description ?? null,
        organizationId,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json(pipeline, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("pipeline_slug_org_uidx")) {
      return NextResponse.json(
        { error: `A pipeline with this slug already exists in this organization` },
        { status: 409 },
      );
    }
    throw err;
  }
}
