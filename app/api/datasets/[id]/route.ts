import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { datasets, datasetItems } from "@/lib/db/pipeline-schema";
import { requireDataset } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requireDataset(id);
  if ("error" in result) return result.error;

  const items = await db
    .select()
    .from(datasetItems)
    .where(eq(datasetItems.datasetId, id))
    .orderBy(asc(datasetItems.index));

  return NextResponse.json({ ...result.dataset, items });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requireDataset(id);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Partial<{ name: string; description: string | null }> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.description !== undefined) {
    updates.description = body.description?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(result.dataset);
  }

  const [updated] = await db
    .update(datasets)
    .set(updates)
    .where(eq(datasets.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requireDataset(id);
  if ("error" in result) return result.error;

  await db.delete(datasets).where(eq(datasets.id, id));

  return new NextResponse(null, { status: 204 });
}
