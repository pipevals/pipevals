import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  pipelines,
  pipelineNodes,
  pipelineEdges,
  datasets,
} from "@/lib/db/pipeline-schema";
import { headers } from "next/headers";

type AuthError = { error: NextResponse };
type AuthSuccess = {
  session: Awaited<ReturnType<typeof auth.api.getSession>> & {};
  userId: string;
  organizationId: string;
};

/**
 * Gets the authenticated session with an active organization.
 * Returns the session or a 401/403 Response.
 */
export async function requireAuth(): Promise<AuthError | AuthSuccess> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return {
      error: NextResponse.json(
        { error: "No active organization. Set one first." },
        { status: 403 },
      ),
    };
  }

  return {
    session,
    userId: session.user.id,
    organizationId,
  };
}

type PipelineRow = typeof pipelines.$inferSelect;
type NodeRow = typeof pipelineNodes.$inferSelect;
type EdgeRow = typeof pipelineEdges.$inferSelect;

type PipelineFor<W extends boolean> = W extends true
  ? PipelineRow & { nodes: NodeRow[]; edges: EdgeRow[] }
  : PipelineRow;

/**
 * Auth + pipeline ownership check. Returns 401/403/404 or the pipeline
 * scoped to the user's active organization.
 * Pass `true` as second arg to include nodes and edges.
 */
export async function requirePipeline<W extends boolean = false>(
  pipelineId: string,
  withGraph?: W,
): Promise<AuthError | (AuthSuccess & { pipeline: PipelineFor<W> })> {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult;

  const where = and(
    eq(pipelines.id, pipelineId),
    eq(pipelines.organizationId, authResult.organizationId),
  );

  const pipeline = withGraph
    ? await db.query.pipelines.findFirst({ where, with: { nodes: true, edges: true } })
    : await db.query.pipelines.findFirst({ where });

  if (!pipeline) {
    return {
      error: NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      ),
    };
  }

  return { ...authResult, pipeline } as AuthSuccess & { pipeline: PipelineFor<W> };
}

type DatasetRow = typeof datasets.$inferSelect;

/**
 * Auth + dataset ownership check. Returns 401/403/404 or the dataset
 * scoped to the user's active organization.
 */
export async function requireDataset(
  datasetId: string,
): Promise<AuthError | (AuthSuccess & { dataset: DatasetRow })> {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult;

  const where = and(
    eq(datasets.id, datasetId),
    eq(datasets.organizationId, authResult.organizationId),
  );

  const dataset = await db.query.datasets.findFirst({ where });

  if (!dataset) {
    return {
      error: NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 },
      ),
    };
  }

  return { ...authResult, dataset };
}
