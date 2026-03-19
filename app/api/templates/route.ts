import { NextResponse } from "next/server";
import { z } from "zod";
import { or, isNull, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineTemplates } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";
import { slugify } from "@/lib/slugify";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const templates = await db
    .select({
      id: pipelineTemplates.id,
      name: pipelineTemplates.name,
      slug: pipelineTemplates.slug,
      description: pipelineTemplates.description,
      organizationId: pipelineTemplates.organizationId,
      createdAt: pipelineTemplates.createdAt,
      updatedAt: pipelineTemplates.updatedAt,
    })
    .from(pipelineTemplates)
    .where(
      or(
        isNull(pipelineTemplates.organizationId),
        eq(pipelineTemplates.organizationId, authResult.organizationId),
      ),
    )
    .orderBy(asc(pipelineTemplates.name));

  return NextResponse.json(templates);
}

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  graphSnapshot: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        positionX: z.number(),
        positionY: z.number(),
      }).passthrough(),
    ),
    edges: z.array(
      z.object({
        sourceNodeId: z.string(),
        targetNodeId: z.string(),
      }).passthrough(),
    ),
  }),
  triggerSchema: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { userId, organizationId } = authResult;

  const parsed = createTemplateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { name, description, graphSnapshot, triggerSchema } = parsed.data;
  const slug = slugify(name);

  try {
    const [template] = await db
      .insert(pipelineTemplates)
      .values({
        name: name.trim(),
        slug,
        description: description ?? null,
        graphSnapshot,
        triggerSchema,
        organizationId,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    const cause =
      err instanceof Error
        ? (err.cause as Record<string, unknown> | undefined)
        : undefined;
    const constraint =
      (err as Record<string, unknown>).constraint_name ??
      (err as Record<string, unknown>).constraint ??
      cause?.constraint_name ??
      cause?.constraint;
    if (
      constraint === "tmpl_slug_org_uidx" ||
      constraint === "tmpl_slug_builtin_uidx"
    ) {
      return NextResponse.json(
        { error: "A template with this slug already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}
