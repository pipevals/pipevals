import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineTemplates } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ write: true });
  if ("error" in authResult) return authResult.error;

  const { id } = await params;

  const template = await db.query.pipelineTemplates.findFirst({
    where: eq(pipelineTemplates.id, id),
  });

  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 },
    );
  }

  if (template.organizationId === null) {
    return NextResponse.json(
      { error: "Built-in templates cannot be deleted" },
      { status: 403 },
    );
  }

  if (template.organizationId !== authResult.organizationId) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 },
    );
  }

  await db
    .delete(pipelineTemplates)
    .where(eq(pipelineTemplates.id, id));

  return new Response(null, { status: 204 });
}
