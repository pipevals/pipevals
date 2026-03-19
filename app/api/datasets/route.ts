import { NextResponse } from "next/server";
import { desc, eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { datasets, datasetItems } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  const schema = body.schema;
  if (
    !schema ||
    typeof schema !== "object" ||
    Array.isArray(schema) ||
    Object.keys(schema).length === 0
  ) {
    return NextResponse.json(
      { error: "schema must be a non-empty object with key names" },
      { status: 400 },
    );
  }

  const schemaKeys = Object.keys(schema);

  // Validate initial items if provided
  const items: Record<string, unknown>[] = body.items ?? [];
  if (!Array.isArray(items)) {
    return NextResponse.json(
      { error: "items must be an array" },
      { status: 400 },
    );
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return NextResponse.json(
        { error: `items[${i}] must be an object` },
        { status: 400 },
      );
    }
    const itemKeys = Object.keys(item).sort();
    const expected = [...schemaKeys].sort();
    if (
      itemKeys.length !== expected.length ||
      !itemKeys.every((k, j) => k === expected[j])
    ) {
      return NextResponse.json(
        { error: `items[${i}] keys must exactly match schema keys: ${schemaKeys.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const [dataset] = await db
    .insert(datasets)
    .values({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      schema,
      organizationId: authResult.organizationId,
      createdBy: authResult.userId,
    })
    .returning();

  if (items.length > 0) {
    await db.insert(datasetItems).values(
      items.map((data, index) => ({
        datasetId: dataset.id,
        data,
        index,
      })),
    );
  }

  return NextResponse.json(
    { ...dataset, itemCount: items.length },
    { status: 201 },
  );
}

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rows = await db
    .select({
      id: datasets.id,
      name: datasets.name,
      description: datasets.description,
      schema: datasets.schema,
      organizationId: datasets.organizationId,
      createdBy: datasets.createdBy,
      createdAt: datasets.createdAt,
      updatedAt: datasets.updatedAt,
      itemCount: count(datasetItems.id),
    })
    .from(datasets)
    .leftJoin(datasetItems, eq(datasetItems.datasetId, datasets.id))
    .where(eq(datasets.organizationId, authResult.organizationId))
    .groupBy(datasets.id)
    .orderBy(desc(datasets.createdAt));

  return NextResponse.json(rows);
}
