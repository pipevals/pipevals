import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { datasetItems } from "@/lib/db/pipeline-schema";
import { requireDataset } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string; itemId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id, itemId } = await params;
  const result = await requireDataset(id, { write: true });
  if ("error" in result) return result.error;

  const deleted = await db
    .delete(datasetItems)
    .where(and(eq(datasetItems.id, itemId), eq(datasetItems.datasetId, id)))
    .returning({ id: datasetItems.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
