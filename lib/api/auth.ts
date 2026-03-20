import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema";
import {
  pipelines,
  pipelineNodes,
  pipelineEdges,
  datasets,
} from "@/lib/db/pipeline-schema";
import { headers } from "next/headers";
import { isAutoInviteEnabled } from "@/lib/auto-invite";

type AuthError = { error: NextResponse };
type AuthSuccess = {
  session: Awaited<ReturnType<typeof auth.api.getSession>> & {};
  userId: string;
  organizationId: string;
  role: string;
  orgName: string;
};

type AuthOptions = { write?: boolean };

/**
 * Gets the authenticated session with an active organization.
 * Returns the session or a 401/403 Response.
 * Pass `{ write: true }` to block guest users from mutation endpoints.
 */
export async function requireAuth(
  options?: AuthOptions,
): Promise<AuthError | AuthSuccess> {
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

  const membership = await db.query.member.findFirst({
    where: and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
    with: { organization: { columns: { name: true } } },
  });

  if (!membership) {
    return {
      error: NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 },
      ),
    };
  }

  if (options?.write && membership.role === "guest") {
    return {
      error: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      ),
    };
  }

  return {
    session,
    userId: session.user.id,
    organizationId,
    role: membership.role,
    orgName: membership.organization.name,
  };
}

/**
 * Page-level auth: returns session + organizationId or redirects to sign-in.
 * Handles auto-invite for demo orgs.
 */
export async function requireSessionWithOrg() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) redirect("/sign-in");

  let organizationId = session.session.activeOrganizationId;
  let role: string | undefined;
  let orgName: string | undefined;

  if (!organizationId && isAutoInviteEnabled()) {
    const membership = await db.query.member.findFirst({
      where: eq(member.userId, session.user.id),
      with: { organization: { columns: { name: true } } },
    });
    if (!membership) redirect("/sign-in");

    organizationId = membership.organizationId;
    role = membership.role;
    orgName = membership.organization.name;
    await auth.api.setActiveOrganization({
      headers: reqHeaders,
      body: { organizationId },
    });
  }

  if (!organizationId) redirect("/sign-in");

  if (!role) {
    const membership = await db.query.member.findFirst({
      where: and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
      with: { organization: { columns: { name: true } } },
    });
    if (!membership) redirect("/sign-in");
    role = membership.role;
    orgName = membership.organization.name;
  }

  return { session, user: session.user, organizationId, role, orgName: orgName! };
}

type PipelineRow = typeof pipelines.$inferSelect;
type NodeRow = typeof pipelineNodes.$inferSelect;
type EdgeRow = typeof pipelineEdges.$inferSelect;

type PipelineWithGraph = PipelineRow & { nodes: NodeRow[]; edges: EdgeRow[] };
type PipelineOptions = { withGraph?: boolean; write?: boolean };

/**
 * Auth + pipeline ownership check. Returns 401/403/404 or the pipeline
 * scoped to the user's active organization.
 * Pass `{ withGraph: true }` to include nodes and edges.
 * Pass `{ write: true }` to block guest users.
 * Also accepts `true` as shorthand for `{ withGraph: true }` (backward compat).
 */
export async function requirePipeline(
  pipelineId: string,
  options: true | { withGraph: true; write?: boolean },
): Promise<AuthError | (AuthSuccess & { pipeline: PipelineWithGraph })>;
export async function requirePipeline(
  pipelineId: string,
  options?: false | { withGraph?: false; write?: boolean },
): Promise<AuthError | (AuthSuccess & { pipeline: PipelineRow })>;
export async function requirePipeline(
  pipelineId: string,
  options?: boolean | PipelineOptions,
): Promise<AuthError | (AuthSuccess & { pipeline: PipelineRow | PipelineWithGraph })> {
  const opts: PipelineOptions =
    typeof options === "boolean" ? { withGraph: options } : options ?? {};

  const authResult = await requireAuth(opts.write ? { write: true } : undefined);
  if ("error" in authResult) return authResult;

  const where = and(
    eq(pipelines.id, pipelineId),
    eq(pipelines.organizationId, authResult.organizationId),
  );

  const pipeline = opts.withGraph
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

  return { ...authResult, pipeline };
}

type DatasetRow = typeof datasets.$inferSelect;

/**
 * Auth + dataset ownership check. Returns 401/403/404 or the dataset
 * scoped to the user's active organization.
 * Pass `{ write: true }` to block guest users.
 */
export async function requireDataset(
  datasetId: string,
  options?: AuthOptions,
): Promise<AuthError | (AuthSuccess & { dataset: DatasetRow })> {
  const authResult = await requireAuth(options?.write ? { write: true } : undefined);
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
