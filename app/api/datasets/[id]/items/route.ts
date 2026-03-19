import { NextResponse } from "next/server";
import { eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { datasetItems } from "@/lib/db/pipeline-schema";
import { requireDataset } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requireDataset(id);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json(
      { error: "Request body must be a non-empty array of items" },
      { status: 400 },
    );
  }

  const schemaKeys = Object.keys(result.dataset.schema).sort();

  for (let i = 0; i < body.length; i++) {
    const item = body[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return NextResponse.json(
        { error: `items[${i}] must be an object` },
        { status: 400 },
      );
    }
    const itemKeys = Object.keys(item).sort();
    if (
      itemKeys.length !== schemaKeys.length ||
      !itemKeys.every((k, j) => k === schemaKeys[j])
    ) {
      return NextResponse.json(
        { error: `items[${i}] keys must exactly match schema keys: ${schemaKeys.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // Get current max index
  const [{ maxIndex }] = await db
    .select({ maxIndex: max(datasetItems.index) })
    .from(datasetItems)
    .where(eq(datasetItems.datasetId, id));

  const startIndex = (maxIndex ?? -1) + 1;

  const inserted = await db
    .insert(datasetItems)
    .values(
      body.map((data: Record<string, unknown>, i: number) => ({
        datasetId: id,
        data,
        index: startIndex + i,
      })),
    )
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
