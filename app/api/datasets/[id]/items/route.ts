import { NextResponse } from "next/server";
import { eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { datasetItems } from "@/lib/db/pipeline-schema";
import { requireDataset } from "@/lib/api/auth";
import { validateItemsAgainstSchema } from "@/lib/api/validate-dataset-items";

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

  const schemaKeys = Object.keys(result.dataset.schema);
  const validation = validateItemsAgainstSchema(body, schemaKeys);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Wrap in transaction to prevent concurrent requests from reading the same maxIndex
  const inserted = await db.transaction(async (tx) => {
    const [{ maxIndex }] = await tx
      .select({ maxIndex: max(datasetItems.index) })
      .from(datasetItems)
      .where(eq(datasetItems.datasetId, id));

    const startIndex = (maxIndex ?? -1) + 1;

    return tx
      .insert(datasetItems)
      .values(
        body.map((data: Record<string, unknown>, i: number) => ({
          datasetId: id,
          data,
          index: startIndex + i,
        })),
      )
      .returning();
  });

  return NextResponse.json(inserted, { status: 201 });
}
