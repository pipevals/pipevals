import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { datasets, datasetItems } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";
import { parsePagination, paginatedResponse } from "@/lib/api/pagination";
import { validateItemsAgainstSchema } from "@/lib/api/validate-dataset-items";
import { getDatasetsForOrg } from "@/lib/api/datasets";

export async function POST(request: Request) {
  const authResult = await requireAuth({ write: true });
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

  const validation = validateItemsAgainstSchema(items, schemaKeys);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
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

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const pagination = parsePagination(new URL(request.url));
  const { data, totalCount } = await getDatasetsForOrg(authResult.organizationId, pagination);

  return paginatedResponse(data, totalCount);
}
